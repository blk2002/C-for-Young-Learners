(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.quizUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const EXAM_TYPES = ['CIE', 'GESP', 'CSP-J'];
  const LEVELS = ['一级', '二级', '三级', '入门级'];
  const draft = () => WB.state.load();

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
    (d.examQuestions || []).forEach((g, gi) => (g.questions || []).forEach(q =>
      rows.push({ q, target: 'exam', examType: g.examType, level: g.level, gi })));
    return rows;
  }

  function persist(d) { WB.state.save(d); render(); WBRefreshStat(); }

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

  function toggleSkip(row) {
    row.q._skip = !row.q._skip;
    persist(draft());
  }

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
    if (oldG) { oldG.questions = oldG.questions.filter(x => x !== row.q); if (!oldG.questions.length) d.examQuestions.splice(row.gi, 1); }
    let g = d.examQuestions.find(x => x.courseId === (oldG ? oldG.courseId : 'python') && x.examType === examType && x.level === level);
    if (!g) { g = { courseId: (oldG ? oldG.courseId : 'python'), examType, level, questions: [] }; d.examQuestions.push(g); }
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
    let added = 0;
    parsed.chapters.forEach(ch => ch.lessons.forEach(pl => {
      if (!ls) { alert('请先在左侧选中一个知识点，作为题目挂载点'); return; }
      pl.questions.forEach(q => { ls.questions.push(q); added++; });
      pl.chapterQuestions.forEach(q => { ls.chapterQuestions.push(q); added++; });
    }));
    parsed.examGroups.forEach(pg => {
      const cid = (sel && sel.courseId) || 'python';
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
    } catch (e) { alert('本地模型调用失败：' + e.message); return; }
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
    rows.forEach(r => {
      r.errors = WB.validate.validateQuestion(r.q);
      if (r.errors.length) errs++;
    });
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
    const host = document.getElementById('wb-workspace');
    host.innerHTML = '';
    const d = draft();
    const lesson = currentLesson();
    const lessons = allLessons(d);

    // 来源入口
    const src = document.createElement('div'); src.className = 'wb-panel';
    src.innerHTML = '<h3 class="wb-panel-title">题目来源</h3>';
    const row1 = document.createElement('div'); row1.className = 'wb-quiz-src-row';
    // 手动加题
    const btnManual = document.createElement('button'); btnManual.className = 'wb-btn'; btnManual.textContent = '＋手动加题';
    btnManual.onclick = () => showManualForm(host, lesson);
    row1.appendChild(btnManual);
    // 现编
    const genWrap = document.createElement('span'); genWrap.className = 'wb-inline';
    const genSel = document.createElement('select'); genSel.className = 'wb-sel';
    [2, 3, 5].forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n + ' 道'; genSel.appendChild(o); });
    const btnGen = document.createElement('button'); btnGen.className = 'wb-btn'; btnGen.textContent = '基于本知识点现编';
    btnGen.onclick = () => generateByAI(parseInt(genSel.value, 10));
    if (!lesson || !WB.state.contentDone(lesson)) { btnGen.disabled = true; btnGen.title = '先完成知识点三段内容'; }
    genWrap.appendChild(genSel); genWrap.appendChild(btnGen);
    row1.appendChild(genWrap);
    // 粘贴素材
    const btnPaste = document.createElement('button'); btnPaste.className = 'wb-btn'; btnPaste.textContent = '粘贴题目素材';
    btnPaste.onclick = () => showPasteBox(host);
    row1.appendChild(btnPaste);
    src.appendChild(row1);
    if (lesson && !WB.state.contentDone(lesson)) {
      const warn = document.createElement('div'); warn.className = 'wb-warn'; warn.style.margin = '6px 0';
      warn.textContent = '当前知识点三段内容未完成，建议先在「① 结构与内容」补全，再导入题目。';
      src.appendChild(warn);
    }
    host.appendChild(src);

    // 校验/去重工具条
    const bar = document.createElement('div'); bar.className = 'wb-quiz-bar';
    const btnVal = document.createElement('button'); btnVal.className = 'wb-btn'; btnVal.textContent = '校验全部';
    btnVal.onclick = () => { const n = validateAll(buildRows()); alert(n ? '有 ' + n + ' 题未通过校验（已标红）' : '全部通过校验'); };
    const btnDup = document.createElement('button'); btnDup.className = 'wb-btn'; btnDup.textContent = '检查重复';
    btnDup.onclick = () => dedupAll(buildRows());
    bar.appendChild(btnVal); bar.appendChild(btnDup);
    host.appendChild(bar);

    // 题目列表
    const rows = buildRows();
    const title = document.createElement('h3'); title.className = 'wb-panel-title';
    title.textContent = '题目校对（' + rows.length + ' 题）';
    host.appendChild(title);
    if (!rows.length) {
      const empty = document.createElement('div'); empty.className = 'wb-muted';
      empty.textContent = lesson ? '该知识点还没有题目。用上方入口添加。' : '在左侧选中知识点查看其题目；考试题为全局列表。';
      host.appendChild(empty);
      return;
    }
    rows.forEach(r => host.appendChild(renderCard(r, lessons)));
  }

  function renderCard(row, lessons) {
    const q = row.q;
    const card = document.createElement('div');
    card.className = 'wb-qcard';
    if (row.errors && row.errors.length) card.classList.add('err');
    if (q._skip) card.classList.add('skip');
    if (row.rowStatus === 'dup') card.classList.add('dup');

    const head = document.createElement('div'); head.className = 'wb-qcard-head';
    // 题型
    const typeSel = document.createElement('select'); typeSel.className = 'wb-sel';
    const topt = document.createElement('option'); topt.value = 'choice'; topt.textContent = '选择题'; typeSel.appendChild(topt);
    const tf = document.createElement('option'); tf.value = 'fill'; tf.textContent = '填空题'; typeSel.appendChild(tf);
    typeSel.value = q.type === 'fill' ? 'fill' : 'choice';
    typeSel.onchange = () => { q.type = typeSel.value; if (q.type === 'choice' && !q.options) q.options = { A: '', B: '', C: '', D: '' }; persist(draft()); };
    head.appendChild(typeSel);
    // 归属标签
    const tag = document.createElement('span'); tag.className = 'wb-tag';
    tag.textContent = row.target === 'learn' ? '学习题' : row.target === 'chapter' ? '章节题' : '考试题';
    head.appendChild(tag);
    // 状态
    const status = document.createElement('span'); status.className = 'wb-qstatus';
    if (q._skip) status.textContent = '已跳过';
    else if (row.rowStatus === 'dup') status.textContent = '重复';
    else if (row.errors && row.errors.length) status.textContent = '有错误';
    else status.textContent = '正常';
    head.appendChild(status);
    // 操作
    const acts = document.createElement('span'); acts.className = 'wb-qcard-acts';
    const btnSkip = document.createElement('button'); btnSkip.className = 'wb-btn'; btnSkip.textContent = q._skip ? '恢复' : '跳过';
    btnSkip.onclick = () => toggleSkip(row);
    const btnDel = document.createElement('button'); btnDel.className = 'wb-btn'; btnDel.textContent = '删除';
    btnDel.onclick = () => removeRow(row);
    acts.appendChild(btnSkip); acts.appendChild(btnDel);
    head.appendChild(acts);
    card.appendChild(head);

    // 错误提示
    if (row.errors && row.errors.length) {
      const err = document.createElement('div'); err.className = 'wb-qerr';
      err.textContent = row.errors.join('；');
      card.appendChild(err);
    }

    const body = document.createElement('div'); body.className = 'wb-qcard-body';
    // 题干
    const qInput = document.createElement('input'); qInput.className = 'wb-qinput'; qInput.placeholder = '题干';
    qInput.value = q.question || '';
    qInput.oninput = () => { q.question = qInput.value; schedulePersist(); };
    body.appendChild(qInput);
    // 选项（选择题）
    if (q.type === 'choice') {
      q.options = q.options || { A: '', B: '', C: '', D: '' };
      const opts = document.createElement('div'); opts.className = 'wb-qopts';
      ['A', 'B', 'C', 'D'].forEach(k => {
        const o = document.createElement('input'); o.className = 'wb-qopt'; o.placeholder = k + ' 选项';
        o.value = q.options[k] || '';
        o.oninput = () => { q.options[k] = o.value; schedulePersist(); };
        opts.appendChild(o);
      });
      body.appendChild(opts);
    }
    // 答案 + 解析
    const bottom = document.createElement('div'); bottom.className = 'wb-qcard-bottom';
    const ans = document.createElement('input'); ans.className = 'wb-qinput wb-qans'; ans.placeholder = '答案';
    ans.value = q.answer || '';
    ans.oninput = () => { q.answer = ans.value; schedulePersist(); };
    const exp = document.createElement('input'); exp.className = 'wb-qinput wb-qexp'; exp.placeholder = '解析（可选）';
    exp.value = q.explanation || '';
    exp.oninput = () => { q.explanation = exp.value; schedulePersist(); };
    bottom.appendChild(ans); bottom.appendChild(exp);
    body.appendChild(bottom);

    // 归属编辑
    if (row.target === 'exam') {
      const move = document.createElement('div'); move.className = 'wb-qcard-move';
      const typeOpts = [...new Set([...EXAM_TYPES, row.examType].filter(Boolean))];
      const typeSel = document.createElement('select'); typeSel.className = 'wb-sel';
      typeOpts.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; if (t === row.examType) o.selected = true; typeSel.appendChild(o); });
      typeSel.onchange = () => moveExamRow(row, typeSel.value, row.level);
      move.appendChild(label('考试类型', typeSel));
      const levelOpts = [...new Set([...LEVELS, row.level].filter(Boolean))];
      const levelSel = document.createElement('select'); levelSel.className = 'wb-sel';
      levelOpts.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; if (l === row.level) o.selected = true; levelSel.appendChild(o); });
      levelSel.onchange = () => moveExamRow(row, row.examType, levelSel.value);
      move.appendChild(label('级别', levelSel));
      body.appendChild(move);
    } else {
      const move = document.createElement('div'); move.className = 'wb-qcard-move';
      const sel = document.createElement('select'); sel.className = 'wb-sel';
      const cur = lessons.find(x => x.lessonKey === row.lessonKey);
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

  function label(text, el) {
    const l = document.createElement('label'); l.className = 'wb-flabel';
    l.appendChild(document.createTextNode(text + '：'));
    l.appendChild(el);
    return l;
  }
  function showManualForm(host, lesson) {
    const existing = document.getElementById('wb-manual-form');
    if (existing) { existing.remove(); return; }
    const form = document.createElement('div'); form.id = 'wb-manual-form'; form.className = 'wb-qcard';
    form.innerHTML = '<h3 class="wb-panel-title">手动加题</h3>';
    const type = document.createElement('select'); type.className = 'wb-sel';
    type.innerHTML = '<option value="choice">选择题</option><option value="fill">填空题</option>';
    form.appendChild(type);
    const q = mkInput(form, '题干');
    const A = mkInput(form, '选项A'); const B = mkInput(form, '选项B');
    const C = mkInput(form, '选项C'); const D = mkInput(form, '选项D');
    const ans = mkInput(form, '答案'); const exp = mkInput(form, '解析（可选）');
    const target = document.createElement('select'); target.className = 'wb-sel';
    target.innerHTML = '<option value="chapter">章节题</option><option value="learn">学习题</option>';
    form.appendChild(target);
    const save = document.createElement('button'); save.className = 'wb-btn primary'; save.textContent = '加入';
    save.onclick = () => {
      addManual({ type: type.value, question: q.value, A: A.value, B: B.value, C: C.value, D: D.value, answer: ans.value, explanation: exp.value, target: target.value });
    };
    form.appendChild(save);
    host.insertBefore(form, host.firstChild);
  }
  function mkInput(host, ph) {
    const i = document.createElement('input'); i.className = 'wb-qinput'; i.placeholder = ph;
    host.appendChild(i); return i;
  }
  function showPasteBox(host) {
    const existing = document.getElementById('wb-paste-box');
    if (existing) { existing.remove(); return; }
    const box = document.createElement('div'); box.id = 'wb-paste-box'; box.className = 'wb-qcard';
    box.innerHTML = '<h3 class="wb-panel-title">粘贴题目素材</h3>';
    const ta = document.createElement('textarea'); ta.className = 'wb-material'; ta.placeholder = '按模板粘贴题目行（【学习题】【章节题】【考试题】(类型,级别)）';
    box.appendChild(ta);
    const btn = document.createElement('button'); btn.className = 'wb-btn primary'; btn.textContent = '解析入表';
    btn.onclick = () => addFromMaterial(ta.value);
    box.appendChild(btn);
    host.insertBefore(box, host.firstChild);
  }

  let persistTimer = null;
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { const d = draft(); WB.state.save(d); WBRefreshStat(); }, 400);
  }

  return { render };
});
