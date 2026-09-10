(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.treeUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  let selected = null;                 // { courseId, chapterKey, lessonKey }
  let currentCourse = null;            // 当前学科（侧栏一次只展开一门课）
  let kw = '';                         // 搜索关键字
  const openChs = {};                  // chapterKey -> true/false（章节展开状态）
  const KNOWN = { 'python': { id: 'python', color: '#45B0E0' }, 'cpp': { id: 'cpp', color: '#4E6EF2' }, 'c++': { id: 'cpp', color: '#4E6EF2' } };
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const draft = () => WB.state.load();
  const $ = id => document.getElementById(id);
  // 内置学科（python / cpp）：由 state.js 兜底补齐；增删改在小程序端（管理员）
  const isBuiltin = id => !!(WB.state.isBuiltinCourse && WB.state.isBuiltinCourse(id));

  function persist(d) { WB.state.save(d); render(); if (window.WBRefreshStat) WBRefreshStat(); }

  // ===== 当前学科 =====
  function courseIds() { return Object.keys(draft().tree || {}); }
  function getCurrentCourse() {
    if (selected && selected.courseId && draft().tree[selected.courseId]) return selected.courseId;
    if (currentCourse && draft().tree[currentCourse]) return currentCourse;
    const ids = courseIds();
    if (!ids.length) return null;
    currentCourse = ids[0];
    return currentCourse;
  }
  function setCurrentCourse(cid) {
    currentCourse = cid;
    if (!selected || selected.courseId !== cid) selected = null;
    render();
    if (window.WBRefreshPanel) WBRefreshPanel();
    if (window.WBRefreshStat) WBRefreshStat();
  }

  const markForLesson = ls => WB.state.contentDone(ls) ? ['✓', 'ok'] : ['!', 'warn'];
  function markForChapter(ch) {
    if (!ch.lessons.length) return ['○', ''];
    return ch.lessons.every(WB.state.contentDone) ? ['✓', 'ok'] : ['!', 'warn'];
  }
  function qCount(ls) { return (ls.questions || []).length + (ls.chapterQuestions || []).length; }

  function nodeEl(title, level, ids, mark, extra) {
    const el = document.createElement('div');
    el.className = 'wb-node';
    const isCur =
      (level === 'lesson' && selected && selected.lessonKey === ids.lessonKey) ||
      (level === 'chapter' && selected && selected.chapterKey === ids.chapterKey && !selected.lessonKey) ||
      (level === 'course' && selected && selected.courseId === ids.courseId && !selected.chapterKey);
    if (isCur) el.classList.add('cur');
    if (extra && extra.arrow) {
      const a = document.createElement('span');
      a.style.cssText = 'width:11px;color:var(--wb-faint);font-size:10px;';
      a.textContent = extra.arrow;
      el.appendChild(a);
    }
    const t = document.createElement('span'); t.textContent = title; el.appendChild(t);
    if (mark && mark[0]) { const m = document.createElement('span'); m.className = 'mark ' + (mark[1] || ''); m.textContent = mark[0]; el.appendChild(m); }
    if (extra && extra.count != null) {
      const c = document.createElement('span'); c.className = 'cnt'; c.textContent = extra.count; el.appendChild(c);
    }
    // 学科的增删改在小程序端（管理员）完成，工作台只编辑内容；
    // 内置学科保留「内置」标记作提示
    if (level === 'course') {
      if (isBuiltin(ids.courseId)) {
        const lock = document.createElement('span'); lock.className = 'wb-node-lock'; lock.textContent = '内置';
        el.appendChild(lock);
      }
    } else {
      const edit = document.createElement('span'); edit.className = 'wb-node-act'; edit.textContent = '✎';
      edit.onclick = e => { e.stopPropagation(); rename(ids, level); };
      const del = document.createElement('span'); del.className = 'wb-node-act'; del.textContent = '✕';
      del.onclick = e => { e.stopPropagation(); remove(ids, level); };
      el.appendChild(edit); el.appendChild(del);
    }
    el.onclick = () => select(ids, level);
    return el;
  }

  function select(ids, level) {
    if (level === 'chapter' && ids.chapterKey != null) openChs[ids.chapterKey] = !openChs[ids.chapterKey];
    selected = level === 'lesson' ? ids
      : level === 'chapter' ? { courseId: ids.courseId, chapterKey: ids.chapterKey }
        : { courseId: ids.courseId };
    currentCourse = ids.courseId;
    render();
    if (window.WBRefreshPanel) WBRefreshPanel();
    if (window.WBRefreshStat) WBRefreshStat();
  }

  // 按知识点 key 直接选中（供上/下一个知识点翻页使用）
  function selectLessonByKey(key) {
    const d = draft();
    for (const [cid, c] of Object.entries(d.tree)) {
      for (const ch of c.chapters) {
        const ls = ch.lessons.find(x => x.key === key);
        if (ls) {
          openChs[ch.key] = true;
          selected = { courseId: cid, chapterKey: ch.key, lessonKey: key };
          currentCourse = cid;
          render();
          if (window.WBRefreshPanel) WBRefreshPanel();
          if (window.WBRefreshStat) WBRefreshStat();
          return;
        }
      }
    }
  }

  function findNode(d, ids, level) {
    if (level === 'course') return d.tree[ids.courseId];
    const course = d.tree[ids.courseId];
    if (level === 'chapter') return course.chapters.find(x => x.key === ids.chapterKey);
    return course.chapters.find(x => x.key === ids.chapterKey).lessons.find(x => x.key === ids.lessonKey);
  }

  // 改名只支持章节 / 知识点；学科改名在小程序端（管理员）
  function rename(ids, level) {
    const d = draft();
    const node = findNode(d, ids, level);
    const title = prompt('新标题', node.title); if (!title) return;
    node.title = title;
    persist(d);
  }

  function remove(ids, level) {
    if (!confirm('确认删除？已入库的节点将在下次「同步结构与内容」时从云端删除。')) return;
    const d = draft();
    if (level === 'lesson') {
      const ch = d.tree[ids.courseId].chapters.find(x => x.key === ids.chapterKey);
      const i = ch.lessons.findIndex(x => x.key === ids.lessonKey);
      const ls = ch.lessons[i];
      // 删除队列带上 courseId：学科被删光后 tree 为空，sync.js 要靠它发「纯删除」payload
      if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId, courseId: ids.courseId });
      ch.lessons.splice(i, 1); reOrder(ch.lessons);
      if (selected && selected.lessonKey === ids.lessonKey) selected = null;
    } else {
      const course = d.tree[ids.courseId];
      const i = course.chapters.findIndex(x => x.key === ids.chapterKey);
      const ch = course.chapters[i];
      if (ch.cloudId) (d._deletedChapters = d._deletedChapters || []).push({ cloudId: ch.cloudId, courseId: ids.courseId });
      ch.lessons.forEach(ls => { if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId, courseId: ids.courseId }); });
      course.chapters.splice(i, 1); reOrder(course.chapters);
      if (selected && selected.chapterKey === ids.chapterKey) selected = null;
    }
    persist(d);
  }

  function addChapter(courseId) {
    const title = prompt('章节标题'); if (!title) return;
    const d = draft();
    d.tree[courseId].chapters.push({ key: uid('c'), cloudId: null, title, order: d.tree[courseId].chapters.length + 1, lessons: [] });
    persist(d);
  }

  function addLesson(courseId, chapterKey) {
    const title = prompt('知识点标题'); if (!title) return;
    const d = draft();
    const ch = d.tree[courseId].chapters.find(x => x.key === chapterKey);
    ch.lessons.push({ key: uid('l'), cloudId: null, chapterKey, title, order: ch.lessons.length + 1,
      content: { concept: '', feature: '', confusion: '' }, codeExample: '', questions: [], chapterQuestions: [] });
    persist(d);
  }

  const reOrder = list => list.forEach((x, i) => x.order = i + 1);

  function dropLesson(draggedJson, target) {
    const src = JSON.parse(draggedJson);
    if (src.chapterKey !== target.chapterKey) { alert('仅支持同章节内调整顺序'); return; }
    if (src.lessonKey === target.lessonKey) return;
    const d = draft();
    const ch = d.tree[src.courseId].chapters.find(x => x.key === src.chapterKey);
    const from = ch.lessons.findIndex(x => x.key === src.lessonKey);
    const to = ch.lessons.findIndex(x => x.key === target.lessonKey);
    const [moved] = ch.lessons.splice(from, 1);
    ch.lessons.splice(to, 0, moved);
    reOrder(ch.lessons);
    persist(d);
  }

  // ===== 渲染 =====
  function render() {
    const host = document.getElementById('wb-tree');
    if (!host) return;
    const d = draft();
    const cid = getCurrentCourse();
    const c = cid ? d.tree[cid] : null;
    host.innerHTML = '';

    // 学科切换器
    const hd = document.createElement('div'); hd.className = 'wb-side-hd';
    const label = document.createElement('div'); label.className = 'wb-side-label'; label.textContent = '当前学科';
    const sel = document.createElement('div'); sel.className = 'wb-course-sel';
    const sw = document.createElement('span'); sw.className = 'wb-swatch';
    sw.style.background = (c && c.color) || '#5B67F1';
    const nm = document.createElement('span'); nm.className = 'wb-course-name';
    nm.textContent = c ? (c.name || cid) : '未选择';
    const caret = document.createElement('span'); caret.className = 'wb-caret'; caret.textContent = '切换';
    sel.appendChild(sw); sel.appendChild(nm); sel.appendChild(caret);
    const menu = document.createElement('div'); menu.className = 'wb-course-menu hidden';
    courseIds().forEach(id => {
      const o = document.createElement('div'); o.className = 'wb-course-opt';
      const s2 = document.createElement('span'); s2.className = 'wb-swatch'; s2.style.background = (d.tree[id].color) || '#5B67F1';
      o.appendChild(s2);
      o.appendChild(document.createTextNode(d.tree[id].name || id));
      if (id === cid) { const t = document.createElement('span'); t.className = 'tick'; t.textContent = '当前'; o.appendChild(t); }
      if (isBuiltin(id)) {
        // 内置学科：加「内置」标记（学科的增删改在小程序端，工作台不再提供删除）
        const bi = document.createElement('span'); bi.className = 'wb-course-opt-del ro'; bi.textContent = '内置';
        bi.title = '内置学科';
        o.appendChild(bi);
      }
      o.onclick = () => { menu.classList.add('hidden'); setCurrentCourse(id); };
      menu.appendChild(o);
    });
    sel.onclick = () => menu.classList.toggle('hidden');
    const selRow = document.createElement('div'); selRow.className = 'wb-side-sel-row';
    selRow.appendChild(sel);
    hd.appendChild(label); hd.appendChild(selRow); hd.appendChild(menu);
    host.appendChild(hd);

    // 搜索
    const search = document.createElement('div'); search.className = 'wb-side-search';
    const sIcon = document.createElement('span'); sIcon.style.cssText = 'color:var(--wb-faint);font-size:12px;'; sIcon.textContent = '搜索';
    const sInp = document.createElement('input'); sInp.placeholder = '章节 / 知识点'; sInp.value = kw;
    sInp.oninput = e => { kw = e.target.value; renderTreeBody(); };
    search.appendChild(sIcon); search.appendChild(sInp);
    host.appendChild(search);

    // 树（可滚动）
    const scroll = document.createElement('div'); scroll.className = 'wb-tree-scroll'; scroll.id = 'wb-tree-scroll';
    host.appendChild(scroll);

    // 底部统计 + 拉取
    const ft = document.createElement('div'); ft.className = 'wb-side-ft';
    const stats = document.createElement('div'); stats.className = 'wb-stats';
    stats.innerHTML = '<div class="wb-stat-box"><i>章节</i><b id="wb-st-ch">0</b></div>' +
      '<div class="wb-stat-box"><i>知识点</i><b id="wb-st-ls">0</b></div>' +
      '<div class="wb-stat-box"><i>题目</i><b id="wb-st-q">0</b></div>';
    ft.appendChild(stats);
    if (WB.syncUI && WB.syncUI.pull) {
      const pull = document.createElement('button'); pull.className = 'wb-btn-ghost'; pull.textContent = '从云端拉取';
      pull.onclick = () => WB.syncUI.pull();
      ft.appendChild(pull);
    }
    host.appendChild(ft);

    renderTreeBody();
    renderStats();
  }

  function renderTreeBody() {
    const scroll = document.getElementById('wb-tree-scroll');
    if (!scroll) return;
    const d = draft();
    const cid = getCurrentCourse();
    scroll.innerHTML = '';
    if (!cid) {
      const hint = document.createElement('div'); hint.className = 'wb-tree-empty';
      hint.textContent = '还没有学科。请管理员在小程序首页「新建学科」，然后回来点「从云端拉取」读取。';
      scroll.appendChild(hint);
      return;
    }
    const c = d.tree[cid];
    const k = kw.trim();
    const chapters = (c.chapters || []).filter(ch => {
      if (!k) return true;
      if (ch.title.indexOf(k) >= 0) return true;
      return (ch.lessons || []).some(ls => ls.title.indexOf(k) >= 0);
    });

    if (!chapters.length) {
      const g = document.createElement('div'); g.className = 'wb-guide';
      g.innerHTML = '<b>「' + (c.name || cid) + '」还没有内容</b>' +
        '<ol><li>把教程 / 大纲粘进右边素材框，或拖入 .docx</li>' +
        '<li>模式选「整树模式」→ 开始 AI 整理，章节 + 知识点一次生成</li>' +
        '<li>素材已按模板写好的，点「解析入树」，不开模型也能成树</li>' +
        '<li>云端已有这门课 → 点左下「从云端拉取」</li></ol>';
      const acts = document.createElement('div'); acts.className = 'wb-guide-acts';
      const b1 = document.createElement('button'); b1.className = 'wb-btn sm'; b1.textContent = '去素材框';
      b1.onclick = () => { if (window.WBGetMode && WBGetMode() !== 'structure') document.getElementById('wb-tab-structure').click();
        const ta = document.getElementById('wb-material'); if (ta) ta.focus(); };
      const b2 = document.createElement('button'); b2.className = 'wb-btn sm'; b2.textContent = '手动加章节';
      b2.onclick = () => addChapter(cid);
      const b3 = document.createElement('button'); b3.className = 'wb-btn sm'; b3.textContent = '从云端拉取';
      b3.onclick = () => WB.syncUI && WB.syncUI.pull();
      acts.appendChild(b1); acts.appendChild(b2); acts.appendChild(b3);
      g.appendChild(acts);
      scroll.appendChild(g);
    }

    chapters.forEach(ch => {
      const open = openChs[ch.key] !== false;
      scroll.appendChild(nodeEl(ch.title + (ch.cloudId ? '' : ' ○'), 'chapter', { courseId: cid, chapterKey: ch.key },
        markForChapter(ch), { arrow: open ? '▼' : '▶', count: ch.lessons.length }));
      if (!open) return;
      const box = document.createElement('div'); box.className = 'wb-kids';
      const lessons = k ? ch.lessons.filter(ls => ls.title.indexOf(k) >= 0) : ch.lessons;
      lessons.forEach(ls => {
        const el = nodeEl(ls.title + (ls.cloudId ? '' : ' ○'), 'lesson', { courseId: cid, chapterKey: ch.key, lessonKey: ls.key },
          markForLesson(ls), { count: qCount(ls) });
        el.draggable = true;
        el.ondragstart = e => e.dataTransfer.setData('text/plain', JSON.stringify({ courseId: cid, chapterKey: ch.key, lessonKey: ls.key }));
        el.ondragover = e => e.preventDefault();
        el.ondrop = e => { e.preventDefault(); dropLesson(e.dataTransfer.getData('text/plain'), { courseId: cid, chapterKey: ch.key, lessonKey: ls.key }); };
        box.appendChild(el);
      });
      const addLs = document.createElement('button'); addLs.className = 'wb-add'; addLs.textContent = '＋ 知识点';
      addLs.onclick = () => addLesson(cid, ch.key);
      box.appendChild(addLs);
      scroll.appendChild(box);
    });

    const addCh = document.createElement('button'); addCh.className = 'wb-add'; addCh.textContent = '＋ 章节';
    addCh.onclick = () => addChapter(cid);
    scroll.appendChild(addCh);
  }

  function renderStats() {
    const ch = document.getElementById('wb-st-ch'), ls = document.getElementById('wb-st-ls'), q = document.getElementById('wb-st-q');
    if (!ch) return;
    const d = draft();
    const cid = getCurrentCourse();
    const c = cid ? d.tree[cid] : null;
    let nCh = 0, nLs = 0, nQ = 0;
    if (c) (c.chapters || []).forEach(x => { nCh++; x.lessons.forEach(l => { nLs++; nQ += (l.questions || []).length + (l.chapterQuestions || []).length; }); });
    if (cid) (d.examQuestions || []).forEach(g => { if (g.courseId === cid) nQ += (g.questions || []).length; });
    ch.textContent = nCh; ls.textContent = nLs; q.textContent = nQ;
  }

  function getSelected() { return selected; }
  return { render, getSelected, getCurrentCourse, setCurrentCourse, renderStats, selectLessonByKey };
});
