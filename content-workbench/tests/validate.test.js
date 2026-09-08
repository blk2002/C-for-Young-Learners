const test = require('node:test');
const assert = require('node:assert');
const V = require('../js/validate.js');

test('选择题选项不全报错', () => {
  const q = { type: 'choice', question: 'q', options: { A: 'a', B: 'b', C: '', D: 'd' }, answer: 'B', explanation: '' };
  const errs = V.validateQuestion(q);
  assert.ok(errs.some(e => e.includes('C')));
});

test('答案越界与填空空答案报错', () => {
  assert.ok(V.validateQuestion({ type: 'choice', question: 'q', options: { A: '1', B: '2', C: '3', D: '4' }, answer: 'E' }).length > 0);
  assert.ok(V.validateQuestion({ type: 'fill', question: 'q', answer: '' }).length > 0);
  assert.deepEqual(V.validateQuestion({ type: 'fill', question: 'q', answer: 'x' }), []);
});

test('hash 忽略空白差异命中重复', () => {
  const a = V.hashQuestion({ type: 'fill', question: '后缀 是 什么', answer: ' .py ' });
  const b = V.hashQuestion({ type: 'fill', question: '后缀是什么', answer: '.py' });
  assert.equal(a, b);
});

test('markDuplicates 置 dup', () => {
  const existing = [{ type: 'fill', question: '后缀是什么', answer: '.py' }];
  const rows = [{ type: 'fill', question: '后缀 是 什么', answer: '.py', rowStatus: 'ok' },
                { type: 'fill', question: '新题', answer: 'x', rowStatus: 'ok' }];
  V.markDuplicates(rows, existing);
  assert.equal(rows[0].rowStatus, 'dup');
  assert.equal(rows[1].rowStatus, 'ok');
});

test('segmentHint 超60字提示', () => {
  assert.equal(V.segmentHint('短'), null);
  assert.equal(V.segmentHint('字'.repeat(61)), 'over');
});
