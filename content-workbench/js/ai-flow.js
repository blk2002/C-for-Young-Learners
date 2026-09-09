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

  function normalizeQ(q) {
    if (!q) return q;
    if (q.type === '选择') q.type = 'choice';
    else if (q.type === '填空') q.type = 'fill';
    return q;
  }
  function normalizeObj(obj) {
    (obj.chapters || []).forEach(ch => (ch.lessons || []).forEach(ls => {
      (ls.questions || []).forEach(normalizeQ);
      (ls.chapterQuestions || []).forEach(normalizeQ);
      (ls.examGroups || []).forEach(g => (g.questions || []).forEach(normalizeQ));
    }));
    return obj;
  }

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
    const obj = normalizeObj(WB.ollama.extractJSON(out));
    if (!obj) { alert('本地模型未返回可解析的 JSON，请重试或改用手动编辑'); return { ok: false }; }
    if (target) {
      ['concept', 'feature', 'confusion'].forEach(k => { if (obj[k] && !target.content[k]) target.content[k] = String(obj[k]); });
      if (obj.code && !target.codeExample) target.codeExample = String(obj.code);
    } else {
      // 学科归属必须显式确定：优先调用方指定，其次当前选中，最后侧栏当前学科；都没有就拦住，不再静默落到 python
      const sel = WB.treeUI.getSelected();
      const courseId = o.courseId || (sel && sel.courseId) || (WB.treeUI.getCurrentCourse && WB.treeUI.getCurrentCourse());
      if (!courseId) { alert('无法确定写入哪门课：请先在左侧新建或选择一个学科'); return { ok: false }; }
      const parsed = { course: obj.course || '', chapters: obj.chapters || [], examGroups: collectExams(obj), pending: obj.pending || [] };
      WB.parser.mergeIntoDraft(d, parsed, courseId);
      WB.state.save(d);
      WB.treeUI.setCurrentCourse(courseId);
    }
    WB.state.save(d);
    WB.treeUI.render();
    if (window.WBRefreshPanel) WBRefreshPanel();
    if (window.WBRefreshStat) WBRefreshStat();
    const pending = obj.pending || [];
    if (pending.length) alert('有 ' + pending.length + ' 行内容未能识别，已跳过（可手动处理）');
    return { ok: true, pending };
  }
  function collectExams(obj) {   // 模型可能把 examGroups 放在每课里，统一收拢
    const groups = [];
    (obj.chapters || []).forEach(ch => (ch.lessons || []).forEach(ls => (ls.examGroups || []).forEach(g => groups.push(g))));
    return groups;
  }
  function findLesson(d, key) {
    for (const c of Object.values(d.tree)) for (const ch of c.chapters) {
      const ls = ch.lessons.find(x => x.key === key); if (ls) return ls;
    }
    return null;
  }
  return { run };
});
