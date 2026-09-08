(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.contentUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  let cachedMaterial = '';      // 素材文本缓存（render 重建后恢复，避免页签切换丢内容）
  const timers = {};            // 防抖计时器

  const draft = () => WB.state.load();

  function findLesson(d, key) {
    for (const c of Object.values(d.tree)) for (const ch of c.chapters) {
      const ls = ch.lessons.find(x => x.key === key); if (ls) return ls;
    }
    return null;
  }

  function getSelectedLesson() {
    const sel = WB.treeUI.getSelected();
    if (!sel || !sel.lessonKey) return null;
    return findLesson(draft(), sel.lessonKey);
  }

  function updateStats() {
    const ta = document.getElementById('wb-material');
    if (!ta) return;
    const text = ta.value;
    const parsed = WB.parser.parseMaterial(text);
    const chapters = parsed.chapters.length;
    const lessons = parsed.chapters.reduce((n, c) => n + c.lessons.length, 0);
    const qs = parsed.chapters.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.questions.length + l.chapterQuestions.length, 0), 0)
      + parsed.examGroups.reduce((n, g) => n + g.questions.length, 0);
    const stat = document.getElementById('wb-material-stat');
    if (stat) stat.textContent = `字数 ${text.length} · 章节 ${chapters} · 知识点 ${lessons} · 题目 ${qs}`;
  }

  async function handleFile(file) {
    if (!file) return;
    let text = null;
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.docx')) {
      text = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else if (name.endsWith('.txt')) {
      text = await file.text();
    } else {
      alert('仅支持 .docx 与 .txt');
      return;
    }
    const ta = document.getElementById('wb-material');
    ta.value = text;
    cachedMaterial = text;
    updateStats();
  }

  function buildMaterialArea() {
    const wrap = document.createElement('div');
    wrap.className = 'wb-panel';
    const title = document.createElement('h3'); title.className = 'wb-panel-title'; title.textContent = '素材输入（粘贴或拖入 Word/TXT）';
    wrap.appendChild(title);

    const drop = document.createElement('div'); drop.className = 'wb-drop'; drop.id = 'wb-drop';
    drop.textContent = '把 .docx / .txt 文件拖到这里，或点击选择文件';
    const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.docx,.txt'; fileInput.className = 'hidden';
    drop.onclick = () => fileInput.click();
    fileInput.onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    wrap.appendChild(drop); wrap.appendChild(fileInput);

    const ta = document.createElement('textarea'); ta.id = 'wb-material'; ta.className = 'wb-material';
    ta.placeholder = '在此粘贴按素材模板整理的文本（# 学科 → ## 章节 → ### 知识点 → 三段速记 → 题目）';
    ta.value = cachedMaterial;
    ta.oninput = () => { cachedMaterial = ta.value; updateStats(); };
    wrap.appendChild(ta);

    const bar = document.createElement('div'); bar.className = 'wb-material-bar';
    const stat = document.createElement('span'); stat.id = 'wb-material-stat'; stat.className = 'wb-muted';
    const clear = document.createElement('button'); clear.className = 'wb-btn'; clear.textContent = '清空';
    clear.onclick = () => { ta.value = ''; cachedMaterial = ''; updateStats(); };
    bar.appendChild(stat); bar.appendChild(clear);
    wrap.appendChild(bar);
    return wrap;
  }

  function buildAiArea() {
    const wrap = document.createElement('div');
    wrap.className = 'wb-panel';
    const title = document.createElement('h3'); title.className = 'wb-panel-title'; title.textContent = 'AI 整理';
    wrap.appendChild(title);
    const radios = document.createElement('div'); radios.className = 'wb-radio-row';
    const r1 = document.createElement('label'); r1.className = 'wb-radio';
    r1.innerHTML = '<input type="radio" name="wb-ai-mode" value="tree" checked> 整树模式（整份素材 → 完整草稿）';
    const r2 = document.createElement('label'); r2.className = 'wb-radio';
    r2.innerHTML = '<input type="radio" name="wb-ai-mode" value="fill"> 填空模式（只填当前选中知识点）';
    radios.appendChild(r1); radios.appendChild(r2);
    wrap.appendChild(radios);
    const btn = document.createElement('button'); btn.className = 'wb-btn primary'; btn.id = 'wb-run-ai'; btn.textContent = '开始 AI 整理';
    btn.onclick = () => runAi();
    if (!WB.aiFlow) { btn.disabled = true; btn.textContent = '开始 AI 整理（AI 模块加载中）'; }
    wrap.appendChild(btn);
    return wrap;
  }

  async function runAi() {
    const mode = (document.querySelector('input[name="wb-ai-mode"]:checked') || {}).value || 'tree';
    const material = document.getElementById('wb-material').value;
    if (!material.trim()) { alert('请先粘贴素材'); return; }
    const sel = WB.treeUI.getSelected();
    if (mode === 'fill' && (!sel || !sel.lessonKey)) { alert('填空模式需要先在左侧选中一个知识点'); return; }
    const res = await WB.aiFlow.run(material, { fillOnly: mode === 'fill', lessonKey: sel && sel.lessonKey });
    if (res && res.ok) { WB.treeUI.render(); WB.contentUI.render(); }
  }

  function buildEditArea() {
    const wrap = document.createElement('div');
    wrap.className = 'wb-panel';
    const title = document.createElement('h3'); title.className = 'wb-panel-title'; title.textContent = '知识点内容（三段速记 + 代码）';
    wrap.appendChild(title);
    const lesson = getSelectedLesson();
    if (!lesson) {
      const hint = document.createElement('div'); hint.className = 'wb-muted';
      hint.textContent = '先在左侧选择一个知识点，再编辑它的三段速记。';
      wrap.appendChild(hint);
      return wrap;
    }
    const fields = [
      { key: 'concept', label: '概念', ph: '一句话说清是什么（≤60字）' },
      { key: 'feature', label: '特征', ph: '判断要点（≤60字）' },
      { key: 'confusion', label: '易混淆', ph: '最常混的 1~3 组对比（≤60字）' }
    ];
    fields.forEach(f => {
      const label = document.createElement('div'); label.className = 'wb-field-label';
      const name = document.createElement('span'); name.textContent = f.label;
      const cnt = document.createElement('span'); cnt.className = 'wb-count'; cnt.id = 'wb-count-' + f.key;
      label.appendChild(name); label.appendChild(cnt);
      wrap.appendChild(label);
      const ta = document.createElement('textarea'); ta.className = 'wb-seg'; ta.id = 'wb-edit-' + f.key;
      ta.placeholder = f.ph; ta.value = lesson.content[f.key] || '';
      ta.oninput = () => { updateCountEl(f.key, ta.value); scheduleSave(f.key, ta.value); };
      wrap.appendChild(ta);
      updateCountEl(f.key, ta.value);
    });
    const label = document.createElement('div'); label.className = 'wb-field-label';
    const name = document.createElement('span'); name.textContent = '代码';
    const cnt = document.createElement('span'); cnt.className = 'wb-count'; cnt.id = 'wb-count-code';
    label.appendChild(name); label.appendChild(cnt);
    wrap.appendChild(label);
    const code = document.createElement('textarea'); code.className = 'wb-seg wb-code'; code.id = 'wb-edit-code';
    code.placeholder = '最小示例（可为空）'; code.value = lesson.codeExample || '';
    code.oninput = () => scheduleSave('code', code.value);
    wrap.appendChild(code);
    return wrap;
  }

  function updateCountEl(key, val) {
    const el = document.getElementById('wb-count-' + key);
    if (!el) return;
    const len = (val || '').length;
    el.textContent = len + ' 字';
    el.classList.toggle('over', len > 60);
  }

  function scheduleSave(field, value) {
    if (timers[field]) clearTimeout(timers[field]);
    timers[field] = setTimeout(() => saveLessonField(field, value), 500);
  }

  function saveLessonField(field, value) {
    const sel = WB.treeUI.getSelected();
    if (!sel || !sel.lessonKey) return;
    const d = draft();
    const ls = findLesson(d, sel.lessonKey);
    if (!ls) return;
    if (field === 'code') ls.codeExample = value;
    else ls.content[field] = value;
    WB.state.save(d);
    WBRefreshStat();
  }

  function render() {
    const host = document.getElementById('wb-workspace');
    host.innerHTML = '';
    host.appendChild(buildMaterialArea());
    host.appendChild(buildAiArea());
    host.appendChild(buildEditArea());
  }

  return { render };
});
