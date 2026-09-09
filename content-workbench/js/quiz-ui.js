(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.quizUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const EXAM_TYPES = ['CIE', 'GESP', 'CSP-J'];
  const LEVELS = ['一级', '二级', '三级', '入门级'];
  const draft = () => WB.state.load();

  // 题目页两个子区：知识点题（学习题/章节题，挂在选中的知识点下）/ 考试题（独立实体）。
  // 顶部分段开关切换 viewMode；考试题子区用 activeExamKey 过滤到某个「学科·类型·级别」组。
  let viewMode = 'knowledge';        // 'knowledge' | 'exam'
  let activeExamKey = null;          // 'courseId|examType|level' 或 null（null = 展示全部考试题）
  const examGroupKey = g => (g.courseId || '(未标注)') + '|' + (g.examType || '') + '|' + (g.level || '');
  function parseExamKey(k) { const p = (k || '').split('|'); return { courseId: p[0], examType: p[1], level: p[2] }; }
  const $ = id => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function findLesson(d, key) {
    for (const c of Object.values(d.tree)) for (const ch of c.chapters) {
      const ls = ch.lessons.find(x => x.key === key); if (ls) return ls;
    }
    return null;
  }
  function allLessons(d) {
    const arr = [];
    Object.entries(d.tree).forEach(([cid, c]) => c.chapters.forEach(ch => ch.lessons.forEach(ls =>
      arr.push({ courseId: cid, chapterTitle: ch.title, lessonKey: ls.key, title: ls.title }))));
    return arr;
  }
  function currentLesson() {
    const sel = WB.treeUI.getSelected();
    if (!sel || !sel.lessonKey) return null;
    return findLesson(draft(), sel.lessonKey);
  }
  function currentCourseId() {
    const sel = WB.treeUI.getSelected();
    if (sel && sel.courseId) return sel.courseId;
    return WB.treeUI.getCurrentCourse ? WB.treeUI.getCurrentCourse() : null;
  }

  // 考试题是独立实体，不依附学科：默认展示**全部**学科的考试题（含学科已删的孤儿），
  // 否则当前学科一变，别的学科的考试题就被过滤掉、用户看不见也删不掉。
  let examCourseFilter = 'all';

  // 知识点题行（学习题 + 章节题，挂在当前选中的知识点下）
  function buildKnowledgeRows() {
    const d = draft();
    const rows = [];
    const sel = WB.treeUI.getSelected();
    if (sel && sel.lessonKey) {
      const ls = findLesson(d, sel.lessonKey);
      if (ls) {
        (ls.questions || []).forEach(q => rows.push({ q, target: 'learn', lessonKey: ls.key }));
        (ls.chapterQuestions || []).forEach(q => rows.push({ q, target: 'chapter', lessonKey: ls.key }));
      }
    }
    return rows;
  }
  // 考试题行：独立实体，不依附学科树。activeExamKey 为 null 时展示全部，否则只展示该组。
  // 注意 gi 取的是 d.examQuestions 的**全局下标**（forEach 下标），与 removeRow 的 d.examQuestions[row.gi] 一致。
  function buildExamRows() {
    const d = draft();
    const rows = [];
    (d.examQuestions || []).forEach((g, gi) => {
      if (activeExamKey && examGroupKey(g) !== activeExamKey) return;
      (g.questions || []).forEach(q => rows.push({ q, target: 'exam', examType: g.examType, level: g.level, gi, courseId: g.courseId }));
    });
    return rows;
  }
  const examKey = g => g.courseId || '(未标注)';

  function persist(d) { WB.state.save(d); render(); if (window.WBRefreshStat) WBRefreshStat(); }

  // ===== 删除 / 跳过 / 归属变更 =====
  // 注意：每次 `draft()` 都会 JSON.parse 出一组全新的对象引用，所以不能用 === 来定位 row.q。
  // 用 hashQuestion（题干+答案）做内容匹配，避免引用失效导致 filter 失效。
  const qHash = q => WB.validate.hashQuestion(q);

  function removeRow(row) {
    const d = draft();
    const targetHash = qHash(row.q);
    if (row.target === 'exam') {
      const g = d.examQuestions[row.gi];
      if (g) {
        const idx = g.questions.findIndex(x => qHash(x) === targetHash);
        if (idx >= 0) g.questions.splice(idx, 1);
        if (!g.questions.length) {
          // 删光了 → 留个"待清空"意图，本地 group 移除；但下次"同步题目"时把云端该组也置空，
          // 否则「从云端拉取」会把旧题又拉回来。
          d._examGroupsCleared = d._examGroupsCleared || [];
          d._examGroupsCleared.push({ courseId: g.courseId, examType: g.examType, level: g.level });
          d.examQuestions.splice(row.gi, 1);
        }
      }
    } else {
      const ls = findLesson(d, row.lessonKey);
      if (ls) {
        const arr = row.target === 'learn' ? (ls.questions || []) : (ls.chapterQuestions || []);
        const idx = arr.findIndex(x => qHash(x) === targetHash);
        if (idx >= 0) arr.splice(idx, 1);
      }
    }
    persist(d);
  }

  // 批量清空考试题：考试题独立于学科，可能整门学科都没了但题还在，
  // 一道道点删除太慢，且用户要的就是"全部清掉"。清空同样入队 _examGroupsCleared，
  // 云端在下次「同步题目」时置空。
  function clearExamGroups(scope) {
    const d = draft();
    const isGroupKey = typeof scope === 'string' && scope.indexOf('|') >= 0;
    const groups = (d.examQuestions || []).filter(g => scope === 'all' || (isGroupKey ? examGroupKey(g) === scope : examKey(g) === scope));
    if (!groups.length) { alert('没有可清空的考试题'); return; }
    const n = groups.reduce((s, g) => s + (g.questions || []).length, 0);
    const scopeName = scope === 'all' ? '全部考试题' : (isGroupKey ? scope.split('|').join(' · ') : scope);
    if (!confirm(`将清空「${scopeName}」的 ${groups.length} 组考试题（共 ${n} 道）。\n本地立即移除，云端在下次「同步题目」时一并清空。确认继续？`)) return;
    const dd = draft();
    const targets = (dd.examQuestions || []).filter(g => scope === 'all' || (isGroupKey ? examGroupKey(g) === scope : examKey(g) === scope));
    targets.forEach(g => {
      dd._examGroupsCleared = dd._examGroupsCleared || [];
      dd._examGroupsCleared.push({ courseId: g.courseId, examType: g.examType, level: g.level });
    });
    dd.examQuestions = (dd.examQuestions || []).filter(g => !targets.includes(g));
    persist(dd);
  }

  function toggleSkip(row) { row.q._skip = !row.q._skip; persist(draft()); }

  function moveRowToLesson(row, newLessonKey) {
    if (row.target === 'exam' || row.lessonKey === newLessonKey) return;
    const d = draft();
    const from = findLesson(d, row.lessonKey);
    const to = findLesson(d, newLessonKey);
    if (!from || !to) return;
    const copy = JSON.parse(JSON.stringify(row.q));   // push 当前 d 的新对象，避免引用泄漏
    const targetHash = qHash(row.q);
    if (row.target === 'learn') {
      const fi = from.questions.findIndex(x => qHash(x) === targetHash);
      if (fi >= 0) from.questions.splice(fi, 1);
      to.questions.push(copy);
    } else {
      const fi = from.chapterQuestions.findIndex(x => qHash(x) === targetHash);
      if (fi >= 0) from.chapterQuestions.splice(fi, 1);
      to.chapterQuestions.push(copy);
    }
    row.lessonKey = newLessonKey;
    persist(d);
  }

  function moveExamRow(row, examType, level) {
    const d = draft();
    const oldG = d.examQuestions[row.gi];
    // 学科归属：优先沿用原分组，其次当前学科；都没有就明确提示，不再偷偷落到 python
    const cid = (oldG && oldG.courseId) || currentCourseId();
    if (!cid) { alert('无法确定学科归属：请先在左侧选择一个学科'); return; }
    const copy = JSON.parse(JSON.stringify(row.q));   // push 当前 d 的新对象，避免引用泄漏
    const targetHash = qHash(row.q);
    if (oldG) {
      const fi = oldG.questions.findIndex(x => qHash(x) === targetHash);
      if (fi >= 0) oldG.questions.splice(fi, 1);
      if (!oldG.questions.length) d.examQuestions.splice(row.gi, 1);
    }
    let g = d.examQuestions.find(x => x.courseId === cid && x.examType === examType && x.level === level);
    if (!g) { g = { courseId: cid, examType, level, questions: [] }; d.examQuestions.push(g); }
    g.questions.push(copy);
    persist(d);
  }

  // ===== 三个来源入口 =====
  // examTarget（可选）：{ courseId, examType, level }。在考试题子区粘贴时传入，
  // 让解析出的考试题统一落到"当前选中的分类"，实现"目标优先"录入。
  function addFromMaterial(text, examTarget) {
    const parsed = WB.parser.parseMaterial(text);
    const d = draft();
    const sel = WB.treeUI.getSelected();
    const lessonKey = sel && sel.lessonKey;
    const ls = lessonKey ? findLesson(d, lessonKey) : null;
    const cid = (sel && sel.courseId) || currentCourseId();
    let added = 0;
    parsed.chapters.forEach(ch => ch.lessons.forEach(pl => {
      if (!ls) { alert('请先在左侧选中一个知识点，作为题目挂载点'); return; }
      pl.questions.forEach(q => { ls.questions.push(q); added++; });
      pl.chapterQuestions.forEach(q => { ls.chapterQuestions.push(q); added++; });
    }));
    parsed.examGroups.forEach(pg => {
      const tgt = examTarget || { courseId: cid, examType: pg.examType, level: pg.level };
      if (!tgt.courseId) { alert('无法确定学科归属：请先在左侧选择一个学科'); return; }
      let g = d.examQuestions.find(x => x.courseId === tgt.courseId && x.examType === tgt.examType && x.level === tgt.level);
      if (!g) { g = { courseId: tgt.courseId, examType: tgt.examType, level: tgt.level, questions: [] }; d.examQuestions.push(g); }
      pg.questions.forEach(q => { g.questions.push(q); added++; });
    });
    persist(d);
    alert('已加入 ' + added + ' 道题');
  }

  // 按"本分类"用本地模型生成考试题：学科 + 考试类型 + 级别即上下文，不依赖知识点三段内容。
  async function generateExamByAI(count) {
    if (!activeExamKey) { alert('请先在左侧选择一个考试分类'); return; }
    const { courseId, examType, level } = parseExamKey(activeExamKey);
    const d = draft();
    const cname = (d.tree[courseId] && d.tree[courseId].name) || courseId || '未标注学科';
    const prompt = `你是少儿编程等级考试出题专家。请生成 ${count} 道「${cname} / ${examType} / ${level}」考试的练习题。
要求：覆盖该级别常见考点，题干清晰、答案唯一；选择题给出 A-D 四个选项，答案填选项字母；解析一两句话点明考点。
只输出 JSON 数组，每项格式：{"type":"choice"|"fill","question":"…","options":{"A":"…","B":"…","C":"…","D":"…"},"answer":"…","explanation":"…"}（填空题 type 为 "fill"，不需要 options 字段）。`;
    let arr;
    try {
      const out = await WB.ollama.chat([{ role: 'user', content: prompt }], { model: 'qwen3:4b' });
      arr = WB.ollama.extractJSON(out);
    } catch (e) { alert('本地模型调用失败：' + e.message + '\n（双击「启动本地模型.bat」启用本地模型后再试）'); return; }
    if (!Array.isArray(arr)) { alert('模型未返回题目数组，请重试'); return; }
    arr.forEach(q => { if (q.type === '选择') q.type = 'choice'; else if (q.type === '填空') q.type = 'fill'; });
    const dd = draft();
    let g = dd.examQuestions.find(x => x.courseId === courseId && x.examType === examType && x.level === level);
    if (!g) { g = { courseId, examType, level, questions: [] }; dd.examQuestions.push(g); }
    arr.forEach(q => g.questions.push(q));
    persist(dd);
    alert('已生成 ' + arr.length + ' 道题，请逐题校对');
  }

  async function generateByAI(count) {
    const ls = currentLesson();
    if (!ls) { alert('请先选中知识点'); return; }
    if (!WB.state.contentDone(ls)) { alert('请先完成该知识点的三段内容'); return; }
    const prompt = `根据以下知识点速记出 ${count} 道练习题，优先针对【易混淆】出对比题。\n【概念】${ls.content.concept}\n【特征】${ls.content.feature}\n【易混淆】${ls.content.confusion}\n要求：题干清晰、答案唯一、解析一两句话。只输出 JSON 数组，每项：{"type":"choice"|"fill","question":"…","options":{"A":"…","B":"…","C":"…","D":"…"},"answer":"…","explanation":"…"}（选择题才需要 options，答案填选项字母）`;
    let arr;
    try {
      const out = await WB.ollama.chat([{ role: 'user', content: prompt }], { model: 'qwen3:4b' });
      arr = WB.ollama.extractJSON(out);
    } catch (e) { alert('本地模型调用失败：' + e.message + '\n（双击「启动本地模型.bat」，或改用在结构页「解析入树」）'); return; }
    if (!Array.isArray(arr)) { alert('模型未返回题目数组，请重试'); return; }
    arr.forEach(q => { if (q.type === '选择') q.type = 'choice'; else if (q.type === '填空') q.type = 'fill'; ls.chapterQuestions.push(q); });
    persist(draft());
    alert('已生成 ' + arr.length + ' 道题，请逐题校对');
  }

  function addManual(payload) {
    const ls = currentLesson();
    if (!ls) { alert('请先选中知识点'); return; }
    const q = { type: payload.type, question: payload.question, answer: payload.answer, explanation: payload.explanation || '' };
    if (payload.type === 'choice') q.options = { A: payload.A || '', B: payload.B || '', C: payload.C || '', D: payload.D || '' };
    (payload.target === 'learn' ? ls.questions : ls.chapterQuestions).push(q);
    persist(draft());
  }

  function validateAll(rows) {
    let errs = 0;
    rows.forEach(r => { r.errors = WB.validate.validateQuestion(r.q); if (r.errors.length) errs++; });
    render();
    return errs;
  }
  function dedupAll(rows) {
    if (!WB.syncUI || !WB.syncUI.existing) { alert('请先在「结构与内容」页签点「从云端拉取」，才能比对去重'); return; }
    WB.validate.markDuplicates(rows.map(r => r.q), WB.syncUI.existing());
    render();
  }

  // ===== 渲染 =====
  // 顶部分段开关：知识点题 / 考试题。考试题是独立实体，单独成区、自带分类导航。
  function render() {
    const host = $('wb-workspace');
    if (!host) return;
    host.innerHTML = '';
    const seg = el('div', 'wb-quiz-seg');
    const t1 = el('span', 'wb-seg-item' + (viewMode === 'knowledge' ? ' on' : ''), '知识点题');
    const t2 = el('span', 'wb-seg-item' + (viewMode === 'exam' ? ' on' : ''), '考试题');
    t1.onclick = () => { viewMode = 'knowledge'; activeExamKey = null; render(); };
    t2.onclick = () => { viewMode = 'exam'; render(); };
    seg.appendChild(t1); seg.appendChild(t2);
    host.appendChild(seg);
    if (viewMode === 'exam') renderExam(host); else renderKnowledge(host);
  }

  // 知识点题子区：学习题 + 章节题，挂在当前选中的知识点下（沿用旧行为）
  function renderKnowledge(host) {
    const d = draft();
    const lesson = currentLesson();
    const lessons = allLessons(d);
    const rows = buildKnowledgeRows();

    const left = el('div', 'wb-quiz-l');
    const right = el('div', 'wb-quiz-r');

    const srcRow = el('div', 'wb-quiz-src-row');
    const btnManual = el('button', 'wb-btn', '＋ 手动加题');
    btnManual.onclick = () => showManualForm('knowledge');
    srcRow.appendChild(btnManual);

    const genWrap = el('span', 'wb-inline');
    const genSel = document.createElement('select'); genSel.className = 'wb-sel';
    [2, 3, 5].forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n + ' 道'; genSel.appendChild(o); });
    const btnGen = el('button', 'wb-btn primary', '基于本知识点现编');
    btnGen.onclick = () => generateByAI(parseInt(genSel.value, 10));
    genWrap.appendChild(genSel); genWrap.appendChild(btnGen);
    const blockReason = !lesson ? '先在左侧选中一个知识点'
      : !WB.state.contentDone(lesson) ? '该知识点三段未填完' : '';
    if (blockReason) {
      btnGen.disabled = true;
      const tip = el('span', 'wb-muted', blockReason); tip.style.color = 'var(--wb-warn)';
      genWrap.appendChild(tip);
    }
    srcRow.appendChild(genWrap);

    const btnPaste = el('button', 'wb-btn', '粘贴题目素材');
    btnPaste.onclick = () => showPasteBox('knowledge');
    srcRow.appendChild(btnPaste);
    left.appendChild(srcRow);

    if (blockReason) {
      const w = el('div', 'wb-note', 'AI 现编需要：选中知识点 + 该知识点「概念 / 特征 / 易混淆」三段都填完。也可以先把三段补全，或改用「粘贴题目素材」。');
      w.style.margin = '0 0 11px';
      left.appendChild(w);
    }

    const bar = el('div', 'wb-quiz-bar');
    const btnVal = el('button', 'wb-btn', '校验全部');
    btnVal.onclick = () => { const n = validateAll(buildKnowledgeRows()); alert(n ? '有 ' + n + ' 题未通过校验（已标红，右侧问题清单可点定位）' : '全部通过校验'); };
    const btnDup = el('button', 'wb-btn', '检查重复');
    btnDup.onclick = () => dedupAll(buildKnowledgeRows());
    const filters = el('div', 'wb-filters');
    [['all', '全部'], ['learn', '学习题'], ['chapter', '章节题']].forEach(([k, t], i) => {
      const f = el('span', 'wb-f-item' + (i === 0 ? ' on' : ''), t);
      f.onclick = () => {
        filters.querySelectorAll('.wb-f-item').forEach(x => x.classList.remove('on'));
        f.classList.add('on');
        applyFilter(left, k);
      };
      filters.appendChild(f);
    });
    bar.appendChild(btnVal); bar.appendChild(btnDup); bar.appendChild(filters);
    const cnt = el('span', 'wb-muted', '共 ' + rows.length + ' 题');
    cnt.style.marginLeft = 'auto';
    bar.appendChild(cnt);
    left.appendChild(bar);

    const forms = el('div'); left.appendChild(forms);
    const list = el('div'); list.id = 'wb-qlist'; left.appendChild(list);

    host.appendChild(left);
    host.appendChild(right);

    renderList(list, rows, lessons);
    renderInspector(right, rows);
  }

  // 考试题子区：左侧分类导航 + 右侧质量检查。分类 = 学科·类型·级别，相互独立、独立同步/删除。
  function renderExam(host) {
    const d = draft();
    const left = el('div', 'wb-quiz-l');
    const right = el('div', 'wb-quiz-r');

    // 学科筛选（仅过滤分类导航，不改题目归属；考试题本身跨学科可见）
    const filterRow = el('div', 'wb-quiz-bar');
    filterRow.appendChild(el('span', 'wb-muted', '学科'));
    const fsel = document.createElement('select'); fsel.className = 'wb-sel';
    const oAll = document.createElement('option'); oAll.value = 'all'; oAll.textContent = '全部学科'; fsel.appendChild(oAll);
    const examCids = [...new Set((d.examQuestions || []).map(g => g.courseId || '(未标注)'))];
    examCids.forEach(cid => {
      const o = document.createElement('option'); o.value = cid;
      const alive = d.tree[cid];
      o.textContent = alive ? (alive.name || cid) : (cid === '(未标注)' ? cid : cid + '（学科已删）');
      fsel.appendChild(o);
    });
    fsel.value = examCourseFilter;
    fsel.onchange = () => { examCourseFilter = fsel.value; render(); };
    filterRow.appendChild(fsel);
    left.appendChild(filterRow);

    // 分类导航：每个「类型·级别」一张卡，带题数、＋（加题）、清空。点击卡片=选中该组过滤。
    const nav = el('div', 'wb-exam-nav');
    const groups = (d.examQuestions || []).filter(g => examCourseFilter === 'all' || (g.courseId || '(未标注)') === examCourseFilter);
    if (!groups.length) {
      nav.appendChild(el('div', 'wb-muted', '还没有任何考试题分类。点下方「＋ 新建分类」，或在右侧用「手动加一道 / 粘贴素材 / AI 按本分类生成」。'));
    }
    groups.forEach(g => {
      const key = examGroupKey(g);
      const card = el('div', 'wb-exam-grp' + (activeExamKey === key ? ' on' : ''));
      const sw = el('span', 'wb-swatch'); sw.style.background = (d.tree[g.courseId] && d.tree[g.courseId].color) || '#BA7517';
      card.appendChild(sw);
      card.appendChild(el('span', 'wb-exam-grp-name', (g.examType || '?') + ' · ' + (g.level || '?')));
      card.appendChild(el('span', 'wb-exam-grp-n', String((g.questions || []).length)));
      const acts = el('span', 'wb-exam-grp-acts');
      const bAdd = el('button', 'wb-btn sm', '＋'); bAdd.title = '向该分类加题';
      bAdd.onclick = (e) => { e.stopPropagation(); activeExamKey = key; showManualForm('exam'); };
      const bClear = el('button', 'wb-btn sm danger', '清空'); bClear.title = '清空该组（云端在下次同步题目时置空）';
      bClear.onclick = (e) => { e.stopPropagation(); clearExamGroups(key); };
      acts.appendChild(bAdd); acts.appendChild(bClear);
      card.appendChild(acts);
      card.onclick = () => { activeExamKey = (activeExamKey === key ? null : key); render(); };
      nav.appendChild(card);
    });
    left.appendChild(nav);

    const newBtn = el('button', 'wb-btn-dash', '＋ 新建分类'); newBtn.style.margin = '7px 0 11px';
    newBtn.onclick = () => showNewCategoryForm();
    left.appendChild(newBtn);

    // 当前组来源入口：手动加一道 / 粘贴素材 / AI 按本分类生成（目标优先，直接进当前组）
    const srcRow = el('div', 'wb-quiz-src-row');
    const bManual = el('button', 'wb-btn', '手动加一道'); bManual.onclick = () => showManualForm('exam');
    const bPaste = el('button', 'wb-btn', '粘贴题目素材'); bPaste.onclick = () => showPasteBox('exam');
    const genWrap = el('span', 'wb-inline');
    const genSel = document.createElement('select'); genSel.className = 'wb-sel';
    [2, 3, 5, 8].forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n + ' 道'; genSel.appendChild(o); });
    const bGen = el('button', 'wb-btn primary', 'AI 按本分类生成'); bGen.onclick = () => generateExamByAI(parseInt(genSel.value, 10));
    genWrap.appendChild(genSel); genWrap.appendChild(bGen);
    if (!activeExamKey) {
      bGen.disabled = true;
      const tip = el('span', 'wb-muted', '先选一个分类'); tip.style.color = 'var(--wb-warn)';
      genWrap.appendChild(tip);
    }
    srcRow.appendChild(bManual); srcRow.appendChild(bPaste); srcRow.appendChild(genWrap);
    left.appendChild(srcRow);

    const rows = buildExamRows();
    const bar = el('div', 'wb-quiz-bar');
    const btnVal = el('button', 'wb-btn', '校验全部');
    btnVal.onclick = () => { const n = validateAll(buildExamRows()); alert(n ? '有 ' + n + ' 题未通过校验（已标红）' : '全部通过校验'); };
    const btnDup = el('button', 'wb-btn', '检查重复'); btnDup.onclick = () => dedupAll(buildExamRows());
    const clr = el('button', 'wb-btn danger', '清空本组'); clr.onclick = () => clearExamGroups(activeExamKey || 'all');
    clr.disabled = !activeExamKey;
    bar.appendChild(btnVal); bar.appendChild(btnDup); bar.appendChild(clr);
    const scopeName = activeExamKey ? activeExamKey.split('|').join(' · ') : '全部考试题';
    const cnt = el('span', 'wb-muted', '当前：' + scopeName + ' · 共 ' + rows.length + ' 题');
    cnt.style.marginLeft = 'auto';
    bar.appendChild(cnt);
    left.appendChild(bar);

    const forms = el('div'); left.appendChild(forms);
    const list = el('div'); list.id = 'wb-qlist'; left.appendChild(list);

    host.appendChild(left);
    host.appendChild(right);

    renderList(list, rows, allLessons(d));
    renderInspector(right, rows);
  }

  function applyFilter(left, kind) {
    const list = $('wb-qlist');
    const rows = buildKnowledgeRows().filter(r => kind === 'all' || r.target === kind);
    renderList(list, rows, allLessons(draft()));
    renderInspector(document.querySelector('.wb-quiz-r'), rows);
    const cnt = document.querySelector('.wb-quiz-l .wb-quiz-bar .wb-muted');
    if (cnt) cnt.textContent = '共 ' + rows.length + ' 题';
  }

  function renderList(host, rows, lessons) {
    host.innerHTML = '';
    if (!rows.length) {
      const empty = el('div', 'wb-muted', '还没有题目。用上方入口添加：手动加题 / AI 现编 / 粘贴素材。');
      empty.style.padding = '18px 2px';
      host.appendChild(empty);
      return;
    }
    rows.forEach((r, i) => host.appendChild(renderCard(r, lessons, i)));
  }

  function renderCard(row, lessons, idx) {
    const q = row.q;
    const isDup = q.rowStatus === 'dup';
    const card = el('div', 'wb-qcard');
    card.id = 'wbq-' + idx;
    if (row.errors && row.errors.length) card.classList.add('err');
    if (q._skip) card.classList.add('skip');
    if (isDup) card.classList.add('dup');

    const head = el('div', 'wb-qcard-head');
    const typeSel = document.createElement('select'); typeSel.className = 'wb-sel';
    typeSel.innerHTML = '<option value="choice">选择题</option><option value="fill">填空题</option>';
    typeSel.value = q.type === 'fill' ? 'fill' : 'choice';
    typeSel.onchange = () => { q.type = typeSel.value; if (q.type === 'choice' && !q.options) q.options = { A: '', B: '', C: '', D: '' }; persist(draft()); };
    head.appendChild(typeSel);
    head.appendChild(el('span', 'wb-tag', row.target === 'learn' ? '学习题' : row.target === 'chapter' ? '章节题' : '考试题'));
    // 考试题独立于学科：直接标出它属于哪门课，孤儿题（学科已删）也能一眼认出
    if (row.target === 'exam') head.appendChild(el('span', 'wb-tag', row.courseId || '未标注学科'));
    const status = el('span', 'wb-qstatus',
      q._skip ? '已跳过' : isDup ? '重复' : (row.errors && row.errors.length) ? '有错误' : '正常');
    head.appendChild(status);
    const acts = el('span', 'wb-qcard-acts');
    const btnSkip = el('button', 'wb-btn sm', q._skip ? '恢复' : '跳过');
    btnSkip.onclick = () => toggleSkip(row);
    const btnDel = el('button', 'wb-btn sm danger', '删除');
    btnDel.onclick = () => removeRow(row);
    acts.appendChild(btnSkip); acts.appendChild(btnDel);
    head.appendChild(acts);
    card.appendChild(head);

    if (row.errors && row.errors.length) card.appendChild(el('div', 'wb-qerr', row.errors.join('；')));

    const body = el('div', 'wb-qcard-body');
    const qInput = document.createElement('input'); qInput.className = 'wb-qinput'; qInput.placeholder = '题干';
    qInput.value = q.question || '';
    qInput.oninput = () => { q.question = qInput.value; schedulePersist(); };
    body.appendChild(qInput);

    if (q.type === 'choice') {
      q.options = q.options || { A: '', B: '', C: '', D: '' };
      const opts = el('div', 'wb-qopts');
      ['A', 'B', 'C', 'D'].forEach(k => {
        const o = document.createElement('input'); o.className = 'wb-qopt'; o.placeholder = k + ' 选项';
        o.value = q.options[k] || '';
        o.oninput = () => { q.options[k] = o.value; schedulePersist(); };
        opts.appendChild(o);
      });
      body.appendChild(opts);
    }

    const bottom = el('div', 'wb-qcard-bottom');
    const ans = document.createElement('input'); ans.className = 'wb-qinput wb-qans'; ans.placeholder = '答案';
    ans.value = q.answer || '';
    ans.oninput = () => { q.answer = ans.value; schedulePersist(); };
    const exp = document.createElement('input'); exp.className = 'wb-qinput wb-qexp'; exp.placeholder = '解析（可选）';
    exp.value = q.explanation || '';
    exp.oninput = () => { q.explanation = exp.value; schedulePersist(); };
    bottom.appendChild(ans); bottom.appendChild(exp);
    body.appendChild(bottom);

    if (row.target === 'exam') {
      const move = el('div', 'wb-qcard-move');
      const typeOpts = [...new Set([...EXAM_TYPES, row.examType].filter(Boolean))];
      const ts = document.createElement('select'); ts.className = 'wb-sel';
      typeOpts.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; if (t === row.examType) o.selected = true; ts.appendChild(o); });
      ts.onchange = () => moveExamRow(row, ts.value, row.level);
      move.appendChild(label('考试类型', ts));
      const levelOpts = [...new Set([...LEVELS, row.level].filter(Boolean))];
      const lsel = document.createElement('select'); lsel.className = 'wb-sel';
      levelOpts.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; if (l === row.level) o.selected = true; lsel.appendChild(o); });
      lsel.onchange = () => moveExamRow(row, row.examType, lsel.value);
      move.appendChild(label('级别', lsel));
      body.appendChild(move);
    } else {
      const move = el('div', 'wb-qcard-move');
      const sel = document.createElement('select'); sel.className = 'wb-sel';
      lessons.forEach(l => {
        const o = document.createElement('option'); o.value = l.lessonKey;
        o.textContent = (l.chapterTitle ? l.chapterTitle + ' / ' : '') + l.title;
        if (l.lessonKey === row.lessonKey) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => moveRowToLesson(row, sel.value);
      move.appendChild(label('归属知识点', sel));
      body.appendChild(move);
    }
    card.appendChild(body);
    return card;
  }

  // ===== 右侧质量检查面板 =====
  function renderInspector(host, rows) {
    host.innerHTML = '';
    const cid = currentCourseId();
    const d = draft();
    const cname = viewMode === 'exam'
      ? (activeExamKey ? activeExamKey.split('|').join(' · ') : '全部考试题')
      : (cid && d.tree[cid] ? (d.tree[cid].name || cid) : '全部学科');
    let errs = [], dups = [], skipN = 0;
    const byType = { learn: 0, chapter: 0, exam: 0 };
    rows.forEach((r, i) => {
      byType[r.target] = (byType[r.target] || 0) + 1;
      const e = WB.validate.validateQuestion(r.q);
      if (e.length) errs.push({ i, text: r.q.question || '（空题干）', e });
      if (r.q.rowStatus === 'dup') dups.push({ i, text: r.q.question || '（空题干）' });
      if (r.q._skip) skipN++;
    });
    const total = rows.length || 1;

    // 概览
    const c1 = el('div', 'wb-card');
    const h1 = el('div', 'wb-card-hd'); h1.appendChild(el('h3', null, '质量检查'));
    const hr = el('div', 'wb-card-hd-right'); hr.appendChild(el('span', 'wb-muted', cname)); h1.appendChild(hr);
    c1.appendChild(h1);
    const b1 = el('div', 'wb-card-bd');
    const stats = el('div', 'wb-qstat');
    stats.innerHTML =
      '<div><i>题目总数</i><b>' + rows.length + '</b></div>' +
      '<div><i>待修正</i><b style="color:' + (errs.length ? 'var(--wb-err)' : 'inherit') + '">' + errs.length + '</b></div>' +
      '<div><i>疑似重复</i><b style="color:' + (dups.length ? 'var(--wb-warn)' : 'inherit') + '">' + dups.length + '</b></div>' +
      '<div><i>已跳过</i><b>' + skipN + '</b></div>';
    b1.appendChild(stats);
    const dist = el('div', 'wb-dist');
    [['学习题', byType.learn || 0, '#5B67F1'], ['章节题', byType.chapter || 0, '#1D9E75'], ['考试题', byType.exam || 0, '#BA7517']]
      .forEach(([name, n, color]) => {
        const row = el('div', 'wb-dist-row');
        const nm = el('span', null, name); nm.style.width = '44px';
        const bar = el('span', 'wb-dist-bar');
        const fill = document.createElement('i'); fill.style.width = Math.round(n * 100 / total) + '%'; fill.style.background = color;
        bar.appendChild(fill);
        const num = el('span', null, String(n)); num.style.cssText = 'width:22px;text-align:right;color:var(--wb-faint)';
        row.appendChild(nm); row.appendChild(bar); row.appendChild(num);
        dist.appendChild(row);
      });
    b1.appendChild(dist);
    c1.appendChild(b1);
    host.appendChild(c1);

    // 问题清单
    const c2 = el('div', 'wb-card');
    const h2 = el('div', 'wb-card-hd'); h2.appendChild(el('h3', null, '问题清单'));
    const hr2 = el('div', 'wb-card-hd-right'); hr2.appendChild(el('span', 'wb-muted', (errs.length + dups.length) + ' 条')); h2.appendChild(hr2);
    c2.appendChild(h2);
    const b2 = el('div', 'wb-card-bd'); b2.style.padding = '6px 8px';
    if (!errs.length && !dups.length) {
      const t = el('div', 'wb-muted', '还没跑校验。点上方「校验全部 / 检查重复」，问题会汇总到这里，点一条可直接跳到那道题。');
      t.style.lineHeight = '1.7';
      b2.appendChild(t);
    } else {
      errs.forEach(x => b2.appendChild(issueEl('e', '错误', x.i, x.text)));
      dups.forEach(x => b2.appendChild(issueEl('d', '重复', x.i, x.text)));
    }
    c2.appendChild(b2);
    host.appendChild(c2);

    // 批量操作
    const c3 = el('div', 'wb-card');
    const h3 = el('div', 'wb-card-hd'); h3.appendChild(el('h3', null, '批量操作')); c3.appendChild(h3);
    const b3 = el('div', 'wb-card-bd');
    const bClear = el('button', 'wb-btn sm', '清除已跳过（' + skipN + '）');
    bClear.style.cssText = 'width:100%;margin-bottom:6px;';
    bClear.onclick = () => clearSkipped();
    const bExport = el('button', 'wb-btn sm', '导出本学科题目 JSON');
    bExport.style.cssText = 'width:100%;';
    bExport.onclick = () => exportJSON();
    b3.appendChild(bClear); b3.appendChild(bExport);
    b3.appendChild(el('div', 'wb-note', '同步前会先跑硬校验；有错题会拦住，已跳过的题不参与。'));
    c3.appendChild(b3);
    host.appendChild(c3);
  }

  function issueEl(kind, tagText, idx, text) {
    const it = el('div', 'wb-iss');
    it.appendChild(el('span', 'k ' + kind, tagText));
    it.appendChild(el('span', 't', text));
    it.onclick = () => {
      const target = $('wbq-' + idx);
      if (!target) { alert('这道题被当前筛选隐藏了'); return; }
      target.scrollIntoView({ block: 'center' });
      target.classList.add('flash');
      setTimeout(() => target.classList.remove('flash'), 900);
    };
    return it;
  }

  function clearSkipped() {
    const d = draft();
    let n = 0;
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => ch.lessons.forEach(ls => {
      ['questions', 'chapterQuestions'].forEach(k => {
        const before = (ls[k] || []).length;
        ls[k] = (ls[k] || []).filter(q => { if (q._skip) { n++; return false; } return true; });
        if ((ls[k] || []).length !== before) { /* changed */ }
      });
    })));
    (d.examQuestions || []).forEach(g => { const before = g.questions.length; g.questions = g.questions.filter(q => { if (q._skip) { n++; return false; } return true; }); });
    WB.state.save(d);
    render();
    alert(n ? '已清除 ' + n + ' 道已跳过的题' : '没有已跳过的题');
  }

  function exportJSON() {
    const d = draft();
    if (viewMode === 'exam') {
      const groups = (d.examQuestions || []).filter(g => !activeExamKey || examGroupKey(g) === activeExamKey);
      const blob = new Blob([JSON.stringify({ examQuestions: groups }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (activeExamKey ? activeExamKey.replace(/\|/g, '_') : 'all') + '-exam-questions.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      return;
    }
    const cid = currentCourseId();
    const out = { courseId: cid, chapters: [], examQuestions: [] };
    const c = cid ? d.tree[cid] : null;
    if (c) c.chapters.forEach(ch => out.chapters.push({
      title: ch.title, lessons: ch.lessons.map(ls => ({
        title: ls.title, content: ls.content, codeExample: ls.codeExample,
        questions: ls.questions || [], chapterQuestions: ls.chapterQuestions || []
      }))
    }));
    (d.examQuestions || []).forEach(g => { if (!cid || !g.courseId || g.courseId === cid) out.examQuestions.push(g); });
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (cid || 'all') + '-questions.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function label(text, elx) {
    const l = document.createElement('label'); l.className = 'wb-flabel';
    l.appendChild(document.createTextNode(text + '：'));
    l.appendChild(elx);
    return l;
  }

  // 手动加题表单。mode='knowledge' 落到选中知识点；mode='exam' 落到指定「学科·类型·级别」组（目标优先）。
  function showManualForm(mode) {
    const host = document.querySelector('.wb-quiz-l');
    const existing = $('wb-manual-form');
    if (existing) { existing.remove(); return; }
    const form = el('div', 'wb-qcard'); form.id = 'wb-manual-form';
    form.appendChild(el('h3', 'wb-panel-title', mode === 'exam' ? '手动加考试题' : '手动加题'));
    const type = document.createElement('select'); type.className = 'wb-sel';
    type.innerHTML = '<option value="choice">选择题</option><option value="fill">填空题</option>';
    form.appendChild(type);
    const q = mkInput(form, '题干');
    const A = mkInput(form, '选项A'), B = mkInput(form, '选项B'), C = mkInput(form, '选项C'), D = mkInput(form, '选项D');
    const ans = mkInput(form, '答案'), exp = mkInput(form, '解析（可选）');
    let cidSel, etSel, lvSel, targetSel;
    const d = draft();
    if (mode === 'exam') {
      const gk = activeExamKey ? parseExamKey(activeExamKey) : null;
      cidSel = document.createElement('select'); cidSel.className = 'wb-sel';
      const cids = [...new Set([...Object.keys(d.tree), gk ? gk.courseId : null].filter(Boolean))];
      if (!cids.length) cidSel.innerHTML = '<option value="">（暂无学科，请先建学科）</option>';
      cids.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = (d.tree[c] && d.tree[c].name) || c; if (gk && gk.courseId === c) o.selected = true; cidSel.appendChild(o); });
      etSel = document.createElement('select'); etSel.className = 'wb-sel';
      [...new Set([...EXAM_TYPES, gk ? gk.examType : null].filter(Boolean))].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; if (gk && gk.examType === t) o.selected = true; etSel.appendChild(o); });
      lvSel = document.createElement('select'); lvSel.className = 'wb-sel';
      [...new Set([...LEVELS, gk ? gk.level : null].filter(Boolean))].forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; if (gk && gk.level === l) o.selected = true; lvSel.appendChild(o); });
      form.appendChild(label('学科', cidSel));
      form.appendChild(label('考试类型', etSel));
      form.appendChild(label('级别', lvSel));
    } else {
      targetSel = document.createElement('select'); targetSel.className = 'wb-sel';
      targetSel.innerHTML = '<option value="chapter">章节题</option><option value="learn">学习题</option>';
      form.appendChild(targetSel);
    }
    const save = el('button', 'wb-btn primary', '加入');
    save.onclick = () => {
      const payload = { type: type.value, question: q.value, A: A.value, B: B.value, C: C.value, D: D.value, answer: ans.value, explanation: exp.value };
      if (mode === 'exam') addManualExam(Object.assign(payload, { courseId: cidSel.value, examType: etSel.value, level: lvSel.value }));
      else addManual(Object.assign(payload, { target: targetSel.value }));
      form.remove();
    };
    form.appendChild(save);
    host.insertBefore(form, host.children[2] || host.firstChild);
  }

  // 手动加考试题：落到 (courseId, examType, level) 组，组不存在则创建；顺手把当前选中切到该组。
  function addManualExam(payload) {
    const courseId = payload.courseId;
    if (!courseId) { alert('请先创建一个学科，再添加考试题'); return; }
    const d = draft();
    let g = d.examQuestions.find(x => x.courseId === courseId && x.examType === payload.examType && x.level === payload.level);
    if (!g) { g = { courseId, examType: payload.examType, level: payload.level, questions: [] }; d.examQuestions.push(g); }
    const q = { type: payload.type, question: payload.question, answer: payload.answer, explanation: payload.explanation || '' };
    if (payload.type === 'choice') q.options = { A: payload.A || '', B: payload.B || '', C: payload.C || '', D: payload.D || '' };
    g.questions.push(q);
    if (activeExamKey === null) activeExamKey = examGroupKey(g);
    persist(d);
  }

  // 新建一个空考试分类（补"空白分类"，方便之后往里加题）
  function showNewCategoryForm() {
    const host = document.querySelector('.wb-quiz-l');
    const existing = $('wb-newcat-form');
    if (existing) { existing.remove(); return; }
    const form = el('div', 'wb-qcard'); form.id = 'wb-newcat-form';
    form.appendChild(el('h3', 'wb-panel-title', '新建考试分类'));
    const d = draft();
    const cidSel = document.createElement('select'); cidSel.className = 'wb-sel';
    const cids = Object.keys(d.tree);
    if (!cids.length) cidSel.innerHTML = '<option value="">（暂无学科）</option>';
    cids.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = (d.tree[c] && d.tree[c].name) || c; cidSel.appendChild(o); });
    const etSel = document.createElement('select'); etSel.className = 'wb-sel';
    EXAM_TYPES.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; etSel.appendChild(o); });
    const lvSel = document.createElement('select'); lvSel.className = 'wb-sel';
    LEVELS.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; lvSel.appendChild(o); });
    form.appendChild(label('学科', cidSel));
    form.appendChild(label('考试类型', etSel));
    form.appendChild(label('级别', lvSel));
    const save = el('button', 'wb-btn primary', '创建');
    save.onclick = () => {
      if (!cidSel.value) { alert('请先创建一门学科'); form.remove(); return; }
      const dd = draft();
      let g = dd.examQuestions.find(x => x.courseId === cidSel.value && x.examType === etSel.value && x.level === lvSel.value);
      if (!g) { g = { courseId: cidSel.value, examType: etSel.value, level: lvSel.value, questions: [] }; dd.examQuestions.push(g); }
      activeExamKey = examGroupKey(g);
      persist(dd);
    };
    form.appendChild(save);
    host.insertBefore(form, host.children[2] || host.firstChild);
  }
  function mkInput(host, ph) {
    const i = document.createElement('input'); i.className = 'wb-qinput'; i.placeholder = ph;
    i.style.marginBottom = '6px';
    host.appendChild(i); return i;
  }
  function showPasteBox(mode) {
    const host = document.querySelector('.wb-quiz-l');
    const existing = $('wb-paste-box');
    if (existing) { existing.remove(); return; }
    const box = el('div', 'wb-qcard'); box.id = 'wb-paste-box';
    box.appendChild(el('h3', 'wb-panel-title', '粘贴题目素材'));
    const ta = document.createElement('textarea'); ta.className = 'wb-material'; ta.style.minHeight = '110px';
    ta.placeholder = '按模板粘贴题目行（【学习题】【章节题】【考试题】(类型,级别)）';
    box.appendChild(ta);
    const btn = el('button', 'wb-btn primary', '解析入表');
    btn.onclick = () => {
      const target = (mode === 'exam' && activeExamKey) ? parseExamKey(activeExamKey) : null;
      addFromMaterial(ta.value, target);
      box.remove();
    };
    box.appendChild(btn);
    host.insertBefore(box, host.children[2] || host.firstChild);
  }

  let persistTimer = null;
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { WB.state.save(draft()); if (window.WBRefreshStat) WBRefreshStat(); }, 400);
  }

  return { render };
});
