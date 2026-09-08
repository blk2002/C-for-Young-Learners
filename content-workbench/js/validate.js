(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.validate = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  function validateQuestion(q) {
    const errs = [];
    if (!q || !q.question || !q.question.trim()) errs.push('题干为空');
    if (q.type === 'choice') {
      ['A', 'B', 'C', 'D'].forEach(k => { if (!q.options || !q.options[k] || !String(q.options[k]).trim()) errs.push('选项' + k + '为空'); });
      if (!/^[A-D]$/.test(q.answer || '')) errs.push('答案不在A-D');
    } else if (q.type === 'fill') {
      if (!q.answer || !String(q.answer).trim()) errs.push('填空答案为空');
    } else errs.push('未知题型');
    return errs;
  }
  const normText = s => String(s || '').replace(/\s+/g, '');
  function hashQuestion(q) { return normText(q.question) + '||' + normText(q.answer); }
  function markDuplicates(rows, existingQuestions) {
    const seen = new Set((existingQuestions || []).map(hashQuestion));
    rows.forEach(r => { if (seen.has(hashQuestion(r))) r.rowStatus = 'dup'; });
    return rows;
  }
  function segmentHint(text) { return text && text.length > 60 ? 'over' : null; }
  return { validateQuestion, hashQuestion, markDuplicates, segmentHint };
});
