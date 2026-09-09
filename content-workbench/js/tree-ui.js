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
    const edit = document.createElement('span'); edit.className = 'wb-node-act'; edit.textContent = '✎';
    edit.onclick = e => { e.stopPropagation(); rename(ids, level); };
    const del = document.createElement('span'); del.className = 'wb-node-act'; del.textContent = '✕';
    del.onclick = e => { e.stopPropagation(); remove(ids, level); };
    el.appendChild(edit); el.appendChild(del);
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

  function rename(ids, level) {
    const d = draft();
    const node = findNode(d, ids, level);
    if (level === 'course') {
      const name = prompt('学科名称', node.name); if (!name) return;
      node.name = name;
    } else {
      const title = prompt('新标题', node.title); if (!title) return;
      node.title = title;
    }
    persist(d);
  }

  function remove(ids, level) {
    if (!confirm('确认删除？已入库的节点将在下次「同步结构与内容」时从云端删除。')) return;
    const d = draft();
    let orphanExam = null;   // 学科被删时它名下的考试题（独立实体，不跟随删除）
    if (level === 'lesson') {
      const ch = d.tree[ids.courseId].chapters.find(x => x.key === ids.chapterKey);
      const i = ch.lessons.findIndex(x => x.key === ids.lessonKey);
      const ls = ch.lessons[i];
      // 删除队列带上 courseId：学科被删光后 tree 为空，sync.js 要靠它发「纯删除」payload
      if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId, courseId: ids.courseId });
      ch.lessons.splice(i, 1); reOrder(ch.lessons);
      if (selected && selected.lessonKey === ids.lessonKey) selected = null;
    } else if (level === 'chapter') {
      const course = d.tree[ids.courseId];
      const i = course.chapters.findIndex(x => x.key === ids.chapterKey);
      const ch = course.chapters[i];
      if (ch.cloudId) (d._deletedChapters = d._deletedChapters || []).push({ cloudId: ch.cloudId, courseId: ids.courseId });
      ch.lessons.forEach(ls => { if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId, courseId: ids.courseId }); });
      course.chapters.splice(i, 1); reOrder(course.chapters);
      if (selected && selected.chapterKey === ids.chapterKey) selected = null;
    } else {
      const course = d.tree[ids.courseId];
      course.chapters.forEach(ch => {
        if (ch.cloudId) (d._deletedChapters = d._deletedChapters || []).push({ cloudId: ch.cloudId, courseId: ids.courseId });
        ch.lessons.forEach(ls => { if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId, courseId: ids.courseId }); });
      });
      // 考试题是独立实体：不挂在知识点/章节/学科下，删学科不连带删它，
      // 这些题会变成草稿里的孤儿 → 提示用户它们还在、仍可单独同步。
      const groups = (d.examQuestions || []).filter(g => g.courseId === ids.courseId);
      const n = groups.reduce((s, g) => s + (g.questions || []).length, 0);
      if (n) orphanExam = { groups: groups.length, n };
      delete d.tree[ids.courseId];
      selected = null; currentCourse = null;
    }
    persist(d);
    if (orphanExam) {
      alert(`学科已删除。\n它名下的 ${orphanExam.groups} 组考试题（共 ${orphanExam.n} 道）是独立的，未被删除，\n仍可通过「同步题目」单独同步。\n如需一并清空：先恢复/新建该学科，到题目页逐题删除，再同步题目。`);
    }
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

  // ===== 新建学科弹窗 =====
  function openNewCourseModal() {
    const mask = document.createElement('div'); mask.className = 'wb-modal-mask';
    mask.innerHTML =
      '<div class="wb-modal"><div class="wb-modal-hd"><h3>新建学科</h3><span class="x">关闭</span></div>' +
      '<div class="wb-modal-bd">' +
      '<div class="wb-grid2">' +
      '<div><label class="wb-fld-lb">显示名称</label><input class="wb-inp" id="nc-name" placeholder="如 Scratch"></div>' +
      '<div><label class="wb-fld-lb">课程 id（英文，入库后不可改）</label><input class="wb-inp" id="nc-id" placeholder="scratch"></div>' +
      '</div><div class="wb-grid2">' +
      '<div><label class="wb-fld-lb">图标（小程序 icons）</label><input class="wb-inp" id="nc-icon" value="i-book"></div>' +
      '<div><label class="wb-fld-lb">主题色</label><input class="wb-inp" id="nc-color" value="#5B67F1"></div>' +
      '</div>' +
      '<label class="wb-fld-lb">创建后把这段粘到小程序 app.js 的 globalData.courses，学生端才会显示</label>' +
      '<div class="wb-snip" id="nc-snip"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;">' +
      '<button class="wb-btn" id="nc-copy">复制代码</button>' +
      '<button class="wb-btn primary" id="nc-ok" style="margin-left:auto;">创建学科</button></div>' +
      '</div></div>';
    document.body.appendChild(mask);
    const close = () => mask.remove();
    mask.querySelector('.x').onclick = close;
    mask.onclick = e => { if (e.target === mask) close(); };
    const snip = () => "{ id: '" + document.getElementById('nc-id').value + "',\n  name: '" + document.getElementById('nc-name').value +
      "',\n  icon: '" + document.getElementById('nc-icon').value + "',\n  color: '" + document.getElementById('nc-color').value + "' }";
    document.getElementById('nc-snip').textContent = snip();
    ['nc-name', 'nc-id', 'nc-icon', 'nc-color'].forEach(id => { document.getElementById(id).oninput = () => { document.getElementById('nc-snip').textContent = snip(); }; });
    document.getElementById('nc-name').oninput = e => {
      const idEl = document.getElementById('nc-id');
      if (!idEl.dataset.touched) idEl.value = slug(e.target.value);
      document.getElementById('nc-snip').textContent = snip();
    };
    document.getElementById('nc-id').oninput = e => { e.target.dataset.touched = '1'; document.getElementById('nc-snip').textContent = snip(); };
    document.getElementById('nc-copy').onclick = () => {
      const t = document.getElementById('nc-snip').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => alert('配置代码已复制'), () => prompt('手动复制：', t));
      else prompt('手动复制：', t);
    };
    document.getElementById('nc-ok').onclick = () => {
      const name = document.getElementById('nc-name').value.trim();
      const id = (document.getElementById('nc-id').value.trim() || slug(name) || 'course-' + uid('x'));
      if (!name) { alert('请填学科名称'); return; }
      const d = draft();
      if (d.tree[id]) { alert('该学科已存在'); return; }
      d.tree[id] = { name, chapters: [], icon: document.getElementById('nc-icon').value, color: document.getElementById('nc-color').value };
      WB.state.save(d);
      close();
      setCurrentCourse(id);
      alert('学科「' + name + '」已创建。\n下一步：把教程/大纲粘进右边素材框 → 整树模式 → 开始 AI 整理。');
    };
  }
  function slug(name) {
    const s = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
    return s || '';
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
      // 新增：每个选项右边一个删除按钮（即便只剩一个学科，列表里仍能删）
      const delOpt = document.createElement('span'); delOpt.className = 'wb-course-opt-del'; delOpt.textContent = '✕';
      delOpt.title = '删除该学科';
      delOpt.onclick = e => { e.stopPropagation(); menu.classList.add('hidden'); remove({ courseId: id }, 'course'); };
      o.appendChild(delOpt);
      o.onclick = () => { menu.classList.add('hidden'); setCurrentCourse(id); };
      menu.appendChild(o);
    });
    sel.onclick = () => menu.classList.toggle('hidden');
    // 新增：当前学科卡片右侧的删除按钮（不展开菜单就能删，符合"单学科时也能删"的诉求）
    const delCur = document.createElement('button'); delCur.className = 'wb-side-del'; delCur.textContent = '✕';
    delCur.title = '删除当前学科';
    delCur.onclick = e => { e.stopPropagation(); if (cid) remove({ courseId: cid }, 'course'); };
    const selRow = document.createElement('div'); selRow.className = 'wb-side-sel-row';
    selRow.appendChild(sel); selRow.appendChild(delCur);
    hd.appendChild(label); hd.appendChild(selRow); hd.appendChild(menu);
    const btnNew = document.createElement('button'); btnNew.className = 'wb-btn-dash'; btnNew.textContent = '＋ 新建学科';
    btnNew.onclick = () => openNewCourseModal();
    hd.appendChild(btnNew);
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
      hint.textContent = '还没有学科。点上方「＋ 新建学科」开始，或「从云端拉取」读取已有课程。';
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
