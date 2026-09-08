# 课程内容工作台 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建方案 C 的网页版课程内容工作台：云开发静态托管页面 + 本地 Ollama 转换 + 云函数写库，实现学科章节/知识点/三类题目的 AI 辅助与手动维护。

**Architecture:** 纯静态无构建页面（经典 script 标签，全局命名空间 `WB`）部署到云开发静态托管；页面经 `@cloudbase/js-sdk` 匿名登录调用两个新云函数（`importContent` 写库、`getCourseTree` 读库，均带管理密码校验）；素材转换走本机 Ollama REST API（`OLLAMA_ORIGINS=*` 允许跨域）。纯逻辑模块（解析/校验/diff 计算）与 UI 分离，可用 `node --test` 直接测试。

**Tech Stack:** 原生 HTML/CSS/JS、@cloudbase/js-sdk 1.x（CDN 全局构建）、mammoth.js（CDN）、Ollama REST API、wx-server-sdk（云函数）、Node 内置 test runner。

**设计文档:** `docs/superpowers/specs/2026-09-09-content-workbench-design.md`（已批准）

## Global Constraints

- 小程序端零改动；唯一例外：新增学科需在 `app.js` 的 `globalData.courses` 加一行（工具中提示，不在本计划内实现）
- 现有集合 `chapters` / `lessons` / `chapterQuestions` / `examQuestions` 的字段结构一律不变
- 前端无构建、无 npm 依赖；外部库只用两个 CDN script：`cloudbase.full.js`、`mammoth.browser.min.js`
- 纯逻辑模块用 `node --test`（Node ≥ 18，无第三方依赖）；执行前先跑 `node -v` 确认
- 云环境 ID 固定 `cloud1-d5g4wtnsn6cc1b835`
- 提交信息中文，格式 `feat: …` / `fix: …` / `test: …` / `docs: …`
- 所有文件 UTF-8 编码
- 双环境导出模式：逻辑文件末尾 `if (typeof module === 'object' && module.exports) module.exports = api; else (root.WB = root.WB || {}, root.WB.xxx = api);`
- `content-compose/split` 在前端 `parser.js` 与云函数 `lib.js` 各存一份（云函数目录必须自包含，部署边界决定的有意重复，不合并）

## 文件结构

```
content-workbench/
├─ index.html            # 页面骨架：状态条/模式页签/左树右工作区/底部同步栏 + CDN 引入
├─ css/style.css         # 全部样式（类名前缀 wb-，避免任何全局冲突）
├─ js/
│  ├─ state.js           # 草稿模型 + localStorage 持久化 + mergeIntoDraft
│  ├─ parser.js          # 素材模板解析（含容错）+ composeContent/splitContent
│  ├─ validate.js        # 硬校验 + 去重哈希 + 字数检查
│  ├─ ollama.js          # 本地模型检测/对话/JSON 提取
│  ├─ cloud.js           # cloudbase 初始化/匿名登录/云函数调用
│  ├─ app.js             # 启动、页签切换、状态条、模块接线
│  ├─ tree-ui.js         # 结构树（增删改/拖拽排序/折叠/状态标记）
│  ├─ content-ui.js      # 素材输入(粘贴/拖文件) + 三段内容编辑
│  ├─ quiz-ui.js         # 题目表格（三来源/行内编辑/归属/校验标记）
│  ├─ sync.js            # 云端拉取合并 + 两阶段同步 + 报告
│  └─ help.js            # 模板复制/AI指令复制/备份导入导出/引导
├─ tests/                # node:test（state/parser/validate/lib 各一个 .test.js）
├─ 启动本地模型.bat
├─ README.md
└─ docs/
   ├─ 素材模板.md
   └─ 网页AI指令.md
cloudfunctions/
├─ importContent/        # 新增云函数（index.js + lib.js + package.json）
└─ getCourseTree/        # 新增云函数（index.js + package.json）
```

## 数据形状约定（所有任务的公共契约）

草稿（localStorage `wb-draft-v1`）：
```js
draft = {
  version: 1, savedAt: ISO, password: '',
  tree: { 'python': { name:'Python', chapters: [ { key, cloudId, title, order,
      lessons: [ { key, cloudId, chapterKey, title, order,
        content: { concept, feature, confusion },   // 三段
        codeExample: '',
        questions: [/* 学习题：canonical 题对象 */],
        chapterQuestions: [/* 章节题 */] } ] } ] } },
  chapterQuestions: [],   // 兼容字段：非知识点挂载的章节题（按 lessonKey）
  examQuestions: [ { courseId:'python', examType:'GESP', level:'一级', questions:[/* 考试题 */] } ]
}
```
canonical 题对象：
```js
{ type:'choice', question, options:{A,B,C,D}, answer:'B', explanation }
{ type:'fill',   question, answer, explanation }
```
表格行（quiz-ui 内部，同步前剔除 UI 字段）：上述对象 + `{ target:'learn'|'chapter'|'exam', lessonKey, examType, level, rowStatus:'ok'|'confirm'|'dup'|'skip'|'error', errors:[] }`

---

### Task 1: 草稿状态层 state.js

**Files:**
- Create: `content-workbench/js/state.js`
- Test: `content-workbench/tests/state.test.js`

**Interfaces:**
- Produces: `WB.state.uid(prefix)`、`WB.state.blankDraft()`、`WB.state.load(storage?)`、`WB.state.save(draft, storage?)`、`WB.state.clear(storage?)`、`WB.state.contentDone(lesson)`；storage 默认取全局 `localStorage`，测试注入 `{getItem,setItem,removeItem}` 假对象

- [ ] **Step 1: 确认 Node 可用**

Run: `node -v`
Expected: `v18.x` 或更高。低于 18 则先安装 Node LTS 再继续。

- [ ] **Step 2: 写失败测试**

`content-workbench/tests/state.test.js`：
```js
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
```

- [ ] **Step 3: 运行确认失败**

Run: `node --test content-workbench/tests/`
Expected: FAIL（找不到模块 `../js/state.js`）

- [ ] **Step 4: 实现**

`content-workbench/js/state.js`：
```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.state = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const KEY = 'wb-draft-v1';
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const blankDraft = () => ({ version: 1, savedAt: null, password: '', tree: {}, chapterQuestions: [], examQuestions: [] });
  const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null);
  function load(storage) {
    const s = storage || defaultStore();
    try { const raw = s && s.getItem(KEY); return raw ? JSON.parse(raw) : blankDraft(); }
    catch (e) { return blankDraft(); }
  }
  function save(draft, storage) {
    const s = storage || defaultStore();
    if (!s) return;
    draft.savedAt = new Date().toISOString();
    s.setItem(KEY, JSON.stringify(draft));
  }
  function clear(storage) { const s = storage || defaultStore(); if (s) s.removeItem(KEY); }
  function contentDone(lesson) {
    const c = lesson && lesson.content;
    return !!(c && c.concept && c.feature && c.confusion);
  }
  return { uid, blankDraft, load, save, clear, contentDone };
});
```

- [ ] **Step 5: 运行确认通过**

Run: `node --test content-workbench/tests/`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add content-workbench/js/state.js content-workbench/tests/state.test.js
git commit -m "feat: 工作台草稿状态层与持久化"
```

---

### Task 2: 素材模板解析器 parser.js

**Files:**
- Create: `content-workbench/js/parser.js`
- Test: `content-workbench/tests/parser.test.js`

**Interfaces:**
- Consumes: 无（纯函数）
- Produces: `WB.parser.parseMaterial(text)` → `{ course, chapters:[{title, lessons:[{title, concept, feature, confusion, code, questions, chapterQuestions}]}], examGroups:[{examType, level, questions}], pending:[] }`；`WB.parser.parseQuestionLine(line)` → 题对象或 null；`WB.parser.composeContent({concept,feature,confusion})` → string；`WB.parser.splitContent(str)` → 三段对象

- [ ] **Step 1: 写失败测试**

`content-workbench/tests/parser.test.js`：
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test content-workbench/tests/parser.test.js`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`content-workbench/js/parser.js`：
```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.parser = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const SEG = { '概念': 'concept', '特征': 'feature', '易混淆': 'confusion', '代码': 'code' };
  const norm = s => (s || '').trim();

  function parseQuestionLine(raw) {
    let line = norm(raw).replace(/^-\s*/, '');
    if (!/^(选择|填空)\|/.test(line)) return null;
    const parts = line.split('|').map(norm);
    const type = parts[0];
    const q = { type, question: parts[1] || '', explanation: '' };
    if (type === 'choice') {
      q.options = { A: '', B: '', C: '', D: '' }; q.answer = '';
      for (let i = 2; i < parts.length; i++) {
        const p = parts[i];
        let m = p.match(/^([A-D])[.、:：]\s*(.*)$/);
        if (m) { q.options[m[1]] = m[2]; continue; }
        m = p.match(/^答案[:：]\s*([A-D])$/);
        if (m) { q.answer = m[1]; continue; }
        m = p.match(/^解析[:：]\s*(.*)$/);
        if (m) { q.explanation = m[2]; continue; }
      }
    } else {
      for (let i = 2; i < parts.length; i++) {
        let m = parts[i].match(/^答案[:：]\s*(.*)$/);
        if (m) { q.answer = m[1]; continue; }
        m = parts[i].match(/^解析[:：]\s*(.*)$/);
        if (m) { q.explanation = m[2]; }
      }
    }
    return q;
  }

  function parseMaterial(text) {
    const lines = String(text || '').split(/\r?\n/);
    const r = { course: '', chapters: [], examGroups: [], pending: [] };
    let ch = null, ls = null, section = null, exam = null;
    const pushQ = q => {
      if (!q) return;
      if (section === 'learn' && ls) ls.questions.push(q);
      else if (section === 'chapter' && ls) ls.chapterQuestions.push(q);
      else if (section === 'exam' && exam) exam.questions.push(q);
      else r.pending.push('（题目缺归属）' + q.question);
    };
    for (const raw of lines) {
      const line = norm(raw);
      if (!line) continue;
      let m;
      if ((m = line.match(/^#{1}\s*学科[:：]\s*(.+)$/))) { r.course = m[1]; continue; }
      if ((m = line.match(/^#{2}\s*(.+)$/))) { ch = { title: m[1], lessons: [] }; r.chapters.push(ch); ls = null; section = null; continue; }
      if ((m = line.match(/^#{3}\s*(?:知识点[:：]?\s*)?(.+)$/))) {
        ls = { title: m[1], concept: '', feature: '', confusion: '', code: '', questions: [], chapterQuestions: [] };
        if (ch) ch.lessons.push(ls); else r.pending.push(line);
        section = null; continue;
      }
      if ((m = line.match(/^#{4,}\s*(.+)$/))) {   // 深层级归入最近知识点内容
        if (ls && !section) ls.concept += (ls.concept ? '\n' : '') + m[1];
        else r.pending.push(line);
        continue;
      }
      if ((m = line.match(/^[*【\s]*(概念|特征|易混淆|代码)[】*:：]\s*(.*)$/))) {
        if (ls) { ls[SEG[m[1]]] = m[2]; section = null; }
        continue;
      }
      if ((m = line.match(/^[*【\s]*(学习题|章节题)[】\s]*$/))) { section = m[1] === '学习题' ? 'learn' : 'chapter'; continue; }
      if ((m = line.match(/^[*【\s]*考试题[】\s]*[(（]([^,，)）]+)[,，]([^)）]+)[)）]\s*$/))) {
        section = 'exam';
        exam = { examType: m[1].trim(), level: m[2].trim(), questions: [] };
        r.examGroups.push(exam);
        continue;
      }
      if (/^(选择|填空)\|/.test(line.replace(/^-\s*/, '')) || /^-\s*(选择|填空)\|/.test(line)) { pushQ(parseQuestionLine(line)); continue; }
      // 段落续行：当前正在写三段之一则并入，否则进 pending
      if (ls && section === null) {
        const lastSeg = ['concept', 'feature', 'confusion'].find(k => ls[k]);
        if (lastSeg && !/^-/.test(line)) { ls[lastSeg] += (ls[lastSeg] ? '\n' : '') + line; continue; }
      }
      if (ls && (section === 'learn' || section === 'chapter' || section === 'exam')) {
        const q = parseQuestionLine(line);
        if (q) { pushQ(q); continue; }
      }
      r.pending.push(line);
    }
    return r;
  }

  function composeContent(c) {
    return ['concept:【概念】', 'feature:【特征】', 'confusion:【易混淆】']
      .map(x => { const [k, tag] = x.split(':'); return c && c[k] ? tag + c[k] : ''; })
      .filter(Boolean).join('\n');
  }

  function splitContent(str) {
    const out = { concept: '', feature: '', confusion: '' };
    const s = String(str || '');
    const m = s.match(/【概念】([\s\S]*?)(【特征】|$)/);
    if (m) out.concept = m[1].trim();
    const f = s.match(/【特征】([\s\S]*?)(【易混淆】|$)/);
    if (f) out.feature = f[1].trim();
    const cf = s.match(/【易混淆】([\s\S]*)$/);
    if (cf) out.confusion = cf[1].trim();
    if (!out.concept && !out.feature && !out.confusion && s) out.concept = s.trim();
    return out;
  }

  return { parseMaterial, parseQuestionLine, composeContent, splitContent };
});
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test content-workbench/tests/parser.test.js`
Expected: 6 tests PASS。若"容错"用例失败，调整续行归段逻辑直到通过（续行只并入最近一个非空段）。

- [ ] **Step 5: Commit**

```bash
git add content-workbench/js/parser.js content-workbench/tests/parser.test.js
git commit -m "feat: 素材模板解析器（含容错与三段拼拆）"
```

---

### Task 3: 校验与去重 validate.js

**Files:**
- Create: `content-workbench/js/validate.js`
- Test: `content-workbench/tests/validate.test.js`

**Interfaces:**
- Produces: `WB.validate.validateQuestion(q)` → 错误数组（空数组=通过）；`WB.validate.hashQuestion(q)` → string；`WB.validate.markDuplicates(rows, existingQuestions)` → rows（同数组引用，置 `rowStatus:'dup'`）；`WB.validate.segmentHint(text)` → `null | 'over'`

- [ ] **Step 1: 写失败测试**

`content-workbench/tests/validate.test.js`：
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test content-workbench/tests/validate.test.js`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`content-workbench/js/validate.js`：
```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.validate = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  function validateQuestion(q) {
    const errs = [];
    if (!q || !q.question || !q.question.trim()) errs.push('题干为空');
    if (q.type === 'choice') {
      ['A', 'B', 'C', 'D'].forEach(k => { if (!q.options || !q.options[k] || !String(q.options[k]).trim()) errs.push('选项' + k + '为空'); });
      if (!/^[A-D]$/.test(q.answer || '')) errs.push('答案不在A-D');
    } else if (q.type === 'fill') {
      if (!q.answer || !String(q.answer).trim()) errs.push('填空答案为空');
    } else errs.push('未知题型');
    return errs;
  }
  const normText = s => String(s || '').replace(/\s+/g, '');
  function hashQuestion(q) { return normText(q.question) + '||' + normText(q.answer); }
  function markDuplicates(rows, existingQuestions) {
    const seen = new Set((existingQuestions || []).map(hashQuestion));
    rows.forEach(r => { if (seen.has(hashQuestion(r))) r.rowStatus = 'dup'; });
    return rows;
  }
  function segmentHint(text) { return text && text.length > 60 ? 'over' : null; }
  return { validateQuestion, hashQuestion, markDuplicates, segmentHint };
});
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test content-workbench/tests/validate.test.js`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add content-workbench/js/validate.js content-workbench/tests/validate.test.js
git commit -m "feat: 题目硬校验与去重哈希"
```

---

### Task 4: 云函数纯逻辑 importContent/lib.js

**Files:**
- Create: `cloudfunctions/importContent/lib.js`
- Test: `content-workbench/tests/lib.test.js`

**Interfaces:**
- Consumes: canonical 题对象、三段对象（形状见前文契约）
- Produces（require 自 `cloudfunctions/importContent/lib.js`）：`composeContent(c)`、`splitContent(s)`（与 parser.js 行为一致）、`buildStructureOps(payload)`、`buildQuestionOps(payload)`；payload 形状见测试与 Step 3 注释

- [ ] **Step 1: 写失败测试**

`content-workbench/tests/lib.test.js`：
```js
const test = require('node:test');
const assert = require('node:assert');
const lib = require('../../cloudfunctions/importContent/lib.js');

test('buildStructureOps 区分新增/更新/删除', () => {
  const payload = {
    courseId: 'python',
    chapters: [
      { key: 'c1', cloudId: 'ch-9', title: '第1章 改名', order: 1,
        lessons: [
          { key: 'l1', cloudId: 'ls-8', title: '1.1', order: 1,
            content: { concept: 'a', feature: 'b', confusion: 'c' }, codeExample: 'x=1', questions: [] },
          { key: 'l2', cloudId: null, title: '1.2 新增', order: 2,
            content: { concept: 'a', feature: 'b', confusion: 'c' }, codeExample: '', questions: [] }
        ] },
      { key: 'c2', cloudId: null, title: '第2章', order: 2, lessons: [] }
    ],
    deleteChapterIds: ['ch-7'], deleteLessonIds: ['ls-6']
  };
  const ops = lib.buildStructureOps(payload);
  assert.equal(ops.chapterAdds.length, 1);                       // c2
  assert.equal(ops.chapterUpdates.length, 1);                    // ch-9
  assert.equal(ops.chapterDeletes.length, 1);                    // ch-7
  assert.equal(ops.lessonAdds.length, 1);                        // l2（chapterKey 归 c1）
  assert.equal(ops.lessonAdds[0].chapterId, 'ch-9');
  assert.equal(ops.lessonUpdates.length, 1);                     // ls-8
  assert.equal(ops.lessonUpdates[0].data.content.startsWith('【概念】'), true);
});

test('buildQuestionOps 拒绝未入库知识点并分拣', () => {
  const payload = {
    courseId: 'python',
    learnUpdates: [ { lessonId: 'ls-8', questions: [{ type: 'fill', question: 'q', answer: 'a', explanation: '' }] } ],
    chapterUpserts: [ { lessonId: 'ls-8', questions: [] } ],
    examUpserts: [ { examType: 'GESP', level: '一级', questions: [] } ]
  };
  const ops = lib.buildQuestionOps(payload);
  assert.equal(ops.errors.length, 0);
  assert.equal(ops.learnUpdates.length, 1);
  const bad = { courseId: 'python', learnUpdates: [{ lessonId: null, questions: [] }], chapterUpserts: [], examUpserts: [] };
  assert.equal(lib.buildQuestionOps(bad).errors.length, 1);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test content-workbench/tests/lib.test.js`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`cloudfunctions/importContent/lib.js`：
```js
// 纯逻辑，不引入 wx-server-sdk；由 index.js require，也可被 node --test 直接测试。
function composeContent(c) {
  if (!c) return '';
  return [['【概念】', c.concept], ['【特征】', c.feature], ['【易混淆】', c.confusion]]
    .filter(p => p[1]).map(p => p[0] + p[1]).join('\n');
}
function splitContent(s) {
  const out = { concept: '', feature: '', confusion: '' };
  const str = String(s || '');
  const m = str.match(/【概念】([\s\S]*?)(【特征】|$)/); if (m) out.concept = m[1].trim();
  const f = str.match(/【特征】([\s\S]*?)(【易混淆】|$)/); if (f) out.feature = f[1].trim();
  const cf = str.match(/【易混淆】([\s\S]*)$/); if (cf) out.confusion = cf[1].trim();
  if (!out.concept && !out.feature && !out.confusion && str) out.concept = str.trim();
  return out;
}
// payload: { courseId, chapters:[{key,cloudId,title,order,lessons:[{key,cloudId,title,order,content,codeExample,questions}]}], deleteChapterIds, deleteLessonIds }
function buildStructureOps(payload) {
  const ops = { chapterAdds: [], chapterUpdates: [], chapterDeletes: payload.deleteChapterIds || [],
    lessonAdds: [], lessonUpdates: [], lessonDeletes: payload.deleteLessonIds || [] };
  (payload.chapters || []).forEach((ch, i) => {
    if (ch.cloudId) {
      ops.chapterUpdates.push({ id: ch.cloudId, data: { title: ch.title, order: ch.order || i + 1 } });
    } else {
      ops.chapterAdds.push({ key: ch.key, data: { courseId: payload.courseId, title: ch.title, order: ch.order || i + 1 } });
    }
  });
  // 新章节下 lessonAdds 的 chapterId 为 null，由 index.js 用新建章节返回的 _id 回填
  (payload.chapters || []).forEach(ch => (ch.lessons || []).forEach((ls, j) => {
    const chapterId = ch.cloudId || null;
    const data = { title: ls.title, order: ls.order || j + 1,
      content: composeContent(ls.content), codeExample: ls.codeExample || '', questions: ls.questions || [] };
    if (ls.cloudId) ops.lessonUpdates.push({ id: ls.cloudId, data });
    else ops.lessonAdds.push({ key: ls.key, chapterKey: ch.key, chapterId: chapterId || null, data });
  }));
  return ops;
}
// payload: { courseId, learnUpdates:[{lessonId,questions}], chapterUpserts:[{lessonId,questions}], examUpserts:[{examType,level,questions}] }
function buildQuestionOps(payload) {
  const ops = { learnUpdates: [], chapterUpserts: [], examUpserts: [], errors: [] };
  (payload.learnUpdates || []).forEach(u => {
    if (!u.lessonId) ops.errors.push('学习题挂载知识点未入库');
    else ops.learnUpdates.push(u);
  });
  (payload.chapterUpserts || []).forEach(u => {
    if (!u.lessonId) ops.errors.push('章节题挂载知识点未入库');
    else ops.chapterUpserts.push(u);
  });
  (payload.examUpserts || []).forEach(u => ops.examUpserts.push(u));
  return ops;
}
module.exports = { composeContent, splitContent, buildStructureOps, buildQuestionOps };
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test content-workbench/tests/lib.test.js`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/importContent/lib.js content-workbench/tests/lib.test.js
git commit -m "feat: importContent 云函数纯逻辑（结构/题目 diff 计算）"
```

---

### Task 5: 两个云函数（index.js + 部署）

**Files:**
- Create: `cloudfunctions/importContent/index.js`
- Create: `cloudfunctions/importContent/package.json`
- Create: `cloudfunctions/getCourseTree/index.js`
- Create: `cloudfunctions/getCourseTree/package.json`

**Interfaces:**
- Consumes: Task 4 的 `lib.js`；集合结构（设计文档 §4.1）
- Produces: 云函数 `importContent`（入参见 lib 注释 + `password`、`mode`），返回 `{ success, results, idMap, errors }`；云函数 `getCourseTree`（入参 `{ password }`）返回 `{ success, courses:[…], exams:[…] }`

- [ ] **Step 1: 实现 importContent/index.js**

```js
const cloud = require('wx-server-sdk');
const { buildStructureOps, buildQuestionOps } = require('./lib');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 管理密码：部署后在云开发控制台 → 云函数 → 配置 → 环境变量 设置 ADMIN_PASSWORD
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// 连续失败锁定（实例内存计数）
let failCount = 0, lockedUntil = 0;
function authOk(password) {
  const now = Date.now();
  if (now < lockedUntil) return false;
  if (!ADMIN_PASSWORD) throw new Error('未配置 ADMIN_PASSWORD 环境变量');
  if (password === ADMIN_PASSWORD) { failCount = 0; return true; }
  failCount++;
  if (failCount >= 5) { lockedUntil = now + 10 * 60 * 1000; failCount = 0; }
  return false;
}

exports.main = async (event) => {
  try {
    if (!authOk(event.password)) return { success: false, message: '管理密码错误（连续错5次锁定10分钟）' };
    if (event.mode === 'structure') return await runStructure(event);
    if (event.mode === 'questions') return await runQuestions(event);
    return { success: false, message: 'mode 必须是 structure 或 questions' };
  } catch (err) {
    return { success: false, message: String(err.message || err) };
  }
};

async function runStructure(e) {
  const ops = buildStructureOps(e);
  const results = [], idMap = { chapters: {}, lessons: {} };
  for (const id of ops.lessonDeletes) { try { await db.collection('lessons').doc(id).remove(); } catch (err) { results.push({ op: 'del-lesson', id, ok: false, msg: err.message }); } }
  for (const id of ops.chapterDeletes) { try { await db.collection('chapters').doc(id).remove(); } catch (err) { results.push({ op: 'del-chapter', id, ok: false, msg: err.message }); } }
  for (const add of ops.chapterAdds) {
    try {
      const res = await db.collection('chapters').add({ data: { ...add.data, createdAt: db.serverDate() } });
      idMap.chapters[add.key] = res._id;
    } catch (err) { results.push({ op: 'add-chapter', ok: false, msg: err.message }); }
  }
  for (const add of ops.lessonAdds) {
    const chapterId = add.chapterId || idMap.chapters[add.chapterKey];
    if (!chapterId) { results.push({ op: 'add-lesson', ok: false, msg: '章节未入库：' + add.data.title }); continue; }
    try {
      const res = await db.collection('lessons').add({ data: { chapterId, ...add.data, createdAt: db.serverDate() } });
      idMap.lessons[add.key] = res._id;
    } catch (err) { results.push({ op: 'add-lesson', ok: false, msg: err.message }); }
  }
  for (const u of ops.chapterUpdates) { try { await db.collection('chapters').doc(u.id).update({ data: u.data }); } catch (err) { results.push({ op: 'upd-chapter', id: u.id, ok: false, msg: err.message }); } }
  for (const u of ops.lessonUpdates) { try { await db.collection('lessons').doc(u.id).update({ data: u.data }); } catch (err) { results.push({ op: 'upd-lesson', id: u.id, ok: false, msg: err.message }); } }
  return { success: true, results, idMap };
}

async function runQuestions(e) {
  const ops = buildQuestionOps(e);
  if (ops.errors.length) return { success: false, message: ops.errors.join('；') };
  const results = [];
  for (const u of ops.learnUpdates) {
    try { await db.collection('lessons').doc(u.lessonId).update({ data: { questions: u.questions } }); }
    catch (err) { results.push({ op: 'learn', id: u.lessonId, ok: false, msg: err.message }); }
  }
  for (const u of ops.chapterUpserts) {
    try {
      const exist = await db.collection('chapterQuestions').where({ courseId: e.courseId, lessonId: u.lessonId }).get();
      const lessonDoc = await db.collection('lessons').doc(u.lessonId).get();
      const chapterId = lessonDoc.data && lessonDoc.data.chapterId;
      if (exist.data && exist.data.length) {
        await db.collection('chapterQuestions').doc(exist.data[0]._id).update({ data: { questions: u.questions, updatedAt: db.serverDate() } });
      } else {
        await db.collection('chapterQuestions').add({ data: { courseId: e.courseId, chapterId, lessonId: u.lessonId, questions: u.questions, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
      }
    } catch (err) { results.push({ op: 'chapter', id: u.lessonId, ok: false, msg: err.message }); }
  }
  for (const u of ops.examUpserts) {
    try {
      const exist = await db.collection('examQuestions').where({ courseId: e.courseId, examType: u.examType, level: u.level }).get();
      if (exist.data && exist.data.length) {
        await db.collection('examQuestions').doc(exist.data[0]._id).update({ data: { questions: u.questions, updatedAt: db.serverDate() } });
      } else {
        await db.collection('examQuestions').add({ data: { courseId: e.courseId, examType: u.examType, level: u.level, questions: u.questions, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
      }
    } catch (err) { results.push({ op: 'exam', key: u.examType + '/' + u.level, ok: false, msg: err.message }); }
  }
  return { success: true, results };
}
```

- [ ] **Step 2: 实现 getCourseTree/index.js**

（`splitContent` 与 Task 4 lib.js 同实现，直接内联复制——云函数目录必须自包含。）

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function splitContent(s) {
  const out = { concept: '', feature: '', confusion: '' };
  const str = String(s || '');
  const m = str.match(/【概念】([\s\S]*?)(【特征】|$)/); if (m) out.concept = m[1].trim();
  const f = str.match(/【特征】([\s\S]*?)(【易混淆】|$)/); if (f) out.feature = f[1].trim();
  const cf = str.match(/【易混淆】([\s\S]*)$/); if (cf) out.confusion = cf[1].trim();
  if (!out.concept && !out.feature && !out.confusion && str) out.concept = str.trim();
  return out;
}

exports.main = async (event) => {
  if (!ADMIN_PASSWORD) return { success: false, message: '未配置 ADMIN_PASSWORD 环境变量' };
  if (event.password !== ADMIN_PASSWORD) return { success: false, message: '管理密码错误' };
  try {
    const chapters = (await db.collection('chapters').limit(1000).get()).data;
    const lessons = (await db.collection('lessons').limit(1000).get()).data;
    const chapterQ = (await db.collection('chapterQuestions').limit(1000).get()).data;
    const examQ = (await db.collection('examQuestions').limit(1000).get()).data;
    const cqByLesson = {};
    chapterQ.forEach(d => { cqByLesson[d.lessonId] = d.questions || []; });
    const byChapter = {};
    lessons.forEach(l => { (byChapter[l.chapterId] = byChapter[l.chapterId] || []).push(l); });
    const courses = {};
    chapters.forEach(c => {
      const cid = c.courseId;
      (courses[cid] = courses[cid] || { courseId: cid, chapters: [] }).chapters.push({
        id: c._id, title: c.title, order: c.order,
        lessons: (byChapter[c._id] || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(l => ({
          id: l._id, title: l.title, order: l.order, content: splitContent(l.content),
          codeExample: l.codeExample || '', questions: l.questions || [], chapterQuestions: cqByLesson[l._id] || []
        }))
      });
    });
    Object.values(courses).forEach(c => c.chapters.sort((a, b) => (a.order || 0) - (b.order || 0)));
    const exams = examQ.map(d => ({ courseId: d.courseId, examType: d.examType, level: d.level, questions: d.questions || [] }));
    return { success: true, courses: Object.values(courses), exams };
  } catch (err) {
    return { success: false, message: String(err.message || err) };
  }
};
```

- [ ] **Step 3: package.json（两个函数相同模板，name 各异）**

`cloudfunctions/importContent/package.json`：
```json
{
  "name": "importContent",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```
`cloudfunctions/getCourseTree/package.json` 同上，`name` 换成 `getCourseTree`（wx-server-sdk 版本与项目内现有云函数保持一致，执行时用 `Select-String -Path cloudfunctions/*/package.json -Pattern wx-server-sdk` 核对）。

- [ ] **Step 4: 本地静态检查**

Run: `node -e "new Function(require('fs').readFileSync('cloudfunctions/importContent/index.js','utf8'));" && node -e "new Function(require('fs').readFileSync('cloudfunctions/getCourseTree/index.js','utf8'));"`
Expected: 无输出（语法合法；wx-server-sdk 仅运行时需要，不本地安装）
Run: `node --test content-workbench/tests/`
Expected: 全部 PASS（回归）

- [ ] **Step 5: 部署（人工步骤，写进 README）**

微信开发者工具 → cloudfunctions 右键 `importContent` → 上传并部署（云端安装依赖）；`getCourseTree` 同样。控制台 → 云函数 → importContent → 配置 → 环境变量 添加 `ADMIN_PASSWORD=<管理密码>`；getCourseTree 同样。此步在 Task 12 的 README 中固化为操作说明。

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/importContent cloudfunctions/getCourseTree
git commit -m "feat: importContent/getCourseTree 云函数（密码鉴权+幂等写入）"
```

---

### Task 6: 页面骨架 + 连接层（index.html / style.css / app.js / cloud.js / ollama.js 检测）

**Files:**
- Create: `content-workbench/index.html`
- Create: `content-workbench/css/style.css`
- Create: `content-workbench/js/cloud.js`
- Create: `content-workbench/js/ollama.js`
- Create: `content-workbench/js/app.js`

**Interfaces:**
- Consumes: `WB.state`（Task 1）
- Produces: `WB.cloud.init()` / `WB.cloud.ensureLogin()` / `WB.cloud.call(name, data)` / `WB.cloud.pullTree(password)` / `WB.cloud.pushStructure(payload)` / `WB.cloud.pushQuestions(payload)`；`WB.ollama.check()` → `{ok, model}`、`WB.ollama.chat(messages, opts)` → string、`WB.ollama.extractJSON(text)` → 对象或 null；DOM 容器 id 约定：`wb-status-cloud`、`wb-status-ollama`、`wb-tab-structure`、`wb-tab-quiz`、`wb-tree`、`wb-workspace`、`wb-syncbar`

- [ ] **Step 1: index.html 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>课程内容工作台</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="wb-top">
  <span class="wb-title">课程内容工作台</span>
  <span id="wb-env" class="wb-env">cloud1-d5g4wtnsn6cc1b835</span>
</header>
<div id="wb-conn-strip" class="wb-conn-strip">
  <span id="wb-status-cloud" class="wb-chip">云端：检测中…</span>
  <span id="wb-status-ollama" class="wb-chip">本地模型：检测中…</span>
  <span id="wb-stat" class="wb-stat"></span>
</div>
<div id="wb-warn" class="wb-warn hidden"></div>
<nav class="wb-tabs">
  <button id="wb-tab-structure" class="wb-tab cur">① 结构与内容</button>
  <button id="wb-tab-quiz" class="wb-tab">② 题目</button>
</nav>
<main class="wb-main">
  <aside id="wb-tree" class="wb-tree"></aside>
  <section id="wb-workspace" class="wb-workspace"></section>
</main>
<footer class="wb-syncbar" id="wb-syncbar"></footer>
<script src="https://imgcache.qq.com/qcloud/cloudbase-js-sdk/1.7.2/cloudbase.full.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"></script>
<script src="js/state.js"></script>
<script src="js/parser.js"></script>
<script src="js/validate.js"></script>
<script src="js/ollama.js"></script>
<script src="js/cloud.js"></script>
<script src="js/tree-ui.js"></script>
<script src="js/content-ui.js"></script>
<script src="js/quiz-ui.js"></script>
<script src="js/sync.js"></script>
<script src="js/help.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```
（本任务先创建五份占位文件 `js/tree-ui.js`、`js/content-ui.js`、`js/quiz-ui.js`、`js/sync.js`、`js/help.js`，避免 404 与 app.js 报错；统一用下述模板，仅把 `treeUI` 换成对应全局名 `contentUI` / `quizUI` / `syncUI` / `helpUI`，后续任务逐个替换：

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.WB = root.WB || {}; root.WB.treeUI = factory(); }
})(typeof self !== 'undefined' ? self : this, function () { return { render: function () {} }; });
```

- [ ] **Step 2: style.css 基础样式**

类名全部 `wb-` 前缀；关键规则：
```css
:root { --wb-brand:#4B3FE3; --wb-brand-soft:#F2F7FF; --wb-text:#171717; --wb-muted:#52525B;
  --wb-border:rgba(23,23,23,.12); --wb-warn:#EFAA17; --wb-ok:#1DC981; --wb-err:#E5484D; }
* { box-sizing: border-box; }
body { margin:0; font:14px/20px "PingFang SC", system-ui, sans-serif; color:var(--wb-text); background:#F7F7F8; }
.hidden { display:none !important; }
.wb-top { display:flex; gap:8px; align-items:center; padding:10px 14px; background:#fff; border-bottom:1px solid var(--wb-border); }
.wb-env { font-size:12px; color:var(--wb-muted); border:1px solid var(--wb-border); border-radius:999px; padding:1px 10px; }
.wb-conn-strip { display:flex; flex-wrap:wrap; gap:8px; padding:8px 14px; background:#fff; border-bottom:1px solid var(--wb-border); align-items:center; }
.wb-chip { display:inline-flex; gap:6px; align-items:center; font-size:12px; border:1px solid var(--wb-border); border-radius:999px; padding:2px 10px; color:var(--wb-muted); }
.wb-chip::before { content:""; width:7px; height:7px; border-radius:50%; background:var(--wb-warn); }
.wb-chip.ok::before { background:var(--wb-ok); }
.wb-chip.err::before { background:var(--wb-err); }
.wb-stat { margin-left:auto; font-size:12px; color:var(--wb-muted); }
.wb-warn { margin:8px 14px; padding:8px 10px; border:1px solid var(--wb-warn); border-radius:8px; background:rgba(239,170,23,.1); font-size:12px; }
.wb-tabs { display:flex; gap:8px; padding:8px 14px; }
.wb-tab { border:1px solid var(--wb-border); background:#fff; border-radius:999px; padding:4px 14px; font-size:13px; cursor:pointer; color:var(--wb-muted); }
.wb-tab.cur { color:var(--wb-brand); background:var(--wb-brand-soft); border-color:var(--wb-brand); }
.wb-main { display:grid; grid-template-columns:260px 1fr; gap:12px; padding:0 14px 12px; min-height:70vh; }
.wb-tree, .wb-workspace { background:#fff; border:1px solid var(--wb-border); border-radius:10px; padding:12px; }
.wb-syncbar { display:flex; gap:8px; align-items:center; padding:10px 14px; background:#fff; border-top:1px solid var(--wb-border); }
.wb-btn { border:1px solid var(--wb-border); background:#fff; border-radius:8px; padding:5px 14px; font-size:13px; cursor:pointer; }
.wb-btn.primary { background:var(--wb-brand); color:#fff; border-color:var(--wb-brand); }
.wb-btn[disabled] { opacity:.5; cursor:not-allowed; }
@media (max-width:640px) { .wb-main { grid-template-columns:1fr; } }
```
后续任务的 UI 类（`wb-node`、`wb-qrow` 等）按需追加到本文件末尾。

- [ ] **Step 3: cloud.js**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.cloud = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const ENV = 'cloud1-d5g4wtnsn6cc1b835';
  let app = null;
  function init() {
    if (app) return app;
    app = cloudbase.init({ env: ENV });
    return app;
  }
  async function ensureLogin() {
    init();
    const auth = app.auth({ persistence: 'local' });
    if (!(await auth.hasLoginState())) await auth.signInAnonymously();
    return true;
  }
  async function call(name, data) {
    const res = await app.callFunction({ name, data });
    return res.result;
  }
  const pullTree = password => call('getCourseTree', { password });
  const pushStructure = payload => call('importContent', payload);
  const pushQuestions = payload => call('importContent', payload);
  return { init, ensureLogin, call, pullTree, pushStructure, pushQuestions };
});
```

- [ ] **Step 4: ollama.js**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.ollama = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const BASE = 'http://localhost:11434';
  async function check() {
    try {
      const r = await fetch(BASE + '/api/tags', { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      const first = j.models && j.models[0] && j.models[0].name;
      return { ok: true, model: first || '' };
    } catch (e) { return { ok: false, model: '' }; }
  }
  async function chat(messages, opts) {
    const o = opts || {};
    const base = { model: o.model || 'qwen3:4b', messages, stream: false };
    for (const extra of [{ think: false }, {}]) {   // 部分老版本 Ollama 不认 think 字段，400 后用无 think 参数重试
      try {
        const r = await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, base, extra)) });
        if (!r.ok) continue;
        const j = await r.json();
        return (j.message && j.message.content) || '';
      } catch (e) { /* 进入下一种参数组合 */ }
    }
    throw new Error('本地模型调用失败（Ollama 未运行或模型未拉取）');
  }
  function extractJSON(text) {
    let t = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '');
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1];
    const s = t.indexOf('{'), a = t.indexOf('[');
    const start = (s === -1) ? a : (a === -1 ? s : Math.min(s, a));
    if (start === -1) return null;
    const openCh = t[start], closeCh = openCh === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < t.length; i++) {
      if (t[i] === openCh) depth++;
      else if (t[i] === closeCh) { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)); } catch (e) { return null; } } }
    }
    return null;
  }
  return { check, chat, extractJSON };
});
```
注意：`extractJSON` 为纯函数，浏览器与 Node 通用。

- [ ] **Step 5: app.js（启动接线）**

```js
(function () {
  const $ = id => document.getElementById(id);
  let mode = 'structure';

  function setChip(el, ok, text) { el.textContent = text; el.classList.toggle('ok', !!ok); el.classList.toggle('err', ok === 'err'); }

  async function refreshConn() {
    try { await WB.cloud.ensureLogin(); setChip($('wb-status-cloud'), true, '云端：已连接（匿名）'); }
    catch (e) { setChip($('wb-status-cloud'), 'err', '云端：未连接'); showWarn('云端未连接：检查网络与控制台「匿名登录」是否已开启'); }
    const ol = await WB.ollama.check();
    if (ol.ok) { setChip($('wb-status-ollama'), true, '本地模型：' + (ol.model || '已连接')); }
    else { setChip($('wb-status-ollama'), false, '本地模型：未连接'); }
    refreshStat();
  }

  function showWarn(text) { const w = $('wb-warn'); w.textContent = text; w.classList.remove('hidden'); }
  function hideWarn() { $('wb-warn').classList.add('hidden'); }

  function refreshStat() {
    const d = WB.state.load();
    let chapters = 0, lessons = 0, qs = 0;
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => { chapters++; ch.lessons.forEach(ls => { lessons++; qs += (ls.questions || []).length + (ls.chapterQuestions || []).length; }); }));
    d.examQuestions.forEach(g => qs += g.questions.length);
    $('wb-stat').textContent = `草稿：章节 ${chapters} · 知识点 ${lessons} · 题目 ${qs}${d.savedAt ? ' · 保存于 ' + new Date(d.savedAt).toLocaleString() : ''}`;
  }

  function switchMode(m) {
    mode = m;
    $('wb-tab-structure').classList.toggle('cur', m === 'structure');
    $('wb-tab-quiz').classList.toggle('cur', m === 'quiz');
    WB.treeUI.render();
    WB.contentUI.render();
    WB.quizUI.render();
    WB.syncUI.render();
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('wb-tab-structure').onclick = () => switchMode('structure');
    $('wb-tab-quiz').onclick = () => switchMode('quiz');
    refreshConn();
    switchMode('structure');
    setInterval(refreshConn, 60000);
    window.WBRefreshStat = refreshStat;   // 各 UI 模块改草稿后调用
  });
})();
```
`syncUI.render()` 由 Task 11 实现前，占位 sync.js 返回 `{ render(){} }` 即可（本任务的占位文件已覆盖）。

- [ ] **Step 6: 手工验证**

Run: 浏览器直接打开 `content-workbench/index.html`（file://）
Expected: 顶部标题+环境标签；两枚状态芯片显示"检测中→云端：未连接（本地无匿名登录条件属正常）或已连接；本地模型：未连接"（Ollama 未装时）；两个页签可切换不报错；控制台无 404（占位文件已建）。若启动了 Ollama，则本地模型芯片变绿并显示模型名。

- [ ] **Step 7: Commit**

```bash
git add content-workbench/index.html content-workbench/css/style.css content-workbench/js/cloud.js content-workbench/js/ollama.js content-workbench/js/app.js content-workbench/js/tree-ui.js content-workbench/js/content-ui.js content-workbench/js/quiz-ui.js content-workbench/js/sync.js content-workbench/js/help.js
git commit -m "feat: 工作台页面骨架与云/本地模型连接层"
```

---

### Task 7: 结构树 UI tree-ui.js

**Files:**
- Modify: `content-workbench/js/tree-ui.js`（替换占位）
- Modify: `content-workbench/css/style.css`（末尾追加树样式）
- Modify: `content-workbench/js/app.js`（无改动则不提交）

**Interfaces:**
- Consumes: `WB.state`、全局函数 `WBRefreshStat()`
- Produces: `WB.treeUI.render()`、`WB.treeUI.getSelected()` → `{ courseId, chapterKey?, lessonKey? }` 或 null；选中变化时调用 `WB.contentUI.render()` 与 `WB.quizUI.render()`（存在时）

- [ ] **Step 1: 实现树渲染与 CRUD**

`content-workbench/js/tree-ui.js` 完整实现（章节级排序与 dropLesson 同模式，照抄实现 dropChapter）：
```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.treeUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  let selected = null;   // { courseId, chapterKey, lessonKey }
  const KNOWN = { 'python': 'python', 'cpp': 'cpp' };
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const draft = () => WB.state.load();

  function persist(d) { WB.state.save(d); render(); WBRefreshStat(); }
  const markForLesson = ls => WB.state.contentDone(ls) ? ['✓', 'ok'] : ['!', 'warn'];
  function markForChapter(ch) {
    if (!ch.lessons.length) return ['○', ''];
    return ch.lessons.every(WB.state.contentDone) ? ['✓', 'ok'] : ['!', 'warn'];
  }

  function nodeEl(title, level, ids, mark) {
    const el = document.createElement('div');
    el.className = 'wb-node ' + level;
    if (selected && level === 'lesson' && selected.lessonKey === ids.lessonKey) el.classList.add('cur');
    if (selected && level === 'chapter' && selected.chapterKey === ids.chapterKey && !selected.lessonKey) el.classList.add('cur');
    const t = document.createElement('span'); t.textContent = title; el.appendChild(t);
    if (mark && mark[0]) { const m = document.createElement('span'); m.className = 'mark ' + mark[1]; m.textContent = mark[0]; el.appendChild(m); }
    const edit = document.createElement('span'); edit.textContent = '✎'; edit.onclick = e => { e.stopPropagation(); rename(ids, level); };
    const del = document.createElement('span'); del.textContent = '✕'; del.onclick = e => { e.stopPropagation(); remove(ids, level); };
    el.appendChild(edit); el.appendChild(del);
    el.onclick = () => select(ids, level);
    return el;
  }

  function select(ids, level) {
    selected = level === 'lesson' ? ids
      : level === 'chapter' ? { courseId: ids.courseId, chapterKey: ids.chapterKey }
      : { courseId: ids.courseId };
    render();
    if (WB.contentUI) WB.contentUI.render();
    if (WB.quizUI) WB.quizUI.render();
  }

  function findNode(d, ids, level) {
    if (level === 'course') return d.tree[ids.courseId];
    const course = d.tree[ids.courseId];
    if (level === 'chapter') return course.chapters.find(x => x.key === ids.chapterKey);
    return course.chapters.find(x => x.key === ids.chapterKey).lessons.find(x => x.key === ids.lessonKey);
  }

  function rename(ids, level) {
    const d = draft();
    const node = findNode(d, ids, level);
    const title = prompt('新标题', node.title); if (!title) return;
    node.title = title; persist(d);
  }

  function remove(ids, level) {
    if (!confirm('确认删除？已入库的节点将在下次「同步结构与内容」时从云端删除。')) return;
    const d = draft();
    const course = d.tree[ids.courseId];
    if (level === 'lesson') {
      const ch = course.chapters.find(x => x.key === ids.chapterKey);
      const i = ch.lessons.findIndex(x => x.key === ids.lessonKey);
      const ls = ch.lessons[i];
      if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId });
      ch.lessons.splice(i, 1); reOrder(ch.lessons);
      if (selected && selected.lessonKey === ids.lessonKey) selected = null;
    } else if (level === 'chapter') {
      const i = course.chapters.findIndex(x => x.key === ids.chapterKey);
      const ch = course.chapters[i];
      if (ch.cloudId) (d._deletedChapters = d._deletedChapters || []).push({ cloudId: ch.cloudId });
      ch.lessons.forEach(ls => { if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId }); });
      course.chapters.splice(i, 1); reOrder(course.chapters);
    } else { delete d.tree[ids.courseId]; }
    persist(d);
  }

  function addCourse(name) {
    const d = draft();
    const id = KNOWN[String(name).toLowerCase()] || 'course-' + uid('x');
    if (d.tree[id]) { alert('该学科已存在'); return; }
    if (!KNOWN[id]) alert('新学科：需在小程序 app.js 的 globalData.courses 添加配置后学生端才可见');
    d.tree[id] = { name, chapters: [] };
    persist(d);
  }

  function addChapter(courseId) {
    const title = prompt('章节标题'); if (!title) return;
    const d = draft();
    d.tree[courseId].chapters.push({ key: uid('c'), cloudId: null, title, order: d.tree[courseId].chapters.length + 1, lessons: [] });
    persist(d);
  }

  function addLesson(courseId, chapterKey) {
    const title = prompt('知识点标题'); if (!title) return;
    const d = draft();
    const ch = d.tree[courseId].chapters.find(x => x.key === chapterKey);
    ch.lessons.push({ key: uid('l'), cloudId: null, chapterKey, title, order: ch.lessons.length + 1,
      content: { concept: '', feature: '', confusion: '' }, codeExample: '', questions: [], chapterQuestions: [] });
    persist(d);
  }

  const reOrder = list => list.forEach((x, i) => x.order = i + 1);

  function dropLesson(draggedJson, target) {
    const src = JSON.parse(draggedJson);
    if (src.chapterKey !== target.chapterKey) { alert('仅支持同章节内调整顺序'); return; }
    if (src.lessonKey === target.lessonKey) return;
    const d = draft();
    const ch = d.tree[src.courseId].chapters.find(x => x.key === src.chapterKey);
    const from = ch.lessons.findIndex(x => x.key === src.lessonKey);
    const to = ch.lessons.findIndex(x => x.key === target.lessonKey);
    const [moved] = ch.lessons.splice(from, 1);
    ch.lessons.splice(to, 0, moved);
    reOrder(ch.lessons);
    persist(d);
  }

  function render() {
    const d = draft();
    const host = document.getElementById('wb-tree');
    host.innerHTML = '';
    Object.entries(d.tree).forEach(([courseId, c]) => {
      host.appendChild(nodeEl(c.name, 'course', { courseId }, ['']));
      const addCh = document.createElement('button'); addCh.className = 'wb-btn'; addCh.textContent = '＋章节';
      addCh.onclick = () => addChapter(courseId); host.appendChild(addCh);
      c.chapters.forEach(ch => {
        host.appendChild(nodeEl(ch.title + (ch.cloudId ? '' : ' ○'), 'chapter', { courseId, chapterKey: ch.key }, markForChapter(ch)));
        const addLs = document.createElement('button'); addLs.className = 'wb-btn'; addLs.textContent = '＋知识点';
        addLs.onclick = () => addLesson(courseId, ch.key); host.appendChild(addLs);
        ch.lessons.forEach(ls => {
          const el = nodeEl(ls.title + (ls.cloudId ? '' : ' ○'), 'lesson', { courseId, chapterKey: ch.key, lessonKey: ls.key }, markForLesson(ls));
          el.draggable = true;
          el.ondragstart = e => e.dataTransfer.setData('text/plain', JSON.stringify({ courseId, chapterKey: ch.key, lessonKey: ls.key }));
          el.ondragover = e => e.preventDefault();
          el.ondrop = e => { e.preventDefault(); dropLesson(e.dataTransfer.getData('text/plain'), { courseId, chapterKey: ch.key, lessonKey: ls.key }); };
          host.appendChild(el);
        });
      });
    });
    const addCourseBtn = document.createElement('button');
    addCourseBtn.className = 'wb-btn'; addCourseBtn.textContent = '＋学科';
    addCourseBtn.onclick = () => { const n = prompt('学科名称'); if (n) addCourse(n); };
    host.appendChild(addCourseBtn);
    if (WB.syncUI && WB.syncUI.pull) {
      const pull = document.createElement('button');
      pull.className = 'wb-btn'; pull.textContent = '从云端拉取';
      pull.onclick = () => WB.syncUI.pull();
      host.appendChild(pull);
    }
  }

  function getSelected() { return selected; }
  return { render, getSelected };
});
```

- [ ] **Step 2: 追加样式**

`content-workbench/css/style.css` 末尾：
```css
.wb-node { display:flex; align-items:center; gap:6px; padding:3px 8px; border-radius:6px; font-size:13px; cursor:pointer; min-height:26px; }
.wb-node:hover { background:var(--wb-brand-soft); }
.wb-node.cur { background:var(--wb-brand-soft); color:var(--wb-brand); }
.wb-node.lesson { padding-left:26px; color:var(--wb-muted); }
.wb-node .mark { margin-left:auto; font-size:12px; }
.wb-node .mark.ok { color:var(--wb-ok); } .wb-node .mark.warn { color:var(--wb-warn); }
```

- [ ] **Step 3: 手工验证**

浏览器打开页面：
1. 点「＋学科」输入 Python → 树出现 Python 节点；再「＋章节」「＋知识点」逐级添加
2. 点节点 → 右侧工作区（占位）不报错；点 ✎ 改名生效
3. 刷新页面 → 树还在（localStorage 生效）；底部统计条数字变化
4. 拖动两个知识点互换 → order 重排（刷新后顺序保持）

- [ ] **Step 4: Commit**

```bash
git add content-workbench/js/tree-ui.js content-workbench/css/style.css
git commit -m "feat: 结构树手动管理（增删改/拖拽排序/状态标记）"
```

---

### Task 8: 素材输入与三段内容编辑 content-ui.js

**Files:**
- Modify: `content-workbench/js/content-ui.js`（替换占位）
- Modify: `content-workbench/css/style.css`（追加）

**Interfaces:**
- Consumes: `WB.parser.parseMaterial/parseQuestionLine`（用于纯文本路径预估统计）、`WB.state`、`WB.treeUI.getSelected()`
- Produces: `WB.contentUI.render()`；DOM：素材 textarea（id `wb-material`）、文件拖放区（`wb-drop`）、「开始 AI 整理」按钮（`wb-run-ai`，调 `WB.aiFlow.run(material, opts)`——由 Task 9 提供，本任务先判 `WB.aiFlow` 不存在则禁用）、四编辑框（`wb-edit-concept/feature/confusion/code`）

- [ ] **Step 1: 实现内容编辑区**

选中知识点 → 渲染四个 `<textarea>`（概念/特征/易混淆/代码），input 事件防抖 500ms 写回草稿 `content` 与 `codeExample` 并调 `WBRefreshStat()`；每框右上角字数（>60 加 `over` 黄底）；未选中知识点显示「先在左侧选择知识点」。粘贴素材框 + 拖放区：

```js
// 文件处理（拖放与 <input type=file> 共用）
async function handleFile(file) {
  const text = file.name.toLowerCase().endsWith('.docx')
    ? (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
    : file.name.toLowerCase().endsWith('.txt') ? await file.text()
    : null;
  if (text === null) { alert('仅支持 .docx 与 .txt'); return; }
  document.getElementById('wb-material').value = text;
  updateStats();
}
```
「开始 AI 整理」按钮：整树模式（素材全量）与填空模式（仅当前知识点）二选一 radio；按钮 onclick 调 `WB.aiFlow.run(material, { fillOnly: mode==='fill', lessonKey: WB.treeUI.getSelected() && WB.treeUI.getSelected().lessonKey })`（Task 9 实现的入口名，占位期按钮禁用并提示"AI 模块加载中"）。

- [ ] **Step 2: 手工验证**

1. 选中知识点 → 四框出现，编辑概念文字 → 刷新页面内容保留；>60 字黄底
2. 拖一个 .txt 到拖放区 → 素材框出现文本；统计条预估章节数变化；拖 .pdf → 提示不支持
3. 「开始 AI 整理」按钮当前禁用态可见

- [ ] **Step 3: Commit**

```bash
git add content-workbench/js/content-ui.js content-workbench/css/style.css
git commit -m "feat: 素材输入（粘贴/Word/TXT）与三段内容编辑"
```

---

### Task 9: Ollama AI 流程（整树/填空转换 + 待处理）

**Files:**
- Modify: `content-workbench/js/ollama.js`（增加对话流程函数）
- Create: `content-workbench/js/ai-flow.js`（新文件，index.html 在 parser.js 后追加 `<script src="js/ai-flow.js"></script>`）
- Modify: `content-workbench/index.html`（引入 ai-flow.js）
- Test: `content-workbench/tests/aiflow.test.js`（纯函数部分）

**Interfaces:**
- Consumes: `WB.ollama.chat/extractJSON`、`WB.parser.parseMaterial/mergeIntoDraft`（本任务在 parser.js 补充 `mergeIntoDraft(draft, parsed, defaultCourseId)`）、`WB.contentUI`（完成后刷新）
- Produces: `WB.aiFlow.run(materialText, { fillOnly, lessonKey })` → Promise<{ ok, added, pending }>；`WB.parser.mergeIntoDraft(draft, parsed, defaultCourseId)` → draft（同名章节/知识点合并填充空段，题目追加，examGroups 合并进 draft.examQuestions）

- [ ] **Step 1: 写 mergeIntoDraft 失败测试**

`content-workbench/tests/aiflow.test.js`：
```js
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
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test content-workbench/tests/aiflow.test.js`
Expected: FAIL（mergeIntoDraft 不存在）

- [ ] **Step 3: 实现 mergeIntoDraft（追加到 parser.js，并把末尾 return 行改为 `return { parseMaterial, parseQuestionLine, composeContent, splitContent, mergeIntoDraft };`）**

```js
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function mergeIntoDraft(draft, parsed, defaultCourseId) {
  const courseId = defaultCourseId || 'python';
  if (!draft.tree[courseId]) draft.tree[courseId] = { name: parsed.course || courseId, chapters: [] };
  const course = draft.tree[courseId];
  if (parsed.course && !course.name) course.name = parsed.course;
  parsed.chapters.forEach(pch => {
    let ch = course.chapters.find(x => x.title === pch.title);
    if (!ch) { ch = { key: uid('c'), cloudId: null, title: pch.title, order: course.chapters.length + 1, lessons: [] }; course.chapters.push(ch); }
    pch.lessons.forEach(pls => {
      let ls = ch.lessons.find(x => x.title === pls.title);
      if (!ls) { ls = { key: uid('l'), cloudId: null, chapterKey: ch.key, title: pls.title, order: ch.lessons.length + 1,
        content: { concept: '', feature: '', confusion: '' }, codeExample: '', questions: [], chapterQuestions: [] }; ch.lessons.push(ls); }
      ['concept', 'feature', 'confusion'].forEach(k => { if (!ls.content[k] && pls[k]) ls.content[k] = pls[k]; });
      if (!ls.codeExample && pls.code) ls.codeExample = pls.code;
      pls.questions.forEach(q => ls.questions.push(q));
      pls.chapterQuestions.forEach(q => ls.chapterQuestions.push(q));
    });
  });
  parsed.examGroups.forEach(pg => {
    let g = draft.examQuestions.find(x => x.courseId === courseId && x.examType === pg.examType && x.level === pg.level);
    if (!g) { g = { courseId, examType: pg.examType, level: pg.level, questions: [] }; draft.examQuestions.push(g); }
    g.questions.push(...pg.questions);
  });
  return draft;
}
```
（`uid` 为模块内自带的局部实现，不依赖 `WB.state`，保证 Node 测试环境可用。）

- [ ] **Step 4: 运行确认通过**

Run: `node --test content-workbench/tests/`
Expected: 全部 PASS

- [ ] **Step 5: 实现 ai-flow.js（浏览器侧流程）**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.aiFlow = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const STRUCT_PROMPT = `你是课程结构转换器。把用户素材转换为严格 JSON，只输出 JSON 不要解释。结构：
{"course":"学科名","chapters":[{"title":"…","lessons":[{"title":"…","concept":"≤60字","feature":"≤60字","confusion":"≤60字","code":"…","questions":[题],"chapterQuestions":[题],"examGroups":[{"examType":"…","level":"…","questions":[题]}]}]}]}
题对象：{"type":"choice","question":"…","options":{"A":"…","B":"…","C":"…","D":"…"},"answer":"B","explanation":"…"} 或 {"type":"fill","question":"…","answer":"…","explanation":"…"}
【学习题】→questions；【章节题】→chapterQuestions；【考试题】→examGroups。无法识别的行放入顶层 "pending":[原文]，不要猜测。`;
  const FILL_PROMPT = `把用户素材整理为一个知识点的速记 JSON，只输出 JSON：{"title":"标题","concept":"≤60字","feature":"≤60字","confusion":"≤60字","code":"…"}`;

  async function run(materialText, opts) {
    const o = opts || {};
    const d = WB.state.load();
    const target = o.lessonKey ? findLesson(d, o.lessonKey) : null;
    const messages = [
      { role: 'system', content: target ? FILL_PROMPT : STRUCT_PROMPT },
      { role: 'user', content: materialText }
    ];
    let out = '';
    try { out = await WB.ollama.chat(messages, { model: 'qwen3:4b' }); }
    catch (e) { out = await WB.ollama.chat(messages, { model: 'qwen2.5:3b' }); }
    const obj = WB.ollama.extractJSON(out);
    if (!obj) { alert('本地模型未返回可解析的 JSON，请重试或改用手动编辑'); return { ok: false }; }
    if (target) {
      ['concept', 'feature', 'confusion'].forEach(k => { if (obj[k] && !target.content[k]) target.content[k] = String(obj[k]); });
      if (obj.code && !target.codeExample) target.codeExample = String(obj.code);
    } else {
      const sel = WB.treeUI.getSelected();
      const courseId = (sel && sel.courseId) || 'python';
      const parsed = { course: obj.course || '', chapters: obj.chapters || [], examGroups: collectExams(obj), pending: obj.pending || [] };
      WB.parser.mergeIntoDraft(d, parsed, courseId);
    }
    WB.state.save(d);
    WB.treeUI.render(); WB.contentUI.render(); WBRefreshStat();
    return { ok: true, pending: obj.pending || [] };
  }
  function collectExams(obj) {   // 模型可能把 examGroups 放在每课里，统一收拢
    const groups = [];
    (obj.chapters || []).forEach(ch => (ch.lessons || []).forEach(ls => (ls.examGroups || []).forEach(g => groups.push(g))));
    return groups;
  }
  function findLesson(d, key) {
    for (const c of Object.values(d.tree)) for (const ch of c.chapters) { const ls = ch.lessons.find(x => x.key === key); if (ls) return ls; }
    return null;
  }
  return { run };
});
```
同时把 content-ui.js 的「开始 AI 整理」按钮接上 `WB.aiFlow.run(...)`（去掉禁用占位）。

- [ ] **Step 6: 手工验证（需本机装好 Ollama）**

1. 素材框粘贴一小段按模板写的文本 → 点「开始 AI 整理」→ 树上出现章节/知识点，右侧三段被填充
2. 未启动 Ollama 时点击 → 明确报错提示，不崩溃
3. `node --test content-workbench/tests/` 全绿（回归）

- [ ] **Step 7: Commit**

```bash
git add content-workbench/js/ai-flow.js content-workbench/js/ollama.js content-workbench/js/parser.js content-workbench/js/content-ui.js content-workbench/index.html content-workbench/tests/aiflow.test.js
git commit -m "feat: 本地模型转换流程（整树/填空 + 草稿合并）"
```

---

### Task 10: 题目管理 UI quiz-ui.js

**Files:**
- Modify: `content-workbench/js/quiz-ui.js`（替换占位）
- Modify: `content-workbench/css/style.css`（追加表格样式）

**Interfaces:**
- Consumes: `WB.state`、`WB.validate`、`WB.treeUI.getSelected()`、`WB.aiFlow`（现编）
- Produces: `WB.quizUI.render()`；表格行状态与 canonical 题对象的互转（渲染剔除 UI 字段，编辑写回草稿）

- [ ] **Step 1: 实现题目表格**

数据源合并三处为行列表：当前知识点 `ls.questions`（target=learn）、`ls.chapterQuestions`（target=chapter）、`draft.examQuestions`（target=exam）。列：题型/题干/选项/答案/解析/归属/状态/操作。行内编辑用 input/select 直接绑定写回；操作列：删除、「跳过」toggle。归属列：learn/chapter 行显示知识点下拉（树中有 cloudId 或草稿 key 的知识点），exam 行显示 考试类型+级别 两个下拉（CIE/GESP/CSP-J；级别 一级/二级/三级/入门级，可输入新值）。
硬校验按钮（同步前自动跑）：`WB.validate.validateQuestion` 错误行标红并在行首显示错误文案；`rowStatus:'error'`。
去重按钮：调 `WB.validate.markDuplicates(rows, existingQuestionsFromPull)`（existing 来自 Task 11 的拉取快照，存 `WB.syncUI.existing()`；未拉取时提示先拉取）。

- [ ] **Step 2: 三种来源入口**

- 「粘贴题目素材」小框 + 解析按钮：`WB.parser.parseMaterial` 的题目部分入行（按标记分拣 target）
- 「基于本知识点现编」：数量下拉 2/3/5 → 调 `WB.ollama.chat`（提示词：设计文档 §8.3，注入当前知识点三段）→ extractJSON → 入行为 `target:'chapter'`，`rowStatus:'confirm'`
- 「＋题目」手动表单：题干/四选项/答案/解析/类型 → 入行

前置约束：选中知识点 `contentDone` 为假时三种入口上方黄条提示「先完成知识点内容」，入口仍可见但现编按钮禁用。

- [ ] **Step 3: 手工验证**

1. 选中已有内容的知识点 → 表格出现其学习题/章节题行；改答案 → 刷新后保留
2. 手动加一道缺 C 选项的选择题 → 校验后行标红显示「选项C为空」
3. 现编（Ollama 运行时）→ 生成 3 行 confirm 状态
4. 考试题行改级别 → draft.examQuestions 对应组移动（合并到已有组）

- [ ] **Step 4: Commit**

```bash
git add content-workbench/js/quiz-ui.js content-workbench/css/style.css
git commit -m "feat: 题目校对表格（三来源/行内编辑/归属/校验标记）"
```

---

### Task 11: 拉取与两阶段同步 sync.js

**Files:**
- Modify: `content-workbench/js/sync.js`（替换占位）
- Modify: `content-workbench/css/style.css`（追加弹层样式）

**Interfaces:**
- Consumes: `WB.cloud`、`WB.state`、`WB.parser.mergeIntoDraft`、`WB.quizUI.render`
- Produces: `WB.syncUI.render()`（底部同步栏：两个同步按钮+拉取按钮）、`WB.syncUI.pull()`、`WB.syncUI.existing()` → 拉取快照的题目数组（去重用）、`WB.syncUI.syncStructure()`、`WB.syncUI.syncQuestions()`

- [ ] **Step 1: 实现拉取合并**

`pull()`：`WB.cloud.pullTree(draft.password)` → 遍历 `courses`，把云端章节/知识点合并进草稿（匹配 title → 写入 cloudId 并补空段；不覆盖本地非空内容；云端 chapterQuestions 并入 `ls.chapterQuestions`），`exams` 并入 `draft.examQuestions`（带 cloudId 标记 `_pulled:true`）。存快照 `WB.syncUI._snapshot`。合并后保存草稿并刷新全部 UI。
密码为空时先 `prompt` 输入并存草稿。

- [ ] **Step 2: 实现 syncStructure()**

组装 payload（结构与 lib.js 注释一致）：
```js
function buildStructurePayload(d) {
  const payloads = [];
  Object.entries(d.tree).forEach(([courseId, c]) => {
    payloads.push({
      mode: 'structure', password: d.password, courseId,
      chapters: c.chapters.map(ch => ({
        key: ch.key, cloudId: ch.cloudId, title: ch.title, order: ch.order,
        lessons: ch.lessons.map(ls => ({
          key: ls.key, cloudId: ls.cloudId, title: ls.title, order: ls.order,
          content: ls.content, codeExample: ls.codeExample, questions: ls.questions || []
        }))
      })),
      deleteChapterIds: (d._deletedChapters || []).map(x => x.cloudId).filter(Boolean),
      deleteLessonIds: (d._deletedLessons || []).map(x => x.cloudId).filter(Boolean)
    });
  });
  return payloads;
}
```
（tree-ui 删除已入库节点时，把该节点 push 进 `draft._deletedChapters/_deletedLessons` 并从树移除。）
流程：先本地跑确认清单（数新增/更新/删除）→ `confirm()` → 逐 courseId 调 `WB.cloud.pushStructure` → 用返回 `idMap` 回填草稿 cloudId → 清空删除暂存 → 保存 → 展示报告（成功数/失败明细 + 「仅重试失败项」= 重发失败的那次 payload）→ 自动 `pull()`。

- [ ] **Step 3: 实现 syncQuestions()**

按 courseId 分组生成 payload（多学科各自成包，examQuestions 是全量替换语义：payload 数组 = 草稿当前数组（拉取合并+新增-跳过），幂等）：
```js
function buildQuestionsPayloads(d) {
  const payloads = [];
  Object.entries(d.tree).forEach(([courseId, c]) => {
    const learnUpdates = [], chapterUpserts = [];
    c.chapters.forEach(ch => ch.lessons.forEach(ls => {
      if (!ls.cloudId) return;                      // 未入库知识点：表格行已标红，这里跳过
      if ((ls.questions || []).length) learnUpdates.push({ lessonId: ls.cloudId, questions: ls.questions });
      if ((ls.chapterQuestions || []).length) chapterUpserts.push({ lessonId: ls.cloudId, questions: ls.chapterQuestions });
    }));
    const examUpserts = d.examQuestions.filter(g => g.courseId === courseId)
      .map(g => ({ examType: g.examType, level: g.level, questions: g.questions }));
    if (learnUpdates.length || chapterUpserts.length || examUpserts.length) {
      payloads.push({ mode: 'questions', password: d.password, courseId, learnUpdates, chapterUpserts, examUpserts });
    }
  });
  return payloads;
}
```
流程同 Step 2：确认清单（学习题 N、章节题 M、考试组 K）→ 逐 payload 调 `WB.cloud.pushQuestions` → 报告。

- [ ] **Step 4: 手工验证（需已部署云函数+配置密码）**

1. 「从云端拉取」→ 树上节点显示 cloudId（控制台或代码断点确认），统计条更新
2. 加一个新知识点 → 「同步结构与内容」→ 确认弹层 → 完成后微信开发者工具云开发控制台 `lessons` 集合出现新文档，`content` 以【概念】开头
3. 给该知识点加一道学习题+一道章节题 → 「同步题目」→ `lessons.questions` 与 `chapterQuestions` 出现数据
4. 小程序「章节」页看到新知识点与题目（学生端零改动验证）

- [ ] **Step 5: Commit**

```bash
git add content-workbench/js/sync.js content-workbench/css/style.css content-workbench/js/tree-ui.js
git commit -m "feat: 云端拉取合并与两阶段同步（幂等+报告+回填）"
```

---

### Task 12: 帮助/备份 + 启动脚本 + 开源文档收尾

**Files:**
- Modify: `content-workbench/js/help.js`（替换占位）
- Modify: `content-workbench/index.html`（顶部加 `<span id="wb-tools"></span>` 工具按钮容器）
- Modify: `content-workbench/js/app.js`（DOMContentLoaded 里调 `WB.help.mount()`）
- Create: `content-workbench/启动本地模型.bat`
- Create: `content-workbench/README.md`
- Create: `content-workbench/docs/素材模板.md`
- Create: `content-workbench/docs/网页AI指令.md`

**Interfaces:**
- Consumes: `WB.state`（备份导出/导入）
- Produces: `WB.help.renderHelp(container)`（F9 帮助区）、`WB.help.exportBackup()`、`WB.help.importBackup(file)`

- [ ] **Step 1: help.js（模板常量+复制+备份）**

素材模板全文（设计文档 §5.1）、网页 AI 指令全文（§8 上游指令：把网上教程按模板整理输出）、部署引导（§7.1 九步）、故障排查表（§7.6）作为常量嵌入；`navigator.clipboard.writeText` + 兼容 textarea 选中复制；导出：`Blob` + `a.download='backup-'+ts+'.json'`；导入：file input → JSON.parse → 校验 `version===1` → `WB.state.save` → 刷新 UI。顶部工具区加「帮助」「导出备份」「导入备份」三个按钮（index.html 顶部 `<span>` 容器 id `wb-tools`，app.js 初始化时调 `WB.help.mount()`）。

- [ ] **Step 2: 启动本地模型.bat**

```bat
@echo off
chcp 65001 >nul
set OLLAMA_ORIGINS=*
echo 正在启动本地模型服务（Ollama，允许云端网页访问）...
start "ollama" /min cmd /c "ollama serve"
timeout /t 3 /nobreak >nul
ollama list
echo 若上方列出模型名即已就绪；此窗口可关闭，服务在后台运行。
pause
```

- [ ] **Step 3: README.md**

按设计文档 §12 大纲写实文：项目简介、适合谁、部署 9 步（装 Ollama → 拉模型 → 双击 bat → 开静态托管 → 传 index.html+css+js 文件夹 → 开匿名登录 → 部署两个云函数 → 控制台配 ADMIN_PASSWORD 环境变量 → 打开网址验证两盏灯）、日常四流程（7.2~7.5）、常见问题（7.6）、自定义（改 ENV 常量、加学科、改提示词）。

- [ ] **Step 4: docs/素材模板.md 与 docs/网页AI指令.md**

从设计文档 §5.1 与 help.js 常量同步成文，含一个完整 Python 示例。

- [ ] **Step 5: 全量回归与端到端验收**

Run: `node --test content-workbench/tests/`
Expected: 全部 PASS
浏览器全流程手工验收（对应设计文档 7.2/7.4）：
1. 复制 AI 指令 → 粘贴素材 → AI 整理 → 校对 → 同步结构 → 同步题目
2. 小程序学生端三步验证（章节页/学习页三段速记/习题页新题）
3. 「导出备份」下载 JSON → 清空 localStorage → 「导入备份」恢复

- [ ] **Step 6: Commit**

```bash
git add content-workbench
git commit -m "feat: 帮助与备份、启动脚本、开源文档（工作台交付完成）"
```

---

## 部署顺序提醒（执行完所有任务后）

1. 微信开发者工具上传部署 `importContent` / `getCourseTree`（云端安装依赖）
2. 控制台为两个云函数配置环境变量 `ADMIN_PASSWORD`
3. 云开发控制台开通静态托管 → 上传 `content-workbench/` 内 index.html + css/ + js/（docs/ 与 tests/ 不上传）
4. 控制台开启匿名登录
5. 打开托管网址，输入管理密码，两盏连接灯变绿
