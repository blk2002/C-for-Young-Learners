const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/parser.js');

const messy = `# 学科：Python
## 第1章 认识 Python
### 知识点：1.1 什么是编程
**概念**：编程就是告诉计算机做什么。
【特征】一行一句，语法简单。
【易混淆】编程语言 ≠ 程序文件
【代码】print("Hi")
【学习题】
- 选择|下列哪个是输出函数？|A.print|B.input|C.len|D.type|答案：A|解析:print输出到屏幕
- 填空|Python 源文件后缀是____|答案:.py|解析:保存为.py文件
【章节题】
- 选择|print("Hi") 会输出什么？|A:Hi|B:"Hi"|C:报错|D:空|答案:A|解析:引号本身不显示
#### 这行层级多余，归入最近知识点
## 第2章 变量
### 知识点：2.1 变量与赋值
【概念】变量是放数据的小盒子。
【特征】赋值用 = 。
【易混淆】= 与 ==
【考试题】(GESP,一级)
- 选择|下列哪个变量名合法？|A:2name|B:my_name|C:my-name|D:print|答案:B|解析:不能数字开头`;

test('解析出学科/章节/知识点', () => {
  const r = P.parseMaterial(messy);
  assert.equal(r.course, 'Python');
  assert.equal(r.chapters.length, 2);
  assert.equal(r.chapters[0].lessons[0].title, '1.1 什么是编程');
});

test('三段容错：**概念**： 与多行续行都归段', () => {
  const r = P.parseMaterial(messy);
  const l = r.chapters[0].lessons[0];
  assert.ok(l.concept.includes('编程就是告诉计算机做什么'));
  assert.ok(l.feature.includes('一行一句'));
  assert.equal(l.code, 'print("Hi")');
});

test('题目行容错：A.print 与 答案：A（全角冒号）', () => {
  const r = P.parseMaterial(messy);
  const l = r.chapters[0].lessons[0];
  assert.equal(l.questions.length, 2);
  const q = l.questions[0];
  assert.equal(q.type, 'choice');
  assert.equal(q.options.A, 'print');
  assert.equal(q.answer, 'A');
  assert.equal(l.chapterQuestions.length, 1);
});

test('考试题归组，#### 层级归入最近知识点 pending 不硬猜', () => {
  const r = P.parseMaterial(messy);
  assert.equal(r.examGroups.length, 1);
  assert.equal(r.examGroups[0].examType, 'GESP');
  assert.equal(r.examGroups[0].level, '一级');
  assert.ok(r.chapters[0].lessons[0].concept.includes('层级多余') || r.pending.some(x => x.includes('层级多余')));
});

test('compose/split 往返', () => {
  const c = { concept: '概念内容', feature: '特征内容', confusion: '易混内容' };
  const s = P.composeContent(c);
  assert.ok(s.startsWith('【概念】'));
  const back = P.splitContent(s);
  assert.deepEqual(back, c);
});

test('split 无标记旧内容整体入概念段', () => {
  const back = P.splitContent('旧的知识点讲解文字');
  assert.equal(back.concept, '旧的知识点讲解文字');
  assert.equal(back.feature, '');
});
