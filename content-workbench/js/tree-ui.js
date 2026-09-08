(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.treeUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  let selected = null;   // { courseId, chapterKey, lessonKey }
  const KNOWN = { 'python': 'python', 'cpp': 'cpp' };
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const draft = () => WB.state.load();

  function persist(d) { WB.state.save(d); render(); WBRefreshStat(); }
  const markForLesson = ls => WB.state.contentDone(ls) ? ['✓', 'ok'] : ['!', 'warn'];
  function markForChapter(ch) {
    if (!ch.lessons.length) return ['○', ''];
    return ch.lessons.every(WB.state.contentDone) ? ['✓', 'ok'] : ['!', 'warn'];
  }

  function nodeEl(title, level, ids, mark) {
    const el = document.createElement('div');
    el.className = 'wb-node ' + level;
    if (selected && level === 'lesson' && selected.lessonKey === ids.lessonKey) el.classList.add('cur');
    if (selected && level === 'chapter' && selected.chapterKey === ids.chapterKey && !selected.lessonKey) el.classList.add('cur');
    if (selected && level === 'course' && selected.courseId === ids.courseId && !selected.chapterKey) el.classList.add('cur');
    const t = document.createElement('span'); t.textContent = title; el.appendChild(t);
    if (mark && mark[0]) { const m = document.createElement('span'); m.className = 'mark ' + mark[1]; m.textContent = mark[0]; el.appendChild(m); }
    const edit = document.createElement('span'); edit.className = 'wb-node-act'; edit.textContent = '✎'; edit.onclick = e => { e.stopPropagation(); rename(ids, level); };
    const del = document.createElement('span'); del.className = 'wb-node-act'; del.textContent = '✕'; del.onclick = e => { e.stopPropagation(); remove(ids, level); };
    el.appendChild(edit); el.appendChild(del);
    el.onclick = () => select(ids, level);
    return el;
  }

  function select(ids, level) {
    selected = level === 'lesson' ? ids
      : level === 'chapter' ? { courseId: ids.courseId, chapterKey: ids.chapterKey }
      : { courseId: ids.courseId };
    render();
    if (WB.contentUI) WB.contentUI.render();
    if (WB.quizUI) WB.quizUI.render();
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
    if (level === 'lesson') {
      const course = d.tree[ids.courseId];
      const ch = course.chapters.find(x => x.key === ids.chapterKey);
      const i = ch.lessons.findIndex(x => x.key === ids.lessonKey);
      const ls = ch.lessons[i];
      if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId });
      ch.lessons.splice(i, 1); reOrder(ch.lessons);
      if (selected && selected.lessonKey === ids.lessonKey) selected = null;
    } else if (level === 'chapter') {
      const course = d.tree[ids.courseId];
      const i = course.chapters.findIndex(x => x.key === ids.chapterKey);
      const ch = course.chapters[i];
      if (ch.cloudId) (d._deletedChapters = d._deletedChapters || []).push({ cloudId: ch.cloudId });
      ch.lessons.forEach(ls => { if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId }); });
      course.chapters.splice(i, 1); reOrder(course.chapters);
      if (selected && selected.chapterKey === ids.chapterKey) selected = null;
    } else {
      const course = d.tree[ids.courseId];
      course.chapters.forEach(ch => {
        if (ch.cloudId) (d._deletedChapters = d._deletedChapters || []).push({ cloudId: ch.cloudId });
        ch.lessons.forEach(ls => { if (ls.cloudId) (d._deletedLessons = d._deletedLessons || []).push({ cloudId: ls.cloudId }); });
      });
      delete d.tree[ids.courseId];
      selected = null;
    }
    persist(d);
  }

  function addCourse(name) {
    const d = draft();
    const id = KNOWN[String(name).toLowerCase()] || 'course-' + uid('x');
    if (d.tree[id]) { alert('该学科已存在'); return; }
    if (!KNOWN[id]) alert('新学科：需在小程序 app.js 的 globalData.courses 添加配置后学生端才可见');
    d.tree[id] = { name, chapters: [] };
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

  function render() {
    const d = draft();
    const host = document.getElementById('wb-tree');
    host.innerHTML = '';
    const courseIds = Object.keys(d.tree);
    if (!courseIds.length) {
      const hint = document.createElement('div');
      hint.className = 'wb-tree-empty';
      hint.textContent = '还没有学科。点下方「＋学科」开始，或「从云端拉取」读取已有课程。';
      host.appendChild(hint);
    }
    courseIds.forEach(courseId => {
      const c = d.tree[courseId];
      host.appendChild(nodeEl(c.name, 'course', { courseId }, ['']));
      const addCh = document.createElement('button'); addCh.className = 'wb-btn wb-add'; addCh.textContent = '＋章节';
      addCh.onclick = () => addChapter(courseId); host.appendChild(addCh);
      c.chapters.forEach(ch => {
        host.appendChild(nodeEl(ch.title + (ch.cloudId ? '' : ' ○'), 'chapter', { courseId, chapterKey: ch.key }, markForChapter(ch)));
        const addLs = document.createElement('button'); addLs.className = 'wb-btn wb-add'; addLs.textContent = '＋知识点';
        addLs.onclick = () => addLesson(courseId, ch.key); host.appendChild(addLs);
        ch.lessons.forEach(ls => {
          const el = nodeEl(ls.title + (ls.cloudId ? '' : ' ○'), 'lesson', { courseId, chapterKey: ch.key, lessonKey: ls.key }, markForLesson(ls));
          el.draggable = true;
          el.ondragstart = e => e.dataTransfer.setData('text/plain', JSON.stringify({ courseId, chapterKey: ch.key, lessonKey: ls.key }));
          el.ondragover = e => e.preventDefault();
          el.ondrop = e => { e.preventDefault(); dropLesson(e.dataTransfer.getData('text/plain'), { courseId, chapterKey: ch.key, lessonKey: ls.key }); };
          host.appendChild(el);
        });
      });
    });
    const actions = document.createElement('div');
    actions.className = 'wb-tree-actions';
    const addCourseBtn = document.createElement('button');
    addCourseBtn.className = 'wb-btn'; addCourseBtn.textContent = '＋学科';
    addCourseBtn.onclick = () => { const n = prompt('学科名称（如 Python / C++）'); if (n) addCourse(n); };
    actions.appendChild(addCourseBtn);
    if (WB.syncUI && WB.syncUI.pull) {
      const pull = document.createElement('button');
      pull.className = 'wb-btn'; pull.textContent = '从云端拉取';
      pull.onclick = () => WB.syncUI.pull();
      actions.appendChild(pull);
    }
    host.appendChild(actions);
  }

  function getSelected() { return selected; }
  return { render, getSelected };
});
