(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.state = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const KEY = 'wb-draft-v1';
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // 内置学科：与小程序 app.js 的 globalData.courses 一一对应（id / 名称 / 图标 / 主题色）。
  // 每次 load() 都会兜底补齐（见 ensureBuiltinCourses），且不可删除、不可改名。
  const BUILTIN_COURSES = [
    { id: 'python', name: 'Python', icon: 'i-code', color: '#45B0E0' },
    { id: 'cpp', name: 'C++', icon: 'i-chip', color: '#4E6EF2' }
  ];
  const builtinTree = () => BUILTIN_COURSES.reduce((t, c) => {
    t[c.id] = { name: c.name, icon: c.icon, color: c.color, chapters: [], builtin: true };
    return t;
  }, {});
  const blankDraft = () => ({ version: 1, savedAt: null, password: '', tree: builtinTree(), chapterQuestions: [], examQuestions: [] });
  // 内置学科兜底：老草稿（没有 python / cpp）也会补上，只补缺失的空壳，
  // 已存在的学科连同里面的章节知识点一个字都不动。
  // 用 slug 比对，避免 id 大小写/下划线不同（如 'Python'）时被重复补一门。
  const slugId = id => String(id || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  function ensureBuiltinCourses(d) {
    if (!d || typeof d.tree !== 'object' || !d.tree) return false;
    const existing = new Set(Object.keys(d.tree).map(slugId));
    let changed = false;
    BUILTIN_COURSES.forEach(c => {
      if (existing.has(slugId(c.id))) return;
      d.tree[c.id] = { name: c.name, icon: c.icon, color: c.color, chapters: [], builtin: true };
      changed = true;
    });
    return changed;
  }

  const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null);
  function load(storage) {
    const s = storage || defaultStore();
    let d;
    try { const raw = s && s.getItem(KEY); d = raw ? JSON.parse(raw) : blankDraft(); }
    catch (e) { d = blankDraft(); }
    ensureBuiltinCourses(d);   // 幂等：缺哪门补哪门，不会覆盖已有内容
    return d;
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
  function isBuiltinCourse(id) { return BUILTIN_COURSES.some(c => c.id === id); }
  return { uid, blankDraft, load, save, clear, contentDone, BUILTIN_COURSES, isBuiltinCourse, ensureBuiltinCourses };
});
