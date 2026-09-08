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
  assert.equal(state.load(s).tree.python, undefined);
});

test('contentDone 三段齐全才为真', () => {
  const base = { content: { concept: 'a', feature: 'b', confusion: 'c' } };
  assert.equal(state.contentDone(base), true);
  assert.equal(state.contentDone({ content: { concept: 'a', feature: '', confusion: 'c' } }), false);
});
