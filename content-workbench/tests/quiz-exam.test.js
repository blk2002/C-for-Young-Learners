const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const state = require('../js/state.js');
const validate = require('../js/validate.js');
const quizPath = path.join(__dirname, '..', 'js', 'quiz-ui.js');
const syncPath = path.join(__dirname, '..', 'js', 'sync.js');

// 考试题是独立实体：不依附学科、不依附知识点。
// 学科被删光、或当前学科变了，考试题仍要在「考试题」子区可见、可删、可同步。
// 这里用最小 DOM mock 走真实渲染路径，防止"考试题被学科过滤掉"这类回归。
function setupDom() {
  const buttons = [];
  const allEls = [];
  function FakeEl(tag) {
    const e = {
      tag, children: [], style: {}, value: '', textContent: '', className: '', id: '', disabled: false,
      classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
      appendChild(c) { e.children.push(c); return c; },
      querySelectorAll: () => [], querySelector: () => null, addEventListener() {}
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

// 通过真实的顶部分段开关切到「考试题」子区（用户实际路径）
function switchToExam(allEls) {
  const seg = allEls.find(e => typeof e.className === 'string' && e.className.indexOf('wb-seg-item') >= 0 && e.textContent === '考试题');
  assert.ok(seg, '应存在「考试题」分段开关');
  seg.onclick();
}

function setupStorage(draft) {
  const store = new Map();
  global.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  state.save(draft);
}

const mkQ = n => ({ type: 'choice', question: '题' + n, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', explanation: '' });

test('学科为空时考试题仍可见、可批量清空、可同步', async () => {
  const { buttons, allEls } = setupDom();
  const d0 = state.blankDraft();
  d0.tree = {};                              // 学科全删光
  d0.examQuestions = [
    { courseId: 'cpp', examType: 'GESP', level: '三级', questions: [mkQ(1), mkQ(2)] },
    { courseId: 'python', examType: 'CIE', level: '一级', questions: [mkQ(3)] },
    { examType: 'CSP-J', level: '入门级', questions: [mkQ(4)] }   // courseId 缺失的孤儿
  ];
  setupStorage(d0);
  global.WB = {
    state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone, getExamConfig: state.getExamConfig },
    validate,
    treeUI: { getSelected: () => null, getCurrentCourse: () => undefined, render: () => {} }
  };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);                      // 切到「考试题」子区

  // 4 道题都要渲染出来 —— 历史上这里会被 currentCourseId() 过滤掉
  const delBtns = buttons.filter(b => b.textContent === '删除');
  assert.equal(delBtns.length, 4, '4 道考试题都应渲染出删除按钮');

  // 每个分类都有「清空」入口（批量清空）
  const clearBtns = buttons.filter(b => b.textContent === '清空' && !b.disabled);
  assert.equal(clearBtns.length, 3, '三个分类各有独立的清空入口');
  global.confirm = () => true;
  global.alert = () => {};
  clearBtns.forEach(b => b.onclick({ stopPropagation() {} }));

  const d = state.load();
  assert.equal(d.examQuestions.length, 0);
  assert.equal(d._examGroupsCleared.length, 3, '三组都要入队');

  // 清空后必须仍能同步（原来这里报"没有可同步的题目"）
  const captured = [];
  global.prompt = () => 'pw';
  global.WB.cloud = {
    pullTree: async () => ({ success: true, courses: [], exams: [] }),
    pushStructure: async () => ({ success: true, idMap: { chapters: {}, lessons: {} }, results: [] }),
    pushQuestions: async p => { captured.push(p); return { success: true, results: [] }; }
  };
  delete require.cache[require.resolve(syncPath)];
  await require(syncPath).syncQuestions();

  assert.equal(captured.length, 3, '三个学科各一个 payload');
  assert.equal(captured.reduce((s, p) => s + p.examUpserts.length, 0), 3);
  assert.ok(captured.every(p => p.examUpserts.every(g => g.questions.length === 0)), '应全为清空指令');
});
