(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.help = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const TEMPLATE = `# 学科：Python
## 第1章 认识 Python 与第一个程序
### 知识点：1.1 什么是编程与 Python
【概念】编程就是告诉计算机一步一步做什么，Python 是一种简单易读的编程语言。
【特征】语法简单、一行一句、适合初学者。
【易混淆】编程语言 ≠ 程序文件；Python 与 C++ 写法不同。
【代码】print("Hello World")
【学习题】
- 选择|下列哪个函数能把文字输出到屏幕？|A:print|B:input|C:len|D:type|答案:A|解析:print 用于输出。
- 填空|Python 源文件的后缀名是____|答案:.py|解析:保存为 .py 文件。
【章节题】
- 选择|print("Hi") 运行后屏幕显示什么？|A:Hi|B:"Hi"|C:报错|D:空|答案:A|解析:引号本身不显示。
【考试题】(GESP,一级)
- 选择|下列哪个是合法的 Python 变量名？|A:2name|B:my_name|C:my-name|D:print|答案:B|解析:不能数字开头。`;

  const AI_INSTRUCTION = `请把下面这段教程内容，整理成如下固定格式（不要改动我的层级符号与标记）：

# 学科：<学科名>
## <第N章 章节标题>
### 知识点：<编号 知识点标题>
【概念】<≤60字，一句话说清是什么>
【特征】<≤60字，判断要点>
【易混淆】<≤60字，最常混的1~3组对比>
【代码】<最小示例，可为空>
【学习题】
- 选择|题干|A:选项|B:选项|C:选项|D:选项|答案:字母|解析:一句话
- 填空|题干|答案:xxx|解析:一句话
【章节题】
- 选择|…（同上格式）
【考试题】(考试类型,级别)
- 选择|…（同上格式）

要求：
1. 层级固定三层，不要引入更深的标题。
2. 选择题必须 A~D 四项齐全，答案只写字母。
3. 题目行固定以「选择|」或「填空|」开头，字段用半角竖线 | 分隔。
4. 考试题的考试类型写 CIE / GESP / CSP-J 之一，级别写 一级/二级/三级/入门级。
5. 无法确定的内容宁可不写，不要瞎编。

待整理内容：`;

  const DEPLOY = `【一次性部署（约 40 分钟，只做一次）】
1. 安装 Ollama：ollama.com 下载 Windows 版，安装路径选 D:\\ollama
2. 设置模型目录（存 D 盘，不占 C 盘）：命令行运行  setx OLLAMA_MODELS "D:\\ollama\\models"
3. 拉取模型：命令行运行  ollama pull qwen3:4b   （约 2.5GB）
4. 每次使用前双击工具包内「启动本地模型.bat」，模型常驻后台
5. 微信开发者工具 → 云开发控制台 → 静态网站托管 → 开通
6. 把 index.html + css/ + js/ 上传到托管根目录，收藏得到的网址
7. 云开发控制台 → 环境 → 登录授权 → 启用「匿名登录」
8. 开发者工具里右键 importContent / getCourseTree → 上传并部署（云端安装依赖）
9. 云开发控制台 → 云函数 → importContent → 配置 → 环境变量，添加 ADMIN_PASSWORD=<你的管理密码>（getCourseTree 同样）
10. 打开网址，两盏连接灯变绿即就绪`;

  const TROUBLESHOOT = `【常见问题】
· 本地模型黄灯：双击「启动本地模型.bat」；命令行 ollama list 确认有模型
· 云端红灯：检查网络；控制台确认「匿名登录」已开启
· AI 整理卡住：模型调用失败会提示，可重试或改手动编辑
· 同步部分失败：按弹窗逐条看原因；仍失败检查管理密码是否与 ADMIN_PASSWORD 一致
· 换电脑：导出备份 JSON 带走；新机重装 Ollama 并设好网址与密码
· 新学科小程序不显示：需在小程序 app.js 的 globalData.courses 加配置`;

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
    const btn = (text, fn) => { const b = document.createElement('button'); b.className = 'wb-btn'; b.textContent = text; b.onclick = fn; return b; };
    host.appendChild(btn('帮助', showHelp));
    host.appendChild(btn('导出备份', exportBackup));
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.json'; fileInput.className = 'hidden';
    fileInput.onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); };
    host.appendChild(fileInput);
    host.appendChild(btn('导入备份', () => fileInput.click()));
  }

  function showHelp() {
    const old = document.getElementById('wb-help-modal');
    if (old) old.remove();
    const modal = document.createElement('div'); modal.id = 'wb-help-modal'; modal.className = 'wb-modal-mask';
    const box = document.createElement('div'); box.className = 'wb-modal';
    const close = document.createElement('button'); close.className = 'wb-btn'; close.textContent = '关闭';
    close.onclick = () => modal.remove();
    box.appendChild(close);
    [
      ['素材模板', TEMPLATE, '复制素材模板'],
      ['给网页 AI 的指令', AI_INSTRUCTION, '复制指令'],
      ['部署步骤', DEPLOY, '复制部署步骤'],
      ['常见问题', TROUBLESHOOT, '复制排查表']
    ].forEach(([title, content, copyLabel]) => {
      const h = document.createElement('h3'); h.className = 'wb-panel-title'; h.textContent = title;
      box.appendChild(h);
      const pre = document.createElement('pre'); pre.className = 'wb-help-pre'; pre.textContent = content;
      box.appendChild(pre);
      const cb = document.createElement('button'); cb.className = 'wb-btn'; cb.textContent = copyLabel;
      cb.onclick = () => copy(content, copyLabel);
      box.appendChild(cb);
    });
    modal.appendChild(box);
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }

  return { mount, exportBackup, importBackup };
});
