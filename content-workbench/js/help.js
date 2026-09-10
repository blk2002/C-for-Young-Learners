(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.help = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  // 人看的：最小骨架，一眼看清长什么样（不含考试题）
  const TEMPLATE_SKELETON = `# 学科：Python
## 第1章 章节标题
### 知识点：1.1 知识点标题
【概念】一句话说清是什么（≤60字）
【特征】判断要点（≤60字）
【易混淆】最常混的对比（≤60字）
【代码】最小示例，可为空
【学习题】
- 选择|题干|A:选项|B:选项|C:选项|D:选项|答案:A|解析:一句话
- 填空|题干|答案:xxx|解析:一句话
【章节题】
- 选择|题干|A:选项|B:选项|C:选项|D:选项|答案:B|解析:一句话`;

  // AI / 自己照着写时看的：一整门课的完整实例（3 章 7 个知识点，同样不含考试题）
  const TEMPLATE_FULL = `# 学科：Python
## 第1章 认识 Python 与第一个程序
### 知识点：1.1 什么是编程与 Python
【概念】编程就是把想让计算机做的事，用它能看懂的语言一步一步写出来。
【特征】Python 语法接近英语，一行一句，读起来像伪代码。
【易混淆】编程语言 ≠ 编程软件；Python 是语言，IDLE / PyCharm 是写它的工具。
【代码】print("Hello World")
【学习题】
- 选择|下列哪一项最准确地描述了"编程"？|A:给电脑装系统|B:用计算机能理解的语言下达步骤|C:上网查资料|D:修好坏掉的电脑|答案:B|解析:编程是向计算机下达可执行步骤。
- 填空|Python 源文件的常见后缀名是____|答案:.py|解析:Python 文件通常保存为 .py。
### 知识点：1.2 第一个 Python 程序
【概念】用 print() 可以把内容输出到屏幕，这是最常见的第一个程序。
【特征】括号里放要输出的内容，文字要加引号，数字不用加。
【易混淆】print("3") 输出字符 3，print(3) 输出数字 3，看着一样但类型不同。
【代码】print("你好，Python")
【学习题】
- 选择|print("Hi") 运行后屏幕上显示什么？|A:Hi|B:"Hi"|C:报错|D:什么都不显示|答案:A|解析:引号用来界定字符串，本身不显示。
- 填空|要在屏幕上输出数字 5，应写成 print(____)|答案:5|解析:数字不需要引号。
【章节题】
- 选择|关于 print()，下面说法正确的是？|A:一次只能输出一个内容|B:文字必须加引号|C:必须在文件最后一行使用|D:大写 PRINT 也可以|答案:B|解析:字符串要加引号；Python 区分大小写。

## 第2章 变量与数据类型
### 知识点：2.1 变量与赋值
【概念】变量是存放数据的"盒子"，用 = 把右边的值放进左边的名字里。
【特征】Python 变量不用提前声明类型，赋什么值就是什么类型。
【易混淆】= 是赋值（把右边给左边），== 才是判断两边是否相等。
【代码】name = "小明"
【学习题】
- 选择|执行 a = 5 之后，a 代表什么？|A:数字 5|B:字母 a|C:等号|D:什么都不是|答案:A|解析:= 把右边的值赋给左边的变量名。
- 填空|判断两个值是否相等，应使用运算符 ____|答案:==|解析:单个 = 是赋值，== 才是比较。
### 知识点：2.2 数字与字符串
【概念】数字可以直接参与计算，字符串是文字，要用引号包起来。
【特征】"12" + "3" 得到 "123"，12 + 3 得到 15。
【易混淆】input() 读进来的永远是字符串，要做数学运算得先转成数字。
【代码】age = int(input("年龄："))
【学习题】
- 选择|表达式 "12" + "3" 的结果是？|A:15|B:"123"|C:报错|D:"15"|答案:B|解析:两个字符串相加是把文字接起来。
- 填空|把字符串转成整数，用 int(____)|答案:"123"|解析:int() 可以把纯数字的字符串转成整数。
【章节题】
- 选择|执行 age = input() 后输入 10，age 的类型是？|A:整数|B:字符串|C:小数|D:布尔|答案:B|解析:input() 一律返回字符串。

## 第3章 条件判断
### 知识点：3.1 if 语句
【概念】if 用来做判断：条件成立，才执行缩进里的代码。
【特征】条件后面必须有冒号，要执行的代码必须缩进。
【易混淆】缩进决定代码块的归属，缩进错了逻辑就变了。
【代码】if score >= 60: print("及格")
【学习题】
- 选择|if 语句的条件后面必须加什么符号？|A:分号 ;|B:冒号 :|C:逗号 ,|D:句号 .|答案:B|解析:Python 用冒号引出代码块。
- 填空|score = 50 时执行上面那段代码，屏幕____输出"及格"|答案:不会|解析:条件不成立，缩进里的代码不执行。
### 知识点：3.2 比较与逻辑运算
【概念】比较运算得到 True / False，逻辑运算把多个条件组合起来。
【特征】and 要求都成立，or 只要一个成立，not 表示取反。
【易混淆】60 <= score <= 100 是 Python 特有的连写写法，别的语言里不能这么写。
【代码】if age >= 8 and age <= 12: print("适合入门")
【学习题】
- 选择|表达式 3 > 2 and 5 < 4 的结果是？|A:True|B:False|C:报错|D:None|答案:B|解析:and 要求两边都成立，而 5 < 4 不成立。
- 填空|要表示"年龄不小于 8"，可写成 age ____ 8|答案:>=|解析:>= 表示大于或等于。
【章节题】
- 选择|score = 75 时，下面哪个条件成立？|A:score > 90|B:60 <= score < 80|C:score < 60|D:score == 100|答案:B|解析:75 落在 60 到 80 之间。`;

  // 模板逐行解释（帮助面板「每行是什么意思」）
  const TEMPLATE_EXPLAIN = [
    ['# 学科：', '学科名。Python 和 C++ 已内置，写它们不会新建一门；只有新建其它学科时才写新名字。'],
    ['## 第N章', '章节。层级固定三层，不要引入更深的标题。'],
    ['### 知识点：', '知识点，挂在它上面最近的那个章节下。'],
    ['【概念】【特征】【易混淆】', '知识点速记三段，每段 ≤60 字。'],
    ['【代码】', '最小可运行示例，可以为空。'],
    ['【学习题】', '挂在这个知识点下的题目，一般每个知识点 2 道。'],
    ['【章节题】', '挂在这个章节下的题目，一般每章 1~2 道。'],
    ['【考试题】', '不在这个模板里 —— 考试题是独立实体，走题目页的「学科 · 考试类型 · 级别」分类卡，或点「AI 按本分类生成」。'],
    ['- 选择|… / - 填空|…', '题目行。字段用半角竖线 | 分隔；选择题 A~D 四项要齐，答案只写字母。']
  ];

  // 提示词：what = outline(整门课大纲) / lesson(单知识点速记)
  //         route = parse(线上 AI 直接按模板出，回来只解析) / local(线上 AI 只出内容，回来由本地模型整理)
  const PROMPTS = {
    outline: {
      parse: `请把下面这份教程 / 资料，整理成我规定的固定格式。只输出整理结果，不要解释、不要寒暄。

【输出格式】
# 学科：<学科名>
## 第N章 <章节标题>
### 知识点：<编号 知识点标题>
【概念】<≤60字，一句话说清是什么>
【特征】<≤60字，判断要点>
【易混淆】<≤60字，最常混的1~3组对比>
【代码】<最小示例，可为空>
【学习题】
- 选择|<题干>|A:<选项>|B:<选项>|C:<选项>|D:<选项>|答案:<字母>|解析:<一句话>
- 填空|<题干>|答案:<xxx>|解析:<一句话>
【章节题】
- 选择|…（格式同上）

【要求】
1. 层级固定三层，不要引入更深的标题。
2. 选择题必须 A~D 四项齐全，答案只写字母。
3. 题目行固定以「选择|」或「填空|」开头，字段用半角竖线 | 分隔。
4. 每个知识点配 2 道学习题，每章配 1~2 道章节题。
5. 不要生成考试题（CIE / GESP / CSP-J 等），它们在工作台里单独管理。
6. 无法确定的内容宁可不写，不要瞎编。
7. Python 和 C++ 已经内置在工作台里，不要在「# 学科：」后面写这两门；只有新建其它学科时才需要写学科名。

【待整理内容】
（把你的原始教程粘贴在这里）`,
      local: `请为下面这门课整理一份教学大纲。你不用管我这边有什么格式要求，把内容讲清楚就行。

【你要产出】
1. 这门课建议分成哪几章，每章的标题是什么
2. 每章下面有哪几个知识点，给出编号和名称
3. 每个知识点用 2~3 句话说明它讲什么、学生要学会什么

【要求】
1. 用 Markdown 的 # / ## / ### 分出层级即可，层级不要超过三层。
2. 按由浅入深的顺序排，别跳跃。
3. 资料里没提到的内容不要自己发明。
4. 不需要出题，题目我在别的地方加。

【原始资料】
（把你的原始教程粘贴在这里）

【说明】
这份结果我会贴回本地工作台，由本地模型再整理成正式格式入库，所以你专心把内容讲清楚就好。`
    },
    lesson: {
      parse: `请把下面这份关于某一个知识点的资料，整理成我规定的固定格式。只输出结果，不要解释。

【输出格式】
### 知识点：<编号 知识点标题>
【概念】<≤60字，一句话说清它是什么>
【特征】<≤60字，判断要点 / 用法要点>
【易混淆】<≤60字，最容易混的1~3组对比>
【代码】<最小可运行示例，没有就空着>

【要求】
1. 三段各不超过 60 字，说人话，不要照抄原文。
2. 【代码】只给最小能跑起来的示例，不要长篇代码。
3. 一次只处理一个知识点；资料里混了别的内容就只挑相关的写。
4. 不要生成题目，题目在工作台里另外加。
5. 不确定的地方宁可留空，不要瞎编。

【待整理内容】
（把这一个知识点的资料粘贴在这里）`,
      local: `请把下面这份资料，整理成一个知识点的速记内容。格式随意，内容讲准就行。

【你要产出】
1. 它是什么（一句话说清）
2. 判断要点 / 使用特征
3. 最容易跟别的东西搞混的点（1~3 组对比）
4. 一个最小的示例代码（没有就不写）

【要求】
1. 不用管任何格式标记，分点写清楚即可。
2. 每段控制在两三句话，别写成大段文章。
3. 资料里没写到的不要自己发挥。
4. 不需要出题，题目我在别的地方加。

【原始资料】
（把这一个知识点的资料粘贴在这里）

【说明】
这份结果我会贴回本地工作台，由本地模型再整理成正式格式入库，所以你专心把内容讲清楚就好。`
    },
    exam: {
      // 考试题只走这一条路：线上 AI 整理 → 粘回来 → 直接解析入表（不经过本地模型）
      parse: `请把下面这份考试真题，整理成我规定的固定格式。只输出整理结果，不要解释、不要寒暄。

【输出格式】
【考试题】(GESP,一级)
- 选择|题干|A:选项|B:选项|C:选项|D:选项|答案:A|解析:一句话说清为什么
- 填空|题干|答案:xxx|解析:一句话
- 判断|题干|答案:对|解析:一句话

【要求】
1. 一行一道题，字段用半角竖线 | 分隔；不要给题目编号，也不要写"第1题"之类的话。
2. 选择题必须有 A~D 四个选项；原题只有三个的，补一个明显不合理的干扰项凑齐第四个。
3. 多选题：答案写全部正确字母（如 AB），并在题干末尾加上「（多选）」三个字。
4. 判断题答案只写"对"或"错"。
5. 解析用一句话说清原因，不要照抄题干。
6. 原题里的题号、分数、页码、页眉页脚一律删掉。
7. 看不懂或信息不全的题直接跳过，不要瞎编。
8. 第一行「【考试题】(...)」照抄上面格式里给的类型与级别，不要自己改。

【待整理内容】
（把你的真题粘贴在这里）`
    }
  };

  // 两条入库路线：线上 AI 出完东西之后，怎么进工作台
  const ROUTES = {
    parse: {
      name: '线上 AI 出格式 · 回来只解析',
      when: '适合：线上 AI 够强、能严格照格式输出，或者本机模型没启动 / 不想等。',
      steps: [
        '复制下面这份提示词，粘贴到任意网页 AI（DeepSeek / 豆包 / 通义等）的对话框。',
        '把你的原始资料粘到提示词末尾「待整理内容 / 原始资料」的下面。',
        '把 AI 输出的整段结果复制回来，粘进工作台右侧素材框。',
        '点「解析入树」即可 —— 不用点「开始 AI 整理」，本地模型可以关着。'
      ],
      good: '快、不占本机资源。',
      bad: 'AI 不照格式输出时，得手动改几行再解析。'
    },
    local: {
      name: '线上 AI 出内容 · 本地模型整理',
      when: '适合：线上 AI 文笔好但格式乱，或者想用强模型写内容、再用本地模型统一成规范格式。',
      steps: [
        '复制下面这份提示词（这份不要求格式），粘贴到网页 AI，让它自由发挥。',
        '把 AI 写的内容整段复制回来，粘进工作台右侧素材框。',
        '出大纲：左侧先选好学科；补速记：左侧先点中那个知识点。',
        '点「开始 AI 整理」—— 由本地模型按模板整理入库。'
      ],
      good: '格式一定规范，内容质量也高。',
      bad: '要跑本地模型，慢一点，且本地模型指示灯必须是绿的。'
    }
  };

  const TROUBLESHOOT = `【常见问题】
· 本地模型黄灯：双击「启动本地模型.bat」；命令行 ollama list 确认有模型
· 云端红灯：检查网络；控制台确认「匿名登录」已开启
· AI 整理卡住：模型调用失败会提示，可重试或改手动编辑
· 同步部分失败：按弹窗逐条看原因；仍失败检查管理密码是否与 ADMIN_PASSWORD 一致
· 换电脑：导出备份 JSON 带走；新机重装 Ollama 并设好网址与密码
· 新学科小程序不显示：需在小程序 app.js 的 globalData.courses 加配置
· 提示「无法确定写入哪门课」：先在左侧选一个学科，再跑整树模式
· 提示「需要先在左侧选中一个知识点」：先在树上点中知识点，再跑填空模式
· 有行没被识别：AI 会跳过并提示行数，可手动补，或用「解析入树」走免 AI 路线
· 想删掉 Python / C++：它们是内置学科，删不掉、也改不了名，这是故意的
· 环境没搭好 / 首次部署：见工具包里的 DEPLOYMENT.md`;

  // 新手三步走（帮助面板首屏，结构化卡片）
  const START_GUIDE = {
    pre: '前提：左下角「本地模型」指示灯是绿的（没绿就双击工具包里的「启动本地模型.bat」）。\n本地 AI 只干一件事：把你贴进素材框的原始资料整理成结构化内容。它不会凭空写教材 —— 资料要先由你从网上找来。',
    steps: [
      {
        t: '选学科',
        lines: [
          '左侧顶部「当前学科」可切换。',
          'Python 和 C++ 是内置学科，默认就在，不能删也不能改名，直接用。',
          '要教别的（如 Scratch）才点「＋ 新建学科」；新建后还要在小程序 app.js 的 globalData.courses 里加一行配置。',
          '新学科刚建好是空的，下面两步就是往里填内容。'
        ]
      },
      {
        t: '让 AI 生成整门课的大纲（章节 + 知识点）',
        lines: [
          '先去网上找这门课的资料：教程目录、教材章节、课程大纲都行，不用自己整理格式。',
          '把找到的内容复制粘贴进右侧素材框；如果是 .docx 文件，直接拖进去就行。',
          '模式选「整树模式」。',
          '点「开始 AI 整理」→ 左侧长出章节和知识点。',
          '这时每个知识点的三段速记还是空的，靠下一步补。'
        ],
        warn: '整树模式写进「当前学科」，别选错；没选学科会提示「无法确定写入哪门课」。'
      },
      {
        t: '让 AI 补齐每个知识点的内容',
        lines: [
          '左侧点中一个知识点。',
          '同样先去网上找资料：搜这个知识点的讲解、博客、官方文档或示例代码，粘进素材框。',
          '只贴这一个知识点的资料，别把整本书都贴进去，AI 会跑偏。',
          '模式选「填空模式」。',
          '点「开始 AI 整理」→ 概念 / 特征 / 易混淆 / 代码 被填上。',
          '重复这一步，直到所有知识点的标记都变成 ✓。'
        ],
        warn: '没点中知识点就跑填空模式，会提示「需要先在左侧选中一个知识点」。'
      },
      {
        t: '推到云端',
        lines: [
          '底部「同步结构与内容」→「同步题目」。',
          '同步完，学生端才看得到。'
        ]
      }
    ],
    post: '不想等 AI：素材已经按模板写好了 → 直接点「解析入树」，不开模型也能成树。'
  };

  function copy(text, label) {
    const done = () => alert((label || '内容') + '已复制');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { alert('复制失败，请手动选择复制'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  function exportBackup() {
    const d = WB.state.load();
    const t = new Date();
    const p = n => String(n).padStart(2, '0');
    const name = 'backup-' + t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) + '-' + p(t.getHours()) + p(t.getMinutes()) + '.json';
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (d.version !== 1) { alert('备份文件版本不兼容'); return; }
        WB.state.save(d);
        WB.treeUI.render(); WB.contentUI.render(); WB.quizUI.render(); WB.syncUI.render(); WBRefreshStat();
        alert('备份已恢复');
      } catch (e) { alert('备份文件解析失败'); }
    };
    reader.readAsText(file);
  }

  function mount() {
    const host = document.getElementById('wb-tools');
    if (!host) return;
    host.innerHTML = '';
    const btn = (text, fn) => { const b = document.createElement('button'); b.className = 'wb-btn sm'; b.textContent = text; b.onclick = fn; return b; };
    host.appendChild(btn('帮助', showHelp));
    host.appendChild(btn('导出备份', exportBackup));
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.json'; fileInput.className = 'hidden';
    fileInput.onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); };
    host.appendChild(fileInput);
    host.appendChild(btn('导入备份', () => fileInput.click()));
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  function tipEl(text) { return el('div', 'wb-help-tip', text); }

  function stepsEl(g) {
    const wrap = el('div', 'wb-help-steps');
    if (g.pre) wrap.appendChild(el('div', 'wb-help-note', g.pre));
    (g.steps || []).forEach((s, i) => {
      const row = el('div', 'wb-help-step');
      row.appendChild(el('div', 'wb-help-step-n', String(i + 1)));
      const bd = el('div', 'wb-help-step-bd');
      bd.appendChild(el('div', 'wb-help-step-t', s.t));
      const ul = el('ul', 'wb-help-step-d');
      (s.lines || []).forEach(x => ul.appendChild(el('li', null, x)));
      bd.appendChild(ul);
      if (s.warn) bd.appendChild(el('div', 'wb-help-step-warn', '注意：' + s.warn));
      row.appendChild(bd);
      wrap.appendChild(row);
    });
    if (g.post) wrap.appendChild(el('div', 'wb-help-note', g.post));
    return wrap;
  }

  function kvEl(rows) {
    const wrap = el('div', 'wb-help-kv');
    rows.forEach(([k, v]) => {
      const row = el('div', 'wb-help-kv-row');
      row.appendChild(el('div', 'wb-help-kv-k', k));
      row.appendChild(el('div', 'wb-help-kv-v', v));
      wrap.appendChild(row);
    });
    return wrap;
  }

  // 帮助面板分节：steps = 步骤卡片，kv = 术语说明，text = 可复制文本框，plain = 纯说明
  const SECTIONS = () => [
    { kind: 'steps', title: '新手上路 · 三步出课', data: START_GUIDE },
    {
      kind: 'text', title: '素材格式速览', content: TEMPLATE_SKELETON, copyLabel: '复制格式骨架',
      tip: '先花 10 秒看清长什么样：一门课 = 若干章，每章 = 若干知识点，每个知识点 = 三段速记 + 示例代码 + 学习题，每章末尾有章节题。'
    },
    { kind: 'kv', title: '每行是什么意思', rows: TEMPLATE_EXPLAIN },
    {
      kind: 'text', title: '完整实例：一整门课长什么样', content: TEMPLATE_FULL, copyLabel: '复制完整实例',
      tip: '这是一份填好的 Python 样例（3 章 6 个知识点、12 道学习题、3 道章节题）。想知道"我该写到什么程度"，照着这份写就行。贴给网页 AI 时也可以直接拿它当格式样板。'
    },
    {
      kind: 'plain', title: '考试题不放在这份模板里',
      tip: '考试题（CIE / GESP / CSP-J）是独立实体，不挂在知识点、章节、学科下面 —— 所以素材模板里没有它。',
      lines: [
        '要去哪加：切到顶部「题目」页 → 左侧分类卡选「学科 · 考试类型 · 级别」→「＋ 加题」手动录，或点「AI 按本分类生成」让模型出。',
        '为什么分开：删掉某个知识点、章节甚至整门学科，考试题都还在；反过来，考试题也能单独同步，不必等结构同步。',
        '所以整理素材时不用管考试题，交给题目页那一栏就行。'
      ]
    },
    {
      kind: 'switch', title: '给网页 AI 的提示词',
      tip: '没有本地模型、或者想用更强的线上模型时走这条路。上面两排按钮决定给你哪份提示词：先选「要 AI 生成什么」，再选「拿回来怎么入库」，下面会跟着变。'
    },
    { kind: 'text', title: '常见问题', content: TROUBLESHOOT, copyLabel: '复制排查表' }
  ];

  // 四象限切换：要什么（大纲 / 单知识点）× 怎么入库（纯解析 / 本地整理）
  // 选中哪个组合，下面只显示那一份提示词 + 那一条路线的用法
  function switchEl() {
    const WHATS = [['outline', '整门课的大纲'], ['lesson', '单个知识点的速记']];
    const ROUTE_KEYS = [['parse', '回来只解析入库'], ['local', '回来本地模型整理']];
    let what = 'outline', route = 'parse';

    const wrap = el('div', 'wb-help-switchwrap');
    const bar = el('div', 'wb-help-switch');
    const mkGroup = (label, opts, cur, onPick) => {
      const g = el('div', 'wb-help-sw-group');
      g.appendChild(el('span', 'wb-help-sw-label', label));
      const btns = opts.map(([v, t]) => {
        const b = el('button', 'wb-help-sw', t);
        b.onclick = () => onPick(v);
        g.appendChild(b);
        return { v, b };
      });
      return { g, btns };
    };

    const body = el('div');
    const sync = () => {
      gWhat.btns.forEach(x => x.b.classList.toggle('on', x.v === what));
      gRoute.btns.forEach(x => x.b.classList.toggle('on', x.v === route));
      body.innerHTML = '';
      const r = ROUTES[route];
      body.appendChild(el('div', 'wb-help-note', r.when));
      const ul = el('ul', 'wb-help-step-d');
      r.steps.forEach(s => ul.appendChild(el('li', null, s)));
      body.appendChild(ul);
      body.appendChild(el('div', 'wb-help-note',
        '好处：' + r.good + '　注意：' + r.bad));
      const pre = el('pre', 'wb-help-pre', PROMPTS[what][route]);
      body.appendChild(pre);
      const lb = what === 'outline' ? '复制大纲提示词' : '复制知识点提示词';
      const cb = el('button', 'wb-btn sm', lb);
      cb.onclick = () => copy(PROMPTS[what][route], lb);
      body.appendChild(cb);
    };

    const gWhat = mkGroup('我要 AI 生成', WHATS, what, v => { what = v; sync(); });
    const gRoute = mkGroup('拿回来', ROUTE_KEYS, route, v => { route = v; sync(); });
    bar.appendChild(gWhat.g); bar.appendChild(gRoute.g);
    wrap.appendChild(bar);
    wrap.appendChild(body);
    sync();
    return wrap;
  }

  function showHelp() {
    const old = document.getElementById('wb-help-modal');
    if (old) old.remove();
    const modal = document.createElement('div'); modal.id = 'wb-help-modal'; modal.className = 'wb-modal-mask';
    const box = document.createElement('div'); box.className = 'wb-modal';
    const hd = document.createElement('div'); hd.className = 'wb-modal-hd';
    const hTitle = document.createElement('h3'); hTitle.textContent = '帮助'; hd.appendChild(hTitle);
    const close = document.createElement('span'); close.className = 'x'; close.textContent = '关闭';
    close.onclick = () => modal.remove();
    hd.appendChild(close);
    box.appendChild(hd);
    const bodyWrap = document.createElement('div'); bodyWrap.className = 'wb-modal-bd';
    SECTIONS().forEach(sec => {
      bodyWrap.appendChild(el('h3', 'wb-panel-title', sec.title));
      if (sec.tip) bodyWrap.appendChild(tipEl(sec.tip));
      if (sec.kind === 'steps') {
        bodyWrap.appendChild(stepsEl(sec.data));
        return;
      }
      if (sec.kind === 'kv') {
        bodyWrap.appendChild(kvEl(sec.rows));
        return;
      }
      if (sec.kind === 'plain') {
        (sec.lines || []).forEach(t => bodyWrap.appendChild(el('div', 'wb-help-note', t)));
        return;
      }
      if (sec.kind === 'switch') {
        bodyWrap.appendChild(switchEl());
        return;
      }
      const pre = el('pre', 'wb-help-pre', sec.content);
      bodyWrap.appendChild(pre);
      const cb = el('button', 'wb-btn sm', sec.copyLabel);
      cb.onclick = () => copy(sec.content, sec.copyLabel);
      bodyWrap.appendChild(cb);
    });
    box.appendChild(bodyWrap);
    modal.appendChild(box);
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }

  return { mount, exportBackup, importBackup, SECTIONS, START_GUIDE, TEMPLATE_EXPLAIN,
    TEMPLATE_SKELETON, TEMPLATE_FULL, PROMPTS, ROUTES,
    AI_INSTRUCTION: PROMPTS.outline.parse };
});
