const test = require('node:test');
const assert = require('node:assert');
const help = require('../js/help.js');

test('帮助面板首屏是「新手上路」步骤卡片', () => {
  const secs = help.SECTIONS();
  assert.equal(secs[0].kind, 'steps');
  assert.match(secs[0].title, /新手上路/);
  const g = secs[0].data;
  assert.ok(g.steps.length >= 3, '至少三步');
  g.steps.forEach(s => {
    assert.ok(s.t, '每步要有标题');
    assert.ok(s.lines && s.lines.length, '每步要有步骤说明');
  });
});

test('两条链路都要写清「先去找资料」，不能只讲点哪个按钮', () => {
  const g = help.START_GUIDE;
  assert.ok(g.pre.indexOf('不会凭空写教材') >= 0, '开头要点明 AI 不会凭空产出');
  const tree = g.steps.find(s => /整门课的大纲/.test(s.t));
  const fill = g.steps.find(s => /补齐每个知识点/.test(s.t));
  [tree, fill].forEach(s => {
    const txt = (s.lines || []).join('');
    assert.ok(/网上|搜索|搜/.test(txt), '这一步缺少「去网上找资料」：' + s.t);
    assert.ok(/素材框/.test(txt), '这一步缺少「贴进素材框」：' + s.t);
  });
});

test('步骤文案覆盖两条 AI 链路的关键操作', () => {
  const txt = JSON.stringify(help.START_GUIDE);
  ['整树模式', '填空模式', '开始 AI 整理', '解析入树', '同步结构与内容'].forEach(k => {
    assert.ok(txt.indexOf(k) >= 0, '缺少关键操作：' + k);
  });
});

test('部署步骤已从帮助面板移除，改指向 DEPLOYMENT.md', () => {
  const txt = JSON.stringify(help.SECTIONS());
  assert.ok(txt.indexOf('部署步骤') < 0, '不应再有独立的部署章节');
  assert.ok(txt.indexOf('DEPLOYMENT.md') >= 0, '应指向 DEPLOYMENT.md');
  assert.ok(txt.indexOf('ollama pull') < 0, '不应再出现部署命令行');
});

test('内置学科约定写进了帮助文案', () => {
  const txt = JSON.stringify(help.SECTIONS());
  assert.ok(txt.indexOf('内置') >= 0);
  assert.ok(txt.indexOf('不可删改') >= 0 || txt.indexOf('不能删') >= 0);
});

test('模板逐行解释覆盖三种题目归属', () => {
  const keys = help.TEMPLATE_EXPLAIN.map(r => r[0]).join('|');
  ['学习题', '章节题', '考试题'].forEach(k => assert.ok(keys.indexOf(k) >= 0, '缺少：' + k));
});

test('素材模板里不再出现考试题（考试题是独立实体）', () => {
  [help.TEMPLATE_SKELETON, help.TEMPLATE_FULL].forEach((t, i) => {
    assert.ok(t.indexOf('【考试题】') < 0, '第 ' + (i + 1) + ' 份模板仍含【考试题】');
    assert.ok(t.indexOf('GESP') < 0, '第 ' + (i + 1) + ' 份模板仍含考试类型');
  });
  assert.ok(help.AI_INSTRUCTION.indexOf('不要生成考试题') >= 0, 'AI 指令应明确禁止生成考试题');
});

test('完整实例够完整：至少 3 章、6 个知识点、含学习题与章节题', () => {
  const t = help.TEMPLATE_FULL;
  const nCh = (t.match(/^## /gm) || []).length;
  const nLs = (t.match(/^### /gm) || []).length;
  assert.ok(nCh >= 3, '章节数只有 ' + nCh);
  assert.ok(nLs >= 6, '知识点数只有 ' + nLs);
  assert.ok(t.indexOf('【学习题】') >= 0);
  assert.ok(t.indexOf('【章节题】') >= 0);
  // 每个知识点都要有完整三段速记
  (t.match(/^### /gm) || []).forEach(() => {});
  ['【概念】', '【特征】', '【易混淆】'].forEach(k => assert.ok(t.indexOf(k) >= 0));
});

test('AI 指令拆成了「人看的用法」+「AI 看的原文」两份', () => {
  assert.ok(help.AI_INSTRUCTION.indexOf('【待整理内容】') >= 0, 'AI 原文要有待整理内容区');
  assert.ok(help.AI_INSTRUCTION.indexOf('【输出格式】') >= 0, 'AI 原文要有输出格式块');
  assert.ok(help.SECTIONS().some(s => /提示词/.test(s.title)), '帮助面板要有提示词一节');
});

test('提示词是四象限：2 种产物 × 2 条入库路线，且每格都有内容', () => {
  ['outline', 'lesson'].forEach(w => {
    ['parse', 'local'].forEach(r => {
      const p = help.PROMPTS[w][r];
      assert.ok(p && p.length > 80, w + '/' + r + ' 的提示词为空或过短');
      assert.ok(/粘贴在这里/.test(p), w + '/' + r + ' 缺少让用户粘资料的位置');
    });
  });
  assert.equal(Object.keys(help.ROUTES).length, 2);
  Object.values(help.ROUTES).forEach(r => {
    assert.ok(r.name && r.when, '路线缺名称/适用场景');
    assert.ok(r.steps.length >= 4, '路线步骤少于 4 步');
    assert.ok(r.good && r.bad, '路线要有好处与注意事项');
  });
});

test('严格要求格式的提示词 vs 只要内容的提示词，口径要分明', () => {
  // parse 路线：AI 必须照模板输出，回来直接解析
  [help.PROMPTS.outline.parse, help.PROMPTS.lesson.parse].forEach(p => {
    assert.ok(p.indexOf('【输出格式】') >= 0, 'parse 版要有输出格式块');
    assert.ok(p.indexOf('【待整理内容】') >= 0, 'parse 版要有待整理内容区');
  });
  // local 路线：AI 只管内容，格式交给本地模型
  [help.PROMPTS.outline.local, help.PROMPTS.lesson.local].forEach(p => {
    assert.ok(/不用管|格式随意|不用管我/.test(p), 'local 版要说明不要求格式');
    assert.ok(/本地模型|本地工作台/.test(p), 'local 版要说明由本地模型二次整理');
  });
  // 两条路线的提示词不能是同一份
  assert.notEqual(help.PROMPTS.outline.parse, help.PROMPTS.outline.local);
  assert.notEqual(help.PROMPTS.lesson.parse, help.PROMPTS.lesson.local);
});

test('考试题提示词：只走线上解析一条路，且覆盖多选与判断', () => {
  const p = help.PROMPTS.exam.parse;
  assert.ok(p && p.length > 80, '考试题提示词为空');
  assert.ok(p.indexOf('【考试题】') >= 0, '要有考试题块');
  assert.ok(/多选/.test(p), '要说明多选题怎么标');
  assert.ok(/判断/.test(p), '要说明判断题怎么标');
  assert.ok(/A~D|A-D|四个选项/.test(p), '要要求 A~D 四项齐全');
  assert.ok(/跳过|不要瞎编/.test(p), '要允许跳过看不懂的题');
  assert.ok(/粘贴在这里/.test(p), '要有粘真题的位置');
  // 考试题只有一份，不区分线上/本地两条路线
  assert.deepEqual(Object.keys(help.PROMPTS.exam), ['parse']);
});

test('单知识点提示词不产出题目（填空模式只补四段，题目另走题目页）', () => {
  [help.PROMPTS.lesson.parse, help.PROMPTS.lesson.local].forEach(p => {
    assert.ok(/不要生成题目|不需要出题/.test(p), '单知识点提示词不该让 AI 出题');
    assert.ok(p.indexOf('【学习题】') < 0, '单知识点提示词不该有学习题');
  });
  // 大纲提示词才要题目，且明确排除考试题
  assert.ok(help.PROMPTS.outline.parse.indexOf('【学习题】') >= 0);
  assert.ok(help.PROMPTS.outline.parse.indexOf('不要生成考试题') >= 0);
});

test('完整实例能被解析器正确吃下（不是摆着好看的）', () => {
  const P = require('../js/parser.js');
  const r = P.parseMaterial(help.TEMPLATE_FULL);
  assert.equal(r.course, 'Python');
  assert.equal(r.chapters.length, 3, '应解析出 3 章');
  const nLs = r.chapters.reduce((s, c) => s + c.lessons.length, 0);
  assert.equal(nLs, 6, '应解析出 6 个知识点');
  const nQ = r.chapters.reduce((s, c) => s + c.lessons.reduce((n, l) => n + l.questions.length, 0), 0);
  const nCq = r.chapters.reduce((s, c) => s + c.lessons.reduce((n, l) => n + (l.chapterQuestions || []).length, 0), 0);
  assert.equal(nQ, 12, '学习题应 12 道，实际 ' + nQ);
  assert.equal(nCq, 3, '章节题应 3 道，实际 ' + nCq);
  assert.equal(r.examGroups.length, 0, '实例里不该有考试题');
  assert.equal((r.pending || []).length, 0, '不该有无法识别的行：' + JSON.stringify(r.pending));
  r.chapters.forEach(c => c.lessons.forEach(l => {
    ['concept', 'feature', 'confusion'].forEach(k => assert.ok(l[k], '知识点缺 ' + k + '：' + l.title));
  }));
});

test('考试题有独立的一节说明它不进素材模板', () => {
  const sec = help.SECTIONS().find(s => /考试题/.test(s.title));
  assert.ok(sec, '缺少考试题专属分节');
  assert.equal(sec.kind, 'plain');
  const txt = (sec.lines || []).join('') + (sec.tip || '');
  assert.ok(/题目/.test(txt), '要指到题目页');
  assert.ok(/独立/.test(txt), '要说明它是独立实体');
});
