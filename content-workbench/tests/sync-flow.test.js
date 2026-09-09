const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const syncPath = path.join(__dirname, '..', 'js', 'sync.js');

// sync.js 是单例 IIFE，每次用例都要清缓存重新加载，并注入一套 mock 环境。
// draft 用闭包变量持有：syncStructure/syncQuestions 内部 save(d) 会换对象，getDraft() 取最新。
function freshSync(initialDraft, opts = {}) {
  let draft = initialDraft;
  const captured = { structure: [], questions: [], alerts: [], confirms: [] };
  global.confirm = m => { captured.confirms.push(m); return true; };
  global.alert = m => { captured.alerts.push(m); };
  global.prompt = () => 'pw';
  global.window = {};
  global.WBRefreshStat = () => {};
  global.WBRefreshPanel = () => {};
  global.document = { getElementById: () => null };
  global.WB = {
    state: { load: () => draft, save: d => { draft = d; } },
    cloud: {
      pullTree: async () => ({ success: true, courses: [], exams: [] }),
      pushStructure: async p => {
        captured.structure.push(p);
        return { success: true, idMap: { chapters: {}, lessons: {} }, results: [] };
      },
      pushQuestions: opts.failQuestions
        ? async () => { throw new Error('网络失败'); }
        : async p => { captured.questions.push(p); return { success: true, results: [] }; }
    },
    validate: {
      validateQuestion: q => (q && q.question && q.answer) ? [] : ['缺少题干或答案'],
      hashQuestion: q => JSON.stringify([q.question, q.answer])
    },
    treeUI: { render: () => {} }
  };
  delete require.cache[require.resolve(syncPath)];
  return { sync: require(syncPath), captured, getDraft: () => draft };
}

// 学科被删光后 tree 为空，但删除队列里还压着云端残留。
// 历史上这里一个 payload 都生成不了 → 「同步结构与内容」报"没有可同步的课程结构"
// → 云端旧数据删不掉 → 拉取又被拉回来。
test('学科删光后仍能发出纯删除的结构 payload', async () => {
  const env = freshSync({
    password: 'pw', tree: {}, examQuestions: [],
    _deletedChapters: [{ cloudId: 'ch1', courseId: 'cpp' }, { cloudId: 'ch1', courseId: 'cpp' }], // 故意重复
    _deletedLessons: [{ cloudId: 'ls1', courseId: 'cpp' }]
  });
  await env.sync.syncStructure();
  assert.equal(env.captured.structure.length, 1);
  const p = env.captured.structure[0];
  assert.equal(p.courseId, 'cpp');                 // 队列里记录的真实 courseId
  assert.deepEqual(p.deleteChapterIds, ['ch1']);   // 去重
  assert.deepEqual(p.deleteLessonIds, ['ls1']);
  assert.equal(p.chapters.length, 0);              // 纯删除
  assert.match(env.captured.confirms[0], /删除 2/); // 统计也要去重
});

// 考试题是独立实体：即便所属学科已从 tree 删除，清空意图仍要能同步出去。
test('孤儿学科下的考试题清空意图仍能同步', async () => {
  const env = freshSync({
    password: 'pw', tree: {}, examQuestions: [],
    _examGroupsCleared: [{ courseId: 'cpp', examType: 'GESP', level: '3' }]
  });
  await env.sync.syncQuestions();
  assert.equal(env.captured.questions.length, 1);
  const p = env.captured.questions[0];
  assert.equal(p.courseId, 'cpp');
  assert.equal(p.examUpserts.length, 1);
  assert.equal(p.examUpserts[0].questions.length, 0);   // questions:[] = 让云端清空
  assert.match(env.captured.confirms[0], /含 1 组清空云端/);
});

// 考试题不挂在知识点下，collectAllQuestions 原来只遍历 d.tree，
// 导致考试题完全逃过硬校验，错题能直接上云。
test('考试题纳入硬校验', async () => {
  const env = freshSync({
    password: 'pw', tree: {},
    examQuestions: [{ courseId: 'cpp', examType: 'GESP', level: '3', questions: [{ question: '坏题', answer: '' }] }]
  });
  await env.sync.syncQuestions();
  assert.equal(env.captured.questions.length, 0, '不该发出 payload');
  assert.match(env.captured.alerts[0], /考试题 1/);
});

test('_skip 的考试题不阻塞同步', async () => {
  const env = freshSync({
    password: 'pw', tree: {},
    examQuestions: [{ courseId: 'cpp', examType: 'GESP', level: '3',
      questions: [{ question: '坏题', answer: '', _skip: true }, { question: '好题', answer: 'A' }] }]
  });
  await env.sync.syncQuestions();
  assert.equal(env.captured.questions.length, 1);
});

// 同步失败时意图必须保留在队列里，否则丢失后云端那组永远清不掉。
test('同步失败时保留清空意图', async () => {
  const env = freshSync({
    password: 'pw', tree: {}, examQuestions: [],
    _examGroupsCleared: [{ courseId: 'cpp', examType: 'GESP', level: '3' }]
  }, { failQuestions: true });
  await env.sync.syncQuestions();
  assert.equal(env.getDraft()._examGroupsCleared.length, 1);
});
