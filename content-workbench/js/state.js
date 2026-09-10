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
  // 内置学科的等级考试默认配置（与小程序 app.js 的 DEFAULT_EXAM_CONFIG 保持一致）。
  // 仅当学科节点上没有 examConfig 字段（未从云端拉取过、也未编辑过）时兜底；
  // 一旦在工作台保存过「考试类型配置」，以本地/云端的 examConfig 为准。
  // type 是关联键，与 examQuestions / wrongQuestions 的 examType 字段对应。
  const DEFAULT_EXAM_CONFIG = {
    python: [
      { type: 'CIE', name: 'CIE 等级考试', desc: '中国电子学会 Python 编程等级考试', icon: 'i-book', color: '#5B67F1', colorDark: '#8E5CF6',
        levels: ['一级', '二级', '三级', '四级', '五级', '六级'] },
      { type: 'GESP', name: 'GESP 等级考试', desc: 'CCF 编程能力等级认证', icon: 'i-target', color: '#22C08A', colorDark: '#1D9E75',
        levels: ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级'] }
    ],
    cpp: [
      { type: 'CIE', name: 'CIE 等级考试', desc: '中国电子学会 C++ 编程等级考试', icon: 'i-book', color: '#5B67F1', colorDark: '#8E5CF6',
        levels: ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'] },
      { type: 'GESP', name: 'GESP 等级考试', desc: 'CCF 编程能力等级认证', icon: 'i-target', color: '#22C08A', colorDark: '#1D9E75',
        levels: ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级'] },
      { type: 'CSP-JS', name: 'CSP-J/S 竞赛', desc: '信息学奥赛入门级/提高级', icon: 'i-trophy', color: '#8E5CF6', colorDark: '#5B67F1',
        levels: ['CSP-J（入门级）', 'CSP-S（提高级）'] }
    ]
  };
  // 读某门学科的考试类型配置：节点上有就用节点上的（编辑后 / 云端拉取后），
  // 没有则内置学科回落默认配置，其他学科返回空数组（= 未配置）。
  // 返回的是兜底数据的引用时复制一份，避免调用方直接改到默认模板。
  function getExamConfig(d, courseId) {
    const node = d && d.tree && d.tree[courseId];
    if (node && Array.isArray(node.examConfig)) return node.examConfig;
    if (isBuiltinCourse(courseId) && DEFAULT_EXAM_CONFIG[courseId]) {
      return JSON.parse(JSON.stringify(DEFAULT_EXAM_CONFIG[courseId]));
    }
    return [];
  }
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
  return { uid, blankDraft, load, save, clear, contentDone, BUILTIN_COURSES, DEFAULT_EXAM_CONFIG, getExamConfig, isBuiltinCourse, ensureBuiltinCourses };
});
