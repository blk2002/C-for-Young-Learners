(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.quizUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const EXAM_TYPES = ['CIE', 'GESP', 'CSP-J'];
  const LEVELS = ['一级', '二级', '三级', '入门级'];
  const draft = () => WB.state.load();
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

  // 行列表：{ q(题对象引用), target, lessonKey, examType, level, gi }
  function buildRows() {
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
    const cid = currentCourseId();
    (d.examQuestions || []).forEach((g, gi) => {
      if (cid && g.courseId && g.courseId !== cid) return;
      (g.questions || []).forEach(q => rows.push({ q, target: 'exam', examType: g.examType, level: g.level, gi }));
    });
    return rows;
  }

  function persist(d) { WB.state.save(d); render(); if (window.WBRefreshStat) WBRefreshStat(); }

  // ===== 删除 / 跳过 / 归属变更 =====
  function removeRow(row) {
    const d = draft();
    if (row.target === 'exam') {
      const g = d.examQuestions[row.gi];
      if (g) { g.questions = g.questions.filter(x => x !== row.q); if (!g.questions.length) d.examQuestions.splice(row.gi, 1); }
    } else {
      const ls = findLesson(d, row.lessonKey);
      if (ls) {
        if (row.target === 'learn') ls.questions = (ls.questions || []).filter(x => x !== row.q);
        else ls.chapterQuestions = (ls.chapterQuestions || []).filter(x => x !== row.q);
      }
    }
    persist(d);
  }

  function toggleSkip(row) { row.q._skip = !row.q._skip; persist(draft()); }

  function moveRowToLesson(row, newLessonKey) {
    if (row.target === 'exam' || row.lessonKey === newLessonKey) return;
    const d = draft();
    const from = findLesson(d, row.lessonKey);
    const to = findLesson(d, newLessonKey);
    if (!from || !to) return;
    if (row.target === 'learn') { from.questions = from.questions.filter(x => x !== row.q); to.questions.push(row.q); }
    else { from.chapterQuestions = from.chapterQuestions.filter(x => x !== row.q); to.chapterQuestions.push(row.q); }
    row.lessonKey = newLessonKey;
    persist(d);
  }

  function moveExamRow(row, examType, level) {
    const d = draft();
    const oldG = d.examQuestions[row.gi];
    // 学科归属：优先沿用原分组，其次当前学科；都没有就明确提示，不再偷偷落到 python
    const cid = (oldG && oldG.courseId) || currentCourseId();
    if (!cid) { alert('无法确定学科归属：请先在左侧选择一个学科'); return; }
    if (oldG) { oldG.questions = oldG.questions.filter(x => x !== row.q); if (!oldG.questions.length) d.examQuestions.splice(row.gi, 1); }
    let g = d.examQuestions.find(x => x.courseId === cid && x.examType === examType && x.level === level);
    if (!g) { g = { courseId: cid, examType, level, questions: [] }; d.examQuestions.push(g); }
    g.questions.push(row.q);
    persist(d);
  }

  // ===== 三个来源入口 =====
  function addFromMaterial(text) {
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
      if (!cid) { alert('无法确定学科归属：请先在左侧选择一个学科'); return; }
      let g = d.examQuestions.find(x => x.courseId === cid && x.examType === pg.examType && x.level === pg.level);
      if (!g) { g = { courseId: cid, examType: pg.examType, level: pg.level, questions: [] }; d.examQuestions.push(g); }
      pg.questions.forEach(q => { g.questions.push(q); added++; });
    });
    persist(d);
    alert('已加入 ' + added + ' 道题');
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
  function render() {
    const host = $('wb-workspace');
    if (!host) return;
    host.innerHTML = '';
    const d = draft();
    const lesson = currentLesson();
    const lessons = allLessons(d);
    const rows = buildRows();

    const left = el('div', 'wb-quiz-l');
    const right = el('div', 'wb-quiz-r');

    // 来源入口
    const srcRow = el('div', 'wb-quiz-src-row');
    const btnManual = el('button', 'wb-btn', '＋ 手动加题');
    btnManual.onclick = () => showManualForm();
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
      const tip = el('span', 'wb-muted', blockReason);
      tip.style.color = 'var(--wb-warn)';
      genWrap.appendChild(tip);
    }
    srcRow.appendChild(genWrap);

    const btnPaste = el('button', 'wb-btn', '粘贴题目素材');
    btnPaste.onclick = () => showPasteBox();
    srcRow.appendChild(btnPaste);
    left.appendChild(srcRow);

    if (blockReason) {
      const w = el('div', 'wb-note', 'AI 现编需要：选中知识点 + 该知识点「概念 / 特征 / 易混淆」三段都填完。也可以先把三段补全，或改用「粘贴题目素材」。');
      w.style.margin = '0 0 11px';
      left.appendChild(w);
    }

    // 校验 / 去重 + 筛选
    const bar = el('div', 'wb-quiz-bar');
    const btnVal = el('button', 'wb-btn', '校验全部');
    btnVal.onclick = () => { const n = validateAll(buildRows()); alert(n ? '有 ' + n + ' 题未通过校验（已标红，右侧问题清单可点定位）' : '全部通过校验'); };
    const btnDup = el('button', 'wb-btn', '检查重复');
    btnDup.onclick = () => dedupAll(buildRows());
    const filters = el('div', 'wb-filters');
    [['all', '全部'], ['learn', '学习题'], ['chapter', '章节题'], ['exam', '考试题']].forEach(([k, t], i) => {
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

  function applyFilter(left, kind) {
    const list = $('wb-qlist');
    const rows = buildRows().filter(r => kind === 'all' || r.target === kind);
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
    const cname = cid && d.tree[cid] ? (d.tree[cid].name || cid) : '全部学科';
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

  function showManualForm() {
    const host = document.querySelector('.wb-quiz-l');
    const existing = $('wb-manual-form');
    if (existing) { existing.remove(); return; }
    const form = el('div', 'wb-qcard'); form.id = 'wb-manual-form';
    form.appendChild(el('h3', 'wb-panel-title', '手动加题'));
    const type = document.createElement('select'); type.className = 'wb-sel';
    type.innerHTML = '<option value="choice">选择题</option><option value="fill">填空题</option>';
    form.appendChild(type);
    const q = mkInput(form, '题干');
    const A = mkInput(form, '选项A'), B = mkInput(form, '选项B'), C = mkInput(form, '选项C'), D = mkInput(form, '选项D');
    const ans = mkInput(form, '答案'), exp = mkInput(form, '解析（可选）');
    const target = document.createElement('select'); target.className = 'wb-sel';
    target.innerHTML = '<option value="chapter">章节题</option><option value="learn">学习题</option>';
    form.appendChild(target);
    const save = el('button', 'wb-btn primary', '加入');
    save.onclick = () => {
      addManual({ type: type.value, question: q.value, A: A.value, B: B.value, C: C.value, D: D.value, answer: ans.value, explanation: exp.value, target: target.value });
      form.remove();
    };
    form.appendChild(save);
    host.insertBefore(form, host.children[2] || host.firstChild);
  }
  function mkInput(host, ph) {
    const i = document.createElement('input'); i.className = 'wb-qinput'; i.placeholder = ph;
    i.style.marginBottom = '6px';
    host.appendChild(i); return i;
  }
  function showPasteBox() {
    const host = document.querySelector('.wb-quiz-l');
    const existing = $('wb-paste-box');
    if (existing) { existing.remove(); return; }
    const box = el('div', 'wb-qcard'); box.id = 'wb-paste-box';
    box.appendChild(el('h3', 'wb-panel-title', '粘贴题目素材'));
    const ta = document.createElement('textarea'); ta.className = 'wb-material'; ta.style.minHeight = '110px';
    ta.placeholder = '按模板粘贴题目行（【学习题】【章节题】【考试题】(类型,级别)）';
    box.appendChild(ta);
    const btn = el('button', 'wb-btn primary', '解析入表');
    btn.onclick = () => { addFromMaterial(ta.value); box.remove(); };
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
