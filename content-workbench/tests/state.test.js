const test = require('node:test');
const assert = require('node:assert');
const state = require('../js/state.js');

function fakeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

test('blankDraft 结构完整', () => {
  const d = state.blankDraft();
  assert.deepEqual(Object.keys(d).sort(), ['chapterQuestions', 'examQuestions', 'password', 'savedAt', 'tree', 'version']);
  assert.equal(d.version, 1);
});

test('save/load 往返一致', () => {
  const s = fakeStorage();
  const d = state.blankDraft();
  d.tree.python = { name: 'Python', chapters: [{ key: state.uid('c'), cloudId: null, title: '第1章', order: 1, lessons: [] }] };
  state.save(d, s);
  const back = state.load(s);
  assert.equal(back.tree.python.chapters[0].title, '第1章');
  assert.ok(back.savedAt);
});

test('clear 后 load 返回空白草稿', () => {
  const s = fakeStorage();
  state.save(state.blankDraft(), s);
  state.clear(s);
  // 空白草稿自带两门内置学科（python / cpp），所以这里断言的是"回到初始态"而不是空树
  const d = state.load(s);
  assert.deepEqual(Object.keys(d.tree).sort(), ['cpp', 'python']);
  assert.deepEqual(d.tree.python.chapters, []);
});

test('内置学科自带 python / cpp 且被标记为只读', () => {
  const d = state.blankDraft();
  assert.equal(d.tree.python.name, 'Python');
  assert.equal(d.tree.cpp.name, 'C++');
  assert.equal(d.tree.python.builtin, true);
  assert.equal(d.tree.cpp.builtin, true);
  assert.equal(state.isBuiltinCourse('python'), true);
  assert.equal(state.isBuiltinCourse('cpp'), true);
  assert.equal(state.isBuiltinCourse('scratch'), false);
});

test('老草稿 load 时自动补齐内置学科，且不动已有内容', () => {
  const s = fakeStorage();
  const old = { version: 1, savedAt: null, password: '', chapterQuestions: [], examQuestions: [],
    tree: { scratch: { name: 'Scratch', color: '#5B67F1', chapters: [{ key: 'c1', cloudId: 'C1', title: '第1章', order: 1, lessons: [] }] } } };
  s.setItem('wb-draft-v1', JSON.stringify(old));
  const d = state.load(s);
  assert.equal(d.tree.scratch.chapters[0].cloudId, 'C1');   // 老数据原样保留
  assert.ok(d.tree.python, '补上了 python');
  assert.ok(d.tree.cpp, '补上了 cpp');
  assert.deepEqual(d.tree.python.chapters, []);
  assert.equal(state.ensureBuiltinCourses(d), false);        // 幂等：再补一次无变化
});

test('已有 Python（大小写/别名 id）不会再补一门重复的', () => {
  const d = { tree: { Python: { name: '派森', chapters: [] } } };
  assert.equal(state.ensureBuiltinCourses(d), true);          // 只补缺的 cpp
  assert.deepEqual(Object.keys(d.tree), ['Python', 'cpp']);   // python 没有被重复插入
  assert.equal(d.tree.Python.name, '派森');                    // 原名与内容原样保留
});

test('contentDone 三段齐全才为真', () => {
  const base = { content: { concept: 'a', feature: 'b', confusion: 'c' } };
  assert.equal(state.contentDone(base), true);
  assert.equal(state.contentDone({ content: { concept: 'a', feature: '', confusion: 'c' } }), false);
});
