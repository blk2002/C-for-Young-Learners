const test = require('node:test');
const assert = require('node:assert');
const state = require('../js/state.js');
const P = require('../js/parser.js');

test('mergeIntoDraft 同名章节合并、空段填充、题目追加', () => {
  const d = state.blankDraft();
  d.tree.python = { name: 'Python', chapters: [{ key: 'c1', cloudId: 'ch-1', title: '第1章', order: 1,
    lessons: [{ key: 'l1', cloudId: 'ls-1', chapterKey: 'c1', title: '1.1 什么是编程', order: 1,
      content: { concept: '已有概念', feature: '', confusion: '' }, codeExample: '', questions: [], chapterQuestions: [] }] }] };
  const parsed = P.parseMaterial('# 学科：Python\n## 第1章\n### 知识点：1.1 什么是编程\n【概念】AI概念\n【特征】AI特征\n【易混淆】AI易混\n【学习题】\n- 填空|题|答案:ans|解析:e');
  P.mergeIntoDraft(d, parsed, 'python');
  const ls = d.tree.python.chapters[0].lessons[0];
  assert.equal(ls.content.concept, '已有概念');      // 不覆盖非空段
  assert.equal(ls.content.feature, 'AI特征');         // 填空段
  assert.equal(ls.questions.length, 1);
});

test('mergeIntoDraft 新章节追加、考试组合并', () => {
  const d = state.blankDraft();
  const parsed = P.parseMaterial('# 学科：Python\n## 新章\n### 知识点：新点\n【概念】x\n【特征】y\n【易混淆】z\n【考试题】(GESP,一级)\n- 填空|q|答案:a|解析:e');
  P.mergeIntoDraft(d, parsed, 'python');
  assert.equal(d.tree.python.chapters.length, 1);
  assert.equal(d.examQuestions.length, 1);
  assert.equal(d.examQuestions[0].questions.length, 1);
});
