(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.state = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const KEY = 'wb-draft-v1';
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const blankDraft = () => ({ version: 1, savedAt: null, password: '', tree: {}, chapterQuestions: [], examQuestions: [] });
  const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null);
  function load(storage) {
    const s = storage || defaultStore();
    try { const raw = s && s.getItem(KEY); return raw ? JSON.parse(raw) : blankDraft(); }
    catch (e) { return blankDraft(); }
  }
  function save(draft, storage) {
    const s = storage || defaultStore();
    if (!s) return;
    draft.savedAt = new Date().toISOString();
    s.setItem(KEY, JSON.stringify(draft));
  }
  function clear(storage) { const s = storage || defaultStore(); if (s) s.removeItem(KEY); }
  function contentDone(lesson) {
    const c = lesson && lesson.content;
    return !!(c && c.concept && c.feature && c.confusion);
  }
  return { uid, blankDraft, load, save, clear, contentDone };
});
