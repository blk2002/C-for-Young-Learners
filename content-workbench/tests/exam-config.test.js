const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const state = require('../js/state.js');
const validate = require('../js/validate.js');
const quizPath = path.join(__dirname, '..', 'js', 'quiz-ui.js');

// 与 exam-subview.test.js 相同的最小 DOM
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
    querySelector: () => FakeEl('div'),
    body: FakeEl('div')
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
function collect(root, pred, out) {
  (root.children || []).forEach(c => { if (pred(c)) out.push(c); collect(c, pred, out); });
  return out;
}
const findByText = (allEls, t) => allEls.find(e => e.textContent === t && e.tag === 'button');
const mkStorage = () => {
  const store = new Map();
  return { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
};

// ===== state.getExamConfig =====

test('getExamConfig：内置学科缺字段回落默认模板，且返回的是副本', () => {
  const d = state.blankDraft();
  const def = state.getExamConfig(d, 'cpp');
  assert.ok(def.some(t => t.type === 'CSP-JS'), 'cpp 默认配置应含 CSP-JS');
  assert.ok(def.every(t => Array.isArray(t.levels) && t.levels.length), '每个默认类型都要有等级列表');
  def.push({ type: 'X' });
  const again = state.getExamConfig(d, 'cpp');
  assert.equal(again.some(t => t.type === 'X'), false, '修改返回副本不应污染默认模板');
});

test('getExamConfig：节点上有配置用节点，非内置无配置返回空数组', () => {
  const d = state.blankDraft();
  d.tree.cpp.examConfig = [{ type: 'CUSTOM', levels: ['一级'] }];
  assert.equal(state.getExamConfig(d, 'cpp')[0].type, 'CUSTOM', '节点配置优先于默认模板');
  d.tree.scratch = { name: 'Scratch', chapters: [] };
  assert.deepEqual(state.getExamConfig(d, 'scratch'), [], '非内置学科未配置时应为空');
});

// ===== 新建分类表单：选项来自学科 examConfig + 旧数据兜底 =====

test('新建分类表单：类型/级别选项来自 examConfig，旧数据的类型级别也合并进来', () => {
  const { allEls } = setupDom();
  global.localStorage = mkStorage();
  const d0 = state.blankDraft();
  d0.tree = {
    scratch: {
      name: 'Scratch', chapters: [],
      examConfig: [{ type: 'SIE', name: 'SIE 等级考试', levels: ['一级', '二级', '三级'] }]
    }
  };
  // 旧数据：SIE / 四级 有一道题（不在配置里）→ 选项里仍要能选到
  d0.examQuestions = [{ courseId: 'scratch', examType: 'SIE', level: '四级',
    questions: [{ type: 'choice', question: '旧题', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', explanation: '' }] }];
  state.save(d0);
  global.confirm = () => true; global.alert = () => {};
  global.WB = { state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone, getExamConfig: state.getExamConfig }, validate, treeUI: { getSelected: () => null, getCurrentCourse: () => 'scratch', render: () => {} } };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);
  findByText(allEls, '＋ 新建分类').onclick();

  const nf = allEls.find(e => e.id === 'wb-newcat-form');
  const sels = collect(nf, c => c.tag === 'select', []);   // [cid, et, lv]
  const optVals = sel => collect(sel, c => c.tag === 'option', []).map(o => o.value);
  // 真实 DOM 里 select 默认选中第一项并联动；FakeEl 需手动赋值 + 触发 onchange
  sels[0].value = 'scratch'; sels[0].onchange();
  assert.deepEqual(optVals(sels[1]), ['SIE'], '类型选项应来自该学科 examConfig，不再出现写死的 CIE/GESP');
  sels[1].value = 'SIE'; sels[1].onchange();
  assert.deepEqual(optVals(sels[2]).sort(), ['一级', '三级', '二级', '四级'].sort(),
    '级别选项 = 配置的等级 + 旧数据出现过的等级');
});

// ===== 考试类型配置编辑器：保存上云 + 本地落库 =====

test('考试类型配置编辑器：保存调用 setExamConfig 上云，并写入本地树节点', async () => {
  const { allEls } = setupDom();
  global.localStorage = mkStorage();
  const d0 = state.blankDraft();
  d0.tree = { scratch: { name: 'Scratch', chapters: [] } };
  d0.password = 'pw';
  state.save(d0);
  global.confirm = () => true; global.alert = () => {};
  global.prompt = () => 'pw';
  const calls = [];
  global.WB = {
    state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone, getExamConfig: state.getExamConfig },
    validate,
    treeUI: { getSelected: () => null, getCurrentCourse: () => 'scratch', render: () => {} },
    cloud: {
      ensureLogin: async () => true,
      call: async (name, data) => {
        calls.push({ name, data });
        return { success: true, message: 'ok' };
      }
    }
  };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);

  findByText(allEls, '⚙ 考试类型配置').onclick();
  const mask = global.document.body.children[global.document.body.children.length - 1];
  // FakeEl 的 select 不会自动选中项：手动选中学科并触发加载
  const cidSelModal = collect(mask, c => c.tag === 'select', [])[0];
  cidSelModal.value = 'scratch'; cidSelModal.onchange();
  // 新学科默认没有考试类型 → 先加一行再填写
  findByText(allEls, '＋ 添加考试类型').onclick();
  const inputs = collect(mask, c => c.tag === 'input', []);
  const textareas = collect(mask, c => c.tag === 'textarea', []);
  // 一行类型：row1（type/name）+ row2（desc/icon/color/colorDark）= 6 个输入框
  // 处理器从元素 .value 读值，先赋值再触发
  inputs[0].value = 'SIE'; inputs[0].oninput();
  inputs[1].value = 'SIE 等级考试'; inputs[1].oninput();
  inputs[2].value = 'Scratch 等级考试'; inputs[2].oninput();
  textareas[0].value = '一级\n二级'; textareas[0].oninput();
  findByText(allEls, '保存并上云').onclick();
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));

  assert.equal(calls.length, 1, '应调用一次云函数');
  assert.equal(calls[0].name, 'manageCourses');
  assert.equal(calls[0].data.action, 'setExamConfig');
  assert.equal(calls[0].data.courseId, 'scratch');
  assert.deepEqual(calls[0].data.examConfig[0].levels, ['一级', '二级']);

  const d = state.load();
  assert.deepEqual(d.tree.scratch.examConfig[0].type, 'SIE', '本地树节点也应写入配置');
  assert.deepEqual(d.tree.scratch.examConfig[0].levels, ['一级', '二级']);
});

// ===== 已配置未建题的分类：幽灵卡显示 + 点击建组 =====

test('考试题分类：全部学科只提示条数；选中学科后幽灵卡点击即创建空组', () => {
  const { allEls } = setupDom();
  global.localStorage = mkStorage();
  const d0 = state.blankDraft();
  d0.tree = {
    scratch: { name: 'Scratch', chapters: [], examConfig: [{ type: 'SIE', name: 'SIE 等级考试', levels: ['一级', '二级'] }] },
    python: { name: 'Python', chapters: [] }
  };
  state.save(d0);
  global.confirm = () => true; global.alert = () => {};
  global.WB = { state: { load: () => state.load(), save: d => state.save(d), contentDone: state.contentDone, getExamConfig: state.getExamConfig }, validate, treeUI: { getSelected: () => null, getCurrentCourse: () => 'scratch', render: () => {} } };

  delete require.cache[require.resolve(quizPath)];
  require(quizPath).render();
  switchToExam(allEls);

  // 「全部学科」视图：无组也无幽灵卡，但应有一行提示
  const hints = allEls.filter(e => typeof e.textContent === 'string' && e.textContent.indexOf('已配置未建题的分类') >= 0);
  assert.equal(hints.length, 1, '全部学科视图应显示「另有 N 个已配置未建题的分类」提示');
  const ghostCount0 = allEls.filter(e => String(e.className).indexOf('wb-exam-grp ghost') >= 0).length;
  assert.equal(ghostCount0, 0, '全部学科视图不应展开幽灵卡');

  // 选中 Scratch → 两张幽灵卡（SIE·一级 / SIE·二级）
  const filterSel = allEls.find(e => e.tag === 'select' &&
    collect(e, c => c.tag === 'option', []).some(o => o.textContent === '全部学科'));
  filterSel.value = 'scratch'; filterSel.onchange();
  const ghosts = allEls.filter(e => String(e.className).indexOf('wb-exam-grp ghost') >= 0);
  assert.equal(ghosts.length, 2, 'Scratch 下应显示 2 张未建题幽灵卡（一级/二级）');

  // 点击第一张 → 创建本地空组并选中
  ghosts[0].onclick();
  const d = state.load();
  assert.equal(d.examQuestions.length, 1, '点击幽灵卡应创建一个分类组');
  assert.equal(d.examQuestions[0].courseId, 'scratch');
  assert.equal(d.examQuestions[0].examType, 'SIE');
  assert.equal(d.examQuestions[0].level, '一级');
  assert.deepEqual(d.examQuestions[0].questions, [], '新组应为空数组（空组不会上传云端）');
});

// ===== sync.pull 合并 registry 的 examConfig =====

test('pull：云端 registry 带 examConfig 时合并进本地树节点', async () => {
  const syncPath = path.join(__dirname, '..', 'js', 'sync.js');
  const { allEls } = setupDom();
  global.localStorage = mkStorage();
  const d0 = state.blankDraft();
  d0.tree = { scratch: { name: 'Scratch', chapters: [] } };
  d0.password = 'pw';
  state.save(d0);
  let draftRef = d0;
  global.confirm = () => true; global.alert = () => {}; global.prompt = () => 'pw';
  global.WB = {
    state: { load: () => draftRef, save: d => { draftRef = d; }, contentDone: state.contentDone, getExamConfig: state.getExamConfig },
    validate,
    treeUI: { getSelected: () => null, getCurrentCourse: () => 'scratch', render: () => {} },
    cloud: {
      listCourses: async () => [{ _id: 'scratch', name: 'Scratch', color: '#5B67F1', examConfig: [{ type: 'SIE', levels: ['一级'] }] }],
      pullTree: async () => ({ success: true, courses: [], exams: [] })
    }
  };
  delete require.cache[require.resolve(syncPath)];
  require(syncPath).pull();
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));

  assert.deepEqual(draftRef.tree.scratch.examConfig[0].type, 'SIE', '拉取后应把云端配置合并进本地');
});
