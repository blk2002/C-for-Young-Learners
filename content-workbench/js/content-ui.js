(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.contentUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  let cachedMaterial = '';      // 素材文本缓存（render 重建后恢复）
  let aiMode = 'tree';          // tree | fill
  const timers = {};

  const draft = () => WB.state.load();
  const $ = id => document.getElementById(id);

  const TEMPLATE = '# 学科：Python\n## 第1章 认识 Python\n### 知识点：1.1 什么是编程\n' +
    '【概念】编程就是告诉计算机一步一步做什么。\n【特征】语法简单、一行一句、适合初学者。\n【易混淆】编程语言 ≠ 程序文件。\n' +
    '【代码】print("Hello World")\n【学习题】\n- 选择|下列哪个函数能把文字输出到屏幕？|A:print|B:input|C:len|D:type|答案:A|解析:print 用于输出。\n' +
    '【章节题】\n- 填空|Python 源文件的后缀名是____|答案:.py\n【考试题】(GESP,一级)\n- 选择|表达式 3+2*2 的结果是？|A:10|B:7|C:12|D:9|答案:B';

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function cardShell(titleText, subText) {
    const card = el('div', 'wb-card');
    const hd = el('div', 'wb-card-hd');
    const h3 = el('h3', null, titleText);
    hd.appendChild(h3);
    if (subText) hd.appendChild(el('span', 'wb-muted', subText));
    const right = el('div', 'wb-card-hd-right');
    hd.appendChild(right);
    card.appendChild(hd);
    const bd = el('div', 'wb-card-bd');
    card.appendChild(bd);
    return { card, hd, right, bd };
  }

  function findLessonInfo(key) {
    const d = draft();
    for (const [cid, c] of Object.entries(d.tree)) {
      for (const ch of c.chapters) {
        const i = ch.lessons.findIndex(x => x.key === key);
        if (i >= 0) return { courseId: cid, course: c, ch, ls: ch.lessons[i] };
      }
    }
    return null;
  }
  function getSelectedLesson() {
    const sel = WB.treeUI.getSelected();
    if (!sel || !sel.lessonKey) return null;
    const info = findLessonInfo(sel.lessonKey);
    return info ? info.ls : null;
  }
  function flatLessons(courseId) {
    const d = draft();
    const c = d.tree[courseId];
    const arr = [];
    if (c) c.chapters.forEach(ch => ch.lessons.forEach(ls => arr.push(ls)));
    return arr;
  }

  // ===== 素材统计 =====
  function countParsed(text) {
    const parsed = WB.parser.parseMaterial(text || '');
    const chapters = parsed.chapters.length;
    const lessons = parsed.chapters.reduce((n, c) => n + c.lessons.length, 0);
    const qs = parsed.chapters.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.questions.length + l.chapterQuestions.length, 0), 0)
      + parsed.examGroups.reduce((n, g) => n + g.questions.length, 0);
    return { parsed, chapters, lessons, qs };
  }
  function updateStats() {
    const ta = $('wb-material');
    if (!ta) return;
    const r = countParsed(ta.value);
    const stat = $('wb-material-stat');
    if (stat) stat.textContent = `字数 ${ta.value.length} · 章节 ${r.chapters} · 知识点 ${r.lessons} · 题目 ${r.qs}`;
  }

  async function handleFile(file) {
    if (!file) return;
    let text = null;
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.docx')) {
      text = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else if (name.endsWith('.txt')) {
      text = await file.text();
    } else { alert('仅支持 .docx 与 .txt'); return; }
    const ta = $('wb-material');
    ta.value = text; cachedMaterial = text; updateStats();
  }

  // ===== 解析入树（不开模型） =====
  function parseIntoTree() {
    const ta = $('wb-material');
    const text = ta ? ta.value : '';
    if (!text.trim()) { alert('请先粘贴按素材模板写好的文本'); return; }
    const cid = WB.treeUI.getCurrentCourse();
    if (!cid) { alert('请先在左侧新建或选择一个学科'); return; }
    const r = countParsed(text);
    if (!r.chapters && !r.parsed.examGroups.length) { alert('没解析出章节或考试题，请检查是否按模板书写（## 章节 / ### 知识点）'); return; }
    const d = draft();
    WB.parser.mergeIntoDraft(d, r.parsed, cid);
    WB.state.save(d);
    WB.treeUI.render();
    render();
    if (window.WBRefreshStat) WBRefreshStat();
    alert(`已解析入「${d.tree[cid].name || cid}」：章节 ${r.chapters} · 知识点 ${r.lessons} · 题目 ${r.qs}`
      + (r.parsed.pending && r.parsed.pending.length ? `\n有 ${r.parsed.pending.length} 行未能识别，已跳过` : ''));
  }

  // ===== 左列：素材输入 =====
  function buildMaterialCard() {
    const { card, right, bd } = cardShell('素材输入', '粘贴或拖入 Word / TXT');
    card.classList.add('grow');
    const clear = el('button', 'wb-btn sm', '清空');
    clear.onclick = () => { const ta = $('wb-material'); ta.value = ''; cachedMaterial = ''; updateStats(); };
    right.appendChild(clear);

    const drop = el('div', 'wb-drop', '把 .docx / .txt 拖到这里，或点击选择文件');
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.docx,.txt'; fileInput.className = 'hidden';
    drop.onclick = () => fileInput.click();
    fileInput.onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    bd.appendChild(drop); bd.appendChild(fileInput);

    const ta = document.createElement('textarea'); ta.id = 'wb-material'; ta.className = 'wb-material';
    ta.placeholder = '在此粘贴按素材模板整理的文本（# 学科 → ## 章节 → ### 知识点 → 三段速记 → 题目）';
    ta.value = cachedMaterial;
    ta.oninput = () => { cachedMaterial = ta.value; updateStats(); };
    bd.appendChild(ta);

    const bar = el('div', 'wb-material-bar');
    const stat = el('span', 'wb-muted', '字数 0 · 章节 0 · 知识点 0 · 题目 0'); stat.id = 'wb-material-stat';
    bar.appendChild(stat);
    const r = el('div', 'r');
    const btnTpl = el('button', 'wb-btn sm', '插入模板');
    btnTpl.onclick = () => { ta.value = TEMPLATE; cachedMaterial = TEMPLATE; updateStats(); };
    const btnParse = document.createElement('button');
    btnParse.className = 'wb-btn sm';
    btnParse.innerHTML = '解析入树<span class="wb-tag-new">新</span>';
    btnParse.title = '按模板解析，不用开本地模型';
    btnParse.onclick = () => parseIntoTree();
    r.appendChild(btnTpl); r.appendChild(btnParse);
    bar.appendChild(r);
    bd.appendChild(bar);
    return card;
  }

  // ===== 左列：AI 整理 =====
  function buildAiCard() {
    const { card, bd } = cardShell('AI 整理', '本机 qwen3:4b');

    const tgt = el('div', 'wb-tgt'); tgt.id = 'wb-ai-target';
    bd.appendChild(tgt);

    const seg = el('div', 'wb-seg-switch');
    const s1 = el('span', aiMode === 'tree' ? 'on' : '', '整树模式');
    const s2 = el('span', aiMode === 'fill' ? 'on' : '', '填空模式');
    s1.onclick = () => { aiMode = 'tree'; s1.classList.add('on'); s2.classList.remove('on'); renderTarget(); };
    s2.onclick = () => { aiMode = 'fill'; s2.classList.add('on'); s1.classList.remove('on'); renderTarget(); };
    seg.appendChild(s1); seg.appendChild(s2);
    bd.appendChild(seg);

    const btn = el('button', 'wb-btn primary', '开始 AI 整理');
    btn.style.width = '100%';
    btn.onclick = () => runAi();
    if (!WB.aiFlow) { btn.disabled = true; btn.textContent = '开始 AI 整理（AI 模块加载中）'; }
    bd.appendChild(btn);

    bd.appendChild(el('div', 'wb-note', '整树模式：整份素材重生成整棵树（写入当前学科）。填空模式：只补当前选中的知识点。识别不了的行会跳过并提示。'));
    card._renderTarget = () => {
      const d = draft();
      const cid = WB.treeUI.getCurrentCourse();
      const c = cid ? d.tree[cid] : null;
      const ls = getSelectedLesson();
      tgt.innerHTML = '';
      const tag = document.createElement('span');
      tag.className = 'wb-badge ' + ((aiMode === 'fill' && !ls) ? 'warn' : 'brand');
      tag.textContent = aiMode === 'fill' ? (ls ? (c ? c.name : cid) + ' · ' + ls.title : '未选知识点') : (c ? (c.name || cid) : '未选学科');
      tgt.appendChild(document.createTextNode('写入目标'));
      tgt.appendChild(tag);
      const tip = el('span', 'r', aiMode === 'fill' ? (ls ? '只补这一个知识点' : '请先在左侧点一个知识点') : '整棵树按素材重新生成');
      tgt.appendChild(tip);
    };
    return card;
  }
  function renderTarget() {
    const t = $('wb-ai-target');
    if (t && t.parentElement && t.parentElement.parentElement && t.parentElement.parentElement._renderTarget) t.parentElement.parentElement._renderTarget();
  }

  async function runAi() {
    const material = ($('wb-material') || {}).value || '';
    if (!material.trim()) { alert('请先粘贴素材'); return; }
    const cid = WB.treeUI.getCurrentCourse();
    if (!cid) { alert('请先在左侧新建或选择一个学科'); return; }
    const sel = WB.treeUI.getSelected();
    if (aiMode === 'fill' && (!sel || !sel.lessonKey)) { alert('填空模式需要先在左侧选中一个知识点'); return; }
    const btn = document.querySelector('#wb-workspace .wb-btn.primary');
    if (btn) { btn.disabled = true; btn.textContent = '整理中…'; }
    try {
      await WB.aiFlow.run(material, { fillOnly: aiMode === 'fill', lessonKey: sel && sel.lessonKey, courseId: cid });
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '开始 AI 整理'; }
    }
    render();
  }

  // ===== 右列：知识点编辑 =====
  function buildEditCard() {
    const sel = WB.treeUI.getSelected();
    const cid = WB.treeUI.getCurrentCourse();
    const d = draft();
    const c = cid ? d.tree[cid] : null;
    const info = (sel && sel.lessonKey) ? findLessonInfo(sel.lessonKey) : null;
    const lesson = info ? info.ls : null;

    const { card, hd, right, bd } = cardShell(lesson ? lesson.title : '未选择知识点');
    card.classList.add('grow');
    if (c) right.appendChild(el('span', 'wb-muted', c.name || cid));

    // 面包屑
    const crumb = el('div', 'wb-crumb');
    if (lesson) {
      crumb.appendChild(el('span', null, c ? (c.name || cid) : cid));
      crumb.appendChild(el('span', null, '›'));
      crumb.appendChild(el('span', null, info.ch.title));
      crumb.appendChild(el('span', null, '›'));
      crumb.appendChild(el('span', 'here', lesson.title));
      if (!lesson.cloudId) crumb.appendChild(el('span', 'wb-badge warn', '未入库'));
      const nav = el('div', 'nav');
      const flat = flatLessons(cid);
      const idx = flat.findIndex(x => x.key === lesson.key);
      const bPrev = el('button', 'wb-btn sm', '‹ 上一个');
      bPrev.disabled = idx <= 0;
      bPrev.onclick = () => WB.treeUI.selectLessonByKey(flat[idx - 1].key);
      const bNext = el('button', 'wb-btn sm', '下一个 ›');
      bNext.disabled = idx < 0 || idx >= flat.length - 1;
      bNext.onclick = () => WB.treeUI.selectLessonByKey(flat[idx + 1].key);
      nav.appendChild(bPrev); nav.appendChild(bNext);
      crumb.appendChild(nav);
    } else {
      crumb.appendChild(el('span', null, c ? `当前学科「${c.name || cid}」共 ${(c.chapters || []).length} 章、${flatLessons(cid).length} 个知识点。在左侧选一个知识点开始编辑。` : '先在左侧新建或选择一个学科'));
    }
    card.insertBefore(crumb, bd);

    if (!lesson) {
      bd.appendChild(el('div', 'wb-muted', '三段速记（概念 / 特征 / 易混淆）用于生成题目，建议先填完再生成题目。'));
      return card;
    }

    const fields = [
      { key: 'concept', label: '概念', ph: '一句话说清是什么', max: 60 },
      { key: 'feature', label: '特征', ph: '判断要点，2~3 条', max: 60 },
      { key: 'confusion', label: '易混淆', ph: '最常混的 1~3 组对比', max: 60 },
      { key: 'code', label: '代码示例', ph: '最小可运行示例（可为空）', max: 0 }
    ];
    const grid = el('div', 'wb-seg-grid');
    fields.forEach(f => {
      const cell = el('div', 'wb-seg-cell');
      const label = el('div', 'wb-field-label');
      label.appendChild(el('span', null, f.label));
      const cnt = el('span', 'wb-count'); cnt.id = 'wb-count-' + f.key;
      label.appendChild(cnt);
      cell.appendChild(label);
      const ta = document.createElement('textarea');
      ta.className = 'wb-seg' + (f.key === 'code' ? ' wb-code' : '');
      ta.id = 'wb-edit-' + f.key;
      ta.placeholder = f.ph;
      ta.value = f.key === 'code' ? (lesson.codeExample || '') : (lesson.content[f.key] || '');
      ta.oninput = () => { updateCount(f, ta.value); scheduleSave(f.key, ta.value); };
      cell.appendChild(ta);
      grid.appendChild(cell);
      updateCount(f, ta.value);
    });
    bd.appendChild(grid);

    const mini = el('div', 'wb-mini');
    mini.appendChild(el('span', null, `本知识点题目 ${(lesson.questions || []).length + (lesson.chapterQuestions || []).length} 道`));
    const r = el('div', 'r');
    const goto = el('button', 'wb-btn sm', '去题目页');
    goto.onclick = () => { const t = $('wb-tab-quiz'); if (t) t.click(); };
    const del = el('button', 'wb-btn sm danger', '删除知识点');
    del.onclick = () => deleteLesson(info);
    r.appendChild(goto); r.appendChild(del);
    mini.appendChild(r);
    bd.appendChild(mini);
    return card;
  }

  function deleteLesson(info) {
    if (!info) return;
    if (!confirm('确认删除知识点「' + info.ls.title + '」？已入库的将在下次「同步结构与内容」时从云端删除。')) return;
    const d = draft();
    if (info.ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: info.ls.cloudId });
    const i = info.ch.lessons.findIndex(x => x.key === info.ls.key);
    info.ch.lessons.splice(i, 1);
    info.ch.lessons.forEach((x, k) => x.order = k + 1);
    WB.state.save(d);
    WB.treeUI.render();
    render();
    if (window.WBRefreshStat) WBRefreshStat();
  }

  function updateCount(f, val) {
    const elc = $('wb-count-' + f.key);
    if (!elc) return;
    const len = (val || '').length;
    elc.textContent = f.max ? len + ' / ' + f.max : len + ' 字';
    elc.classList.toggle('over', !!f.max && len > f.max);
  }

  function scheduleSave(field, value) {
    if (timers[field]) clearTimeout(timers[field]);
    timers[field] = setTimeout(() => saveLessonField(field, value), 500);
  }
  function saveLessonField(field, value) {
    const sel = WB.treeUI.getSelected();
    if (!sel || !sel.lessonKey) return;
    const d = draft();
    const info = findLessonInfo(sel.lessonKey);
    if (!info) return;
    if (field === 'code') info.ls.codeExample = value;
    else info.ls.content[field] = value;
    WB.state.save(d);
    WB.treeUI.render();
    if (window.WBRefreshStat) WBRefreshStat();
  }

  function render() {
    const host = $('wb-workspace');
    if (!host) return;
    host.innerHTML = '';
    const cols = el('div', 'wb-cols');
    const left = el('div', 'wb-col-l');
    left.appendChild(buildMaterialCard());
    const ai = buildAiCard();
    left.appendChild(ai);
    const right = el('div', 'wb-col-r');
    right.appendChild(buildEditCard());
    cols.appendChild(left); cols.appendChild(right);
    host.appendChild(cols);
    updateStats();
    if (ai._renderTarget) ai._renderTarget();
  }

  return { render };
});
