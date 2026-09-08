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
    const type = parts[0] === '填空' ? 'fill' : 'choice';
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
      if ((m = line.match(/^#{1}(?!#)\s*学科[:：]\s*(.+)$/))) { r.course = m[1]; continue; }
      if ((m = line.match(/^#{2}(?!#)\s*(.+)$/))) { ch = { title: m[1], lessons: [] }; r.chapters.push(ch); ls = null; section = null; continue; }
      if ((m = line.match(/^#{3}(?!#)\s*(?:知识点[:：]?\s*)?(.+)$/))) {
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
