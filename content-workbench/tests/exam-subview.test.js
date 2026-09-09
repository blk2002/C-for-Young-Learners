const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const state = require('../js/state.js');
const validate = require('../js/validate.js');
const quizPath = path.join(__dirname, '..', 'js', 'quiz-ui.js');
const ollama = require('../js/ollama.js');

function setupDom() {
  const buttons = [];
  const allEls = [];
  function FakeEl(tag) {
    const e = {
      tag, children: [], style: {}, value: '', textContent: '', className: '', id: '', disabled: false,
      classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
      appendChild(c) { e.children.push(c); return c; },
      insertBefore(c, ref) { const i = ref ? e.children.indexOf(ref) : -1; if (i < 0) e.children.push(c); else e.children.splice(i, 0, c); return c; },
      remove() {}, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}
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
function switchToExam(allEls) {
  const seg = allEls.find(e => typeof e.className === 'string' && e.className.indexOf('wb-seg-item') >= 0 && e.textContent === '考试题');
  seg.onclick();
}
// 递归收集某元素下所有满足条件的后代
function collect(root, pred, out) {
  (root.children || []).forEach(c => { if (pred(c)) out.push(c); collect(c, pred, out); });
  return out;
}
const findByText = (allEls, t) => allEls.find(e => e.textContent === t && e.tag === 'button');

test('考试题子区：新建分类 + 手动加一道，进入该组', async () => {
  const { buttons, allEls } = setupDom();
  const store = new Map();
  global.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const d0 = state.blankDraft();
  d0.tree = { cpp: { name: 'C++', color: '#4E6EF2', chapters: [] } };
  state.save(d0);
  global.confirm = () => true; global.alert = () => {};
  global.WB = { state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone }, validate, treeUI: { getSelected: () => null, getCurrentCourse: () => undefined, render: () => {} } };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);

  // 1) 新建分类 cpp / GESP / 三级
  findByText(allEls, '＋ 新建分类').onclick();
  const nf = allEls.find(e => e.id === 'wb-newcat-form');
  const nsel = collect(nf, c => c.tag === 'select', []);   // [cid, et, lv]
  nsel[0].value = 'cpp'; nsel[1].value = 'GESP'; nsel[2].value = '三级';
  collect(nf, c => c.tag === 'button', [])[0].onclick();

  let d = state.load();
  assert.equal(d.examQuestions.length, 1, '应新建一个分类组');
  assert.deepEqual({ c: d.examQuestions[0].courseId, e: d.examQuestions[0].examType, l: d.examQuestions[0].level }, { c: 'cpp', e: 'GESP', l: '三级' });
  assert.equal(d.examQuestions[0].questions.length, 0);

  // 2) 手动加一道（目标优先：直接进当前选中组）
  findByText(allEls, '手动加一道').onclick();
  const mf = allEls.find(e => e.id === 'wb-manual-form');
  const msel = collect(mf, c => c.tag === 'select', []);   // [type, cid, et, lv]
  msel[0].value = 'choice';
  msel[1].value = 'cpp'; msel[2].value = 'GESP'; msel[3].value = '三级';
  const mins = collect(mf, c => c.className === 'wb-qinput', []); // [q,A,B,C,D,ans,exp]
  mins[0].value = '手动题1'; mins[1].value = 'a'; mins[2].value = 'b'; mins[3].value = 'c'; mins[4].value = 'd'; mins[5].value = 'A'; mins[6].value = '解析';
  collect(mf, c => c.tag === 'button', [])[0].onclick();

  d = state.load();
  const g = d.examQuestions[0];
  assert.equal(g.questions.length, 1, '手动加的一道应进入该组');
  assert.equal(g.questions[0].question, '手动题1');
  assert.equal(g.questions[0].answer, 'A');
  assert.deepEqual(g.questions[0].options, { A: 'a', B: 'b', C: 'c', D: 'd' });
});

test('考试题子区：AI 按本分类生成 路由到当前选中的组', async () => {
  const { buttons, allEls } = setupDom();
  const store = new Map();
  global.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const d0 = state.blankDraft();
  d0.tree = { cpp: { name: 'C++', color: '#4E6EF2', chapters: [] } };
  d0.examQuestions = [{ courseId: 'cpp', examType: 'GESP', level: '三级', questions: [{ type: 'choice', question: '旧题', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', explanation: '' }] }];
  state.save(d0);
  global.confirm = () => true; global.alert = () => {};
  const fakeArr = [
    { type: 'choice', question: 'AI题1', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', explanation: '' },
    { type: 'fill', question: 'AI题2', answer: 'x', explanation: '' }
  ];
  global.WB = {
    state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone },
    validate,
    treeUI: { getSelected: () => null, getCurrentCourse: () => undefined, render: () => {} },
    ollama: { ...ollama, chat: async () => '```json\n' + JSON.stringify(fakeArr) + '\n```' }
  };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);

  // 选中该分类组（点卡片）
  const card = allEls.find(e => typeof e.className === 'string' && e.className.indexOf('wb-exam-grp') >= 0);
  card.onclick();

  // 点 AI 按本分类生成（count 默认 2）
  findByText(allEls, 'AI 按本分类生成').onclick();
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));

  const d = state.load();
  const g = d.examQuestions[0];
  assert.equal(g.questions.length, 3, '旧题 1 + AI 生成 2 = 3');
  assert.ok(g.questions.some(q => q.question === 'AI题1'), 'AI 生成的题应进入该组');
  assert.ok(g.questions.some(q => q.question === 'AI题2'), '填空题也应进入');
});
