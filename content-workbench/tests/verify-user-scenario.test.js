const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const state = require('../js/state.js');
const validate = require('../js/validate.js');
const quizPath = path.join(__dirname, '..', 'js', 'quiz-ui.js');
const syncPath = path.join(__dirname, '..', 'js', 'sync.js');

// 最小 DOM：记录所有按钮及其 onclick，便于模拟点击
function setupDom() {
  const buttons = [];
  const allEls = [];
  function FakeEl(tag) {
    const e = {
      tag, children: [], style: {}, value: '', textContent: '', className: '', id: '', disabled: false,
      classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);} },
      appendChild(c){ e.children.push(c); return c; },
      querySelectorAll: () => [], querySelector: () => null, addEventListener(){}
    };
    allEls.push(e);
    if (tag === 'button') buttons.push(e);
    return e;
  }
  global.document = {
    createElement: FakeEl,
    createTextNode: t => ({ textContent: t }),
    getElementById: id => (id === 'wb-workspace' ? FakeEl('div') : null),
    querySelector: () => FakeEl('div')
  };
  global.window = {};
  global.WBRefreshStat = () => {};
  global.WBRefreshPanel = () => {};
  return { buttons, allEls };
}

// 通过真实的顶部分段开关切到「考试题」子区
function switchToExam(allEls) {
  const seg = allEls.find(e => typeof e.className === 'string' && e.className.indexOf('wb-seg-item') >= 0 && e.textContent === '考试题');
  assert.ok(seg, '应存在「考试题」分段开关');
  seg.onclick();
}

const mkQ = n => ({ type: 'choice', question: '题' + n, options: { A:'a', B:'b', C:'c', D:'d' }, answer: 'A', explanation: '' });

// 真实场景：学科空着（还在树里、没有章节/知识点），但之前导入的考试题还在。
// 用户想删掉这些考试题。
test('场景A：学科空着但还在树里 → 考试题可见、逐题删除、拉取前不复活', async () => {
  const { buttons, allEls } = setupDom();
  const store = new Map();
  global.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  const d0 = state.blankDraft();
  d0.tree = { cpp: { name: 'C++', chapters: [] } };   // 学科空着，但仍在树里
  d0.examQuestions = [
    { courseId: 'cpp', examType: 'GESP', level: '三级', questions: [mkQ(1), mkQ(2), mkQ(3)] }
  ];
  state.save(d0);
  // 一套会记录 pull 行为的 cloud mock
  const pulled = [];
  global.prompt = () => 'pw';
  global.confirm = () => true;
  global.alert = () => {};
  global.WB = {
    state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone },
    validate,
    treeUI: { getSelected: () => null, getCurrentCourse: () => 'cpp', render: () => {} },
    cloud: {
      pullTree: async () => ({ success: true, courses: [],
        exams: [{ courseId: 'cpp', examType: 'GESP', level: '三级', questions: [mkQ(99)] }] }),  // 云端仍有旧题
      pushStructure: async () => ({ success: true, idMap: { chapters: {}, lessons: {} }, results: [] }),
      pushQuestions: async p => { pulled.push(p); return { success: true, results: [] }; }
    }
  };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);                      // 切到「考试题」子区

  // 1) 考试题必须可见、可点删除（历史上被 currentCourseId 过滤掉 → 看不见也删不了）
  const delBtns = buttons.filter(b => b.textContent === '删除');
  assert.equal(delBtns.length, 3, '3 道考试题都应渲染出删除按钮');

  // 2) 逐题删除（用户说"删不了"——这里要真的能删）
  delBtns.forEach(b => b.onclick());
  let d = state.load();
  assert.equal(d.examQuestions.length, 0, '本地考试组应被清空');
  assert.equal(d._examGroupsCleared.length, 1, '删光应入队"清空意图"');
  assert.deepEqual(d._examGroupsCleared[0], { courseId: 'cpp', examType: 'GESP', level: '三级' });

  // 3) 关键：本地删光了、但还没同步、直接点"从云端拉取"——旧题绝不能复活（clearPending 生效）
  delete require.cache[require.resolve(syncPath)];
  await require(syncPath).pull();
  const after = state.load();
  const g = after.examQuestions.find(x => x.courseId === 'cpp' && x.examType === 'GESP' && x.level === '三级');
  assert.ok(!g || g.questions.length === 0, '已清空的考试组在「拉取前未同步」时不应复活');

  // 4) 之后同步题目：必须能生成 payload，不再报"没有可同步的题目"
  await require(syncPath).syncQuestions();
  assert.equal(pulled.length, 1, '应生成 1 个 payload');
  assert.equal(pulled[0].examUpserts.length, 1);
  assert.equal(pulled[0].examUpserts[0].questions.length, 0, '应带 questions:[] 让云端清空');
});

// 真实场景续：学科空着、考试题删光后，紧跟"同步结构与内容"也不该报"没有可同步的课程结构"
test('场景C：学科空着且结构删除队列有残留 → 同步结构能发纯删除 payload', async () => {
  let draft = state.blankDraft();
  draft.tree = { cpp: { name: 'C++', chapters: [] } };
  draft._deletedChapters = [{ cloudId: 'ch1', courseId: 'cpp' }];
  const captured = [];
  global.confirm = () => true;
  global.alert = () => {};
  global.prompt = () => 'pw';
  global.window = {};
  global.WBRefreshStat = () => {};
  global.WBRefreshPanel = () => {};
  global.document = { getElementById: () => null };
  global.WB = {
    state: { load: () => draft, save: d => { draft = d; } },
    cloud: {
      pullTree: async () => ({ success: true, courses: [], exams: [] }),
      pushStructure: async p => { captured.push(p); return { success: true, idMap: { chapters: {}, lessons: {} }, results: [] }; },
      pushQuestions: async () => ({ success: true, results: [] })
    },
    validate,
    treeUI: { render: () => {} }
  };
  delete require.cache[require.resolve(syncPath)];
  await require(syncPath).syncStructure();
  assert.equal(captured.length, 1, '应生成纯删除 payload');
  assert.equal(captured[0].courseId, 'cpp');
  assert.deepEqual(captured[0].deleteChapterIds, ['ch1']);
});

// 学科完全删除后，"同步结构与内容"也不该再报"没有可同步的课程结构"
test('场景B：学科删光 + 删除队列有残留 → 同步结构能发纯删除 payload', async () => {
  let draft = state.blankDraft();
  draft.tree = {};
  draft._deletedChapters = [{ cloudId: 'ch1', courseId: 'cpp' }];
  draft._deletedLessons = [{ cloudId: 'ls1', courseId: 'cpp' }];
  const captured = [];
  global.confirm = () => true;
  global.alert = () => {};
  global.prompt = () => 'pw';
  global.window = {};
  global.WBRefreshStat = () => {};
  global.WBRefreshPanel = () => {};
  global.document = { getElementById: () => null };
  global.WB = {
    state: { load: () => draft, save: d => { draft = d; } },
    cloud: {
      pullTree: async () => ({ success: true, courses: [], exams: [] }),
      pushStructure: async p => { captured.push(p); return { success: true, idMap: { chapters: {}, lessons: {} }, results: [] }; },
      pushQuestions: async () => ({ success: true, results: [] })
    },
    validate,
    treeUI: { render: () => {} }
  };
  delete require.cache[require.resolve(syncPath)];
  await require(syncPath).syncStructure();
  assert.equal(captured.length, 1, '应生成纯删除 payload');
  assert.equal(captured[0].courseId, 'cpp');
  assert.deepEqual(captured[0].deleteChapterIds, ['ch1']);
});
