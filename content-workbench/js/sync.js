(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.syncUI = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const draft = () => WB.state.load();
  let snapshot = [];   // 拉取快照的题目数组（去重比对用）

  function ensurePassword(d) {
    if (d.password) return true;
    const p = prompt('请输入管理密码（部署云函数时配置的 ADMIN_PASSWORD）');
    if (!p) return false;
    d.password = p;
    WB.state.save(d);
    return true;
  }

  // ===== 云端拉取合并 =====
  async function pull() {
    const d = draft();
    if (!ensurePassword(d)) return;
    // 先合并学科 registry（courses 集合）：学科只在小程序端增删改，
    // 小程序新建的「空学科」也能在这里出现、可编辑章节/知识点。
    // 失败不阻塞课程树拉取（老项目可能还没建 courses 集合）。
    try {
      const registry = await WB.cloud.listCourses();
      (registry || []).forEach(c => {
        if (c._id && !d.tree[c._id]) {
          d.tree[c._id] = {
            name: c.name || c._id,
            icon: c.icon || 'i-book',
            color: c.color || '#5B67F1',
            chapters: []
          };
        } else if (c._id && d.tree[c._id]) {
          // 已有学科：名称/主题色以云端 registry 为准（改名在小程序端发生）
          if (c.name) d.tree[c._id].name = c.name;
          if (c.color) d.tree[c._id].color = c.color;
          if (c.icon) d.tree[c._id].icon = c.icon;
        }
      });
    } catch (e) { console.warn('学科 registry 拉取失败，跳过', e); }

    let res;
    try { res = await WB.cloud.pullTree(d.password); }
    catch (e) { alert('拉取失败：' + e.message); return; }
    if (!res.success) { alert('拉取失败：' + res.message); return; }
    mergePull(d, res);
    WB.state.save(d);
    WB.treeUI.render();
    if (window.WBRefreshPanel) WBRefreshPanel();
    if (window.WBRefreshStat) WBRefreshStat();
    render();
    alert('已从云端拉取并合并');
  }

  function mergePull(d, res) {
    snapshot = [];
    (res.courses || []).forEach(course => {
      const cid = course.courseId;
      if (!d.tree[cid]) d.tree[cid] = { name: cid, chapters: [] };
      course.chapters.forEach(cloudCh => {
        let ch = d.tree[cid].chapters.find(x => x.title === cloudCh.title);
        if (!ch) {
          ch = { key: uid('c'), cloudId: cloudCh.id, title: cloudCh.title, order: cloudCh.order || 1, lessons: [] };
          d.tree[cid].chapters.push(ch);
        } else {
          ch.cloudId = cloudCh.id;
        }
        cloudCh.lessons.forEach(cloudLs => {
          let ls = ch.lessons.find(x => x.title === cloudLs.title);
          if (!ls) {
            ls = { key: uid('l'), cloudId: cloudLs.id, chapterKey: ch.key, title: cloudLs.title, order: cloudLs.order || 1,
              content: cloudLs.content || { concept: '', feature: '', confusion: '' },
              codeExample: cloudLs.codeExample || '', questions: cloudLs.questions || [], chapterQuestions: cloudLs.chapterQuestions || [] };
            ch.lessons.push(ls);
          } else {
            ls.cloudId = cloudLs.id;
            ['concept', 'feature', 'confusion'].forEach(k => { if (!ls.content[k] && cloudLs.content[k]) ls.content[k] = cloudLs.content[k]; });
            if (!ls.codeExample && cloudLs.codeExample) ls.codeExample = cloudLs.codeExample;
            if (!ls.questions.length) ls.questions = cloudLs.questions || [];
            if (!ls.chapterQuestions.length) ls.chapterQuestions = cloudLs.chapterQuestions || [];
          }
          (cloudLs.questions || []).forEach(q => snapshot.push(q));
          (cloudLs.chapterQuestions || []).forEach(q => snapshot.push(q));
        });
      });
    });
    // 考试题是**独立实体**：不挂在知识点/章节/学科下，删除它们不会株连考试题，
// 反过来考试题的同步也不依赖 d.tree 里是否还有这门学科。
// 合并策略（尊重本地意图 + 保护本地未同步的编辑）：
//   · 本地排队着"清空意图"（删光了还没同步）→ 保持空，不被云端覆盖；
//   · 本地无该组            → 从云端拉回；
//   · 本地有该组但为空      → 用云端填（新建的组还没加题）；
//   · 本地有该组且有题      → 保留本地（不覆盖，避免冲掉未同步的编辑）。
    (res.exams || []).forEach(cloudExam => {
      const cid = cloudExam.courseId, et = cloudExam.examType, lv = cloudExam.level;
      const clearPending = (d._examGroupsCleared || []).some(x => ek(x) === (cid || '(未标注)') && x.examType === et && x.level === lv);
      let g = d.examQuestions.find(x => x.courseId === cid && x.examType === et && x.level === lv);
      if (clearPending) {
        // 用户已删光本地这一组、意图还没提交到云端 → 拉取时不要把云端旧题塞回来
        if (g) g.questions = [];
        (cloudExam.questions || []).forEach(q => snapshot.push(q));
        return;
      }
      if (!g) {
        g = { courseId: cid, examType: et, level: lv, questions: cloudExam.questions || [] };
        d.examQuestions.push(g);
      } else if (!(g.questions || []).length) {
        g.questions = cloudExam.questions || [];
      }
      (cloudExam.questions || []).forEach(q => snapshot.push(q));
    });
  }

  function existing() { return snapshot; }

  // ===== 结构同步 =====
  // 删除队列去重：删学科时 chapter 和它的 lesson 会各推一次，可能重复。
  const uniqByCloudId = arr => {
    const seen = new Set();
    return (arr || []).filter(x => {
      const k = x && x.cloudId;
      if (!k || seen.has(k)) return false;
      seen.add(k); return true;
    });
  };

  function buildStructurePayload(d) {
    const payloads = [];
    const delCh = uniqByCloudId(d._deletedChapters).map(x => x.cloudId);
    const delLs = uniqByCloudId(d._deletedLessons).map(x => x.cloudId);
    Object.entries(d.tree).forEach(([courseId, c]) => {
      if (!c.chapters.length && !delCh.length && !delLs.length) return;
      payloads.push({
        mode: 'structure', password: d.password, courseId,
        chapters: c.chapters.map(ch => ({
          key: ch.key, cloudId: ch.cloudId, title: ch.title, order: ch.order,
          lessons: ch.lessons.map(ls => ({
            key: ls.key, cloudId: ls.cloudId, title: ls.title, order: ls.order,
            content: ls.content, codeExample: ls.codeExample, questions: (ls.questions || []).filter(q => !q._skip)
          }))
        })),
        deleteChapterIds: delCh,
        deleteLessonIds: delLs
      });
    });
    // 学科被删光后 d.tree 为空，但删除队列里还压着云端残留 → 原来一个 payload 都生成不了，
    // 「同步结构与内容」直接报"没有可同步的课程结构"，云端旧数据永远删不掉，拉取时又回来了。
    // 云函数 runStructure 的删除分支是按 id 直删、不依赖 courseId，所以发一个纯删除 payload 即可，
    // courseId 用队列里记录的（老数据可能没有，兜底 '__deleted__'）。
    if (!payloads.length && (delCh.length || delLs.length)) {
      const firstCh = uniqByCloudId(d._deletedChapters)[0];
      const firstLs = uniqByCloudId(d._deletedLessons)[0];
      payloads.push({
        mode: 'structure', password: d.password,
        courseId: (firstCh && firstCh.courseId) || (firstLs && firstLs.courseId) || '__deleted__',
        chapters: [], deleteChapterIds: delCh, deleteLessonIds: delLs
      });
    }
    return payloads;
  }

  async function syncStructure() {
    const d = draft();
    if (!ensurePassword(d)) return;
    const payloads = buildStructurePayload(d);
    if (!payloads.length) { alert('没有可同步的课程结构'); return; }
    // 删除 id 会在每个 payload 里重复出现（删除队列是全局的），统计要去重，否则数字虚高
    let adds = 0, ups = 0;
    const delSet = new Set();
    payloads.forEach(p => {
      p.chapters.forEach(ch => { ch.cloudId ? ups++ : adds++; ch.lessons.forEach(ls => ls.cloudId ? ups++ : adds++); });
      (p.deleteChapterIds || []).forEach(id => delSet.add('c:' + id));
      (p.deleteLessonIds || []).forEach(id => delSet.add('l:' + id));
    });
    const dels = delSet.size;
    if (!confirm(`即将同步结构与内容：新增 ${adds}、更新 ${ups}、删除 ${dels}。确认继续？`)) return;
    const failures = [];
    for (const p of payloads) {
      let res;
      try { res = await WB.cloud.pushStructure(p); }
      catch (e) { failures.push({ tag: p.courseId, msg: e.message }); continue; }
      if (!res.success) { failures.push({ tag: p.courseId, msg: res.message }); continue; }
      // 纯删除 payload 的 courseId 是占位符，d.tree 里没有 → 必须判空，否则这里会崩
      const course = d.tree[p.courseId];
      Object.entries((res.idMap && res.idMap.chapters) || {}).forEach(([key, id]) => {
        const ch = course && course.chapters.find(x => x.key === key); if (ch) ch.cloudId = id;
      });
      Object.entries((res.idMap && res.idMap.lessons) || {}).forEach(([key, id]) => {
        if (!course) return;
        course.chapters.forEach(ch => { const ls = ch.lessons.find(x => x.key === key); if (ls) ls.cloudId = id; });
      });
      (res.results || []).filter(r => r.ok === false).forEach(r => failures.push({ tag: r.op, msg: r.msg }));
    }
    // 删除队列同理：只有全部成功才清，否则失败的删除意图会丢失，云端残留永远删不掉
    if (!failures.length) { delete d._deletedChapters; delete d._deletedLessons; }
    WB.state.save(d);
    WB.treeUI.render(); WBRefreshStat(); render();
    report(failures, '结构同步');
    if (!failures.length) await pull();
  }

  // ===== 题目同步 =====
  // 考试题是独立实体，不依附于课程树：即便某门学科已被删除，
  // 它的考试组（以及排队中的"清空意图"）仍然要能同步出去。
  // 所以参与同步的 courseId = d.tree 的 key ∪ examQuestions 的 courseId ∪ _examGroupsCleared 的 courseId。
  const ek = g => g.courseId || '(未标注)';
  function examRelatedCourseIds(d) {
    const ids = new Set(Object.keys(d.tree || {}));
    // 连 courseId 都可能缺失（早期数据/孤儿题），用占位 key 兜底，
    // 否则这些组永远进不了 ids → 又变成"没有可同步的题目"。
    (d.examQuestions || []).forEach(g => { ids.add(ek(g)); });
    (d._examGroupsCleared || []).forEach(x => { ids.add(ek(x)); });
    return [...ids];
  }

  function buildQuestionsPayloads(d) {
    const payloads = [];
    examRelatedCourseIds(d).forEach(courseId => {
      const c = d.tree[courseId];                     // 学科可能已被删除 → 只同步它的考试题
      const learnUpdates = [], chapterUpserts = [];
      if (c) (c.chapters || []).forEach(ch => ch.lessons.forEach(ls => {
        if (!ls.cloudId) return;                      // 未入库知识点：拦截
        const learnQ = (ls.questions || []).filter(q => !q._skip);
        const chapterQ = (ls.chapterQuestions || []).filter(q => !q._skip);
        if (learnQ.length) learnUpdates.push({ lessonId: ls.cloudId, questions: learnQ });
        if (chapterQ.length) chapterUpserts.push({ lessonId: ls.cloudId, questions: chapterQ });
      }));
      // 现存的考试组（本地非空）→ 整组 upsert
      const examUpserts = (d.examQuestions || []).filter(g => ek(g) === courseId && (g.questions || []).length)
        .map(g => ({ examType: g.examType, level: g.level, questions: (g.questions || []).filter(q => !q._skip) }))
        .filter(g => g.questions.length);
      // 来自 quiz-ui 删除「最后一道题」或「清空考试题」时记下的"清空意图" → questions: [] 让云函数 update 成空
      const examClears = (d._examGroupsCleared || []).filter(x => ek(x) === courseId)
        .map(x => ({ examType: x.examType, level: x.level, questions: [] }));
      const allExamOps = [...examUpserts, ...examClears];
      if (learnUpdates.length || chapterUpserts.length || allExamOps.length) {
        payloads.push({ mode: 'questions', password: d.password, courseId, learnUpdates, chapterUpserts, examUpserts: allExamOps });
      }
    });
    return payloads;
  }

  function collectAllQuestions(d) {
    const arr = [];
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => ch.lessons.forEach(ls => {
      (ls.questions || []).forEach(q => arr.push({ q, lessonId: ls.cloudId, src: 'learn' }));
      (ls.chapterQuestions || []).forEach(q => arr.push({ q, lessonId: ls.cloudId, src: 'chapter' }));
    })));
    // 考试题是独立实体、不挂在知识点下，原来这函数只遍历 d.tree，导致考试题
    // 完全逃过硬校验 —— 错题干/空答案的考试题能直接同步上云。这里一并纳入。
    (d.examQuestions || []).forEach(g => (g.questions || []).forEach(q =>
      arr.push({ q, src: 'exam', exam: (g.courseId || '?') + ' ' + (g.examType || '?') + '/' + (g.level || '?') })));
    return arr;
  }

  async function syncQuestions() {
    const d = draft();
    if (!ensurePassword(d)) return;
    // 硬校验（不含 _skip）
    const bad = collectAllQuestions(d).filter(x => !x.q._skip && WB.validate.validateQuestion(x.q).length);
    if (bad.length) {
      const nExam = bad.filter(x => x.src === 'exam').length;
      const nLearn = bad.filter(x => x.src === 'learn').length;
      const nChapter = bad.filter(x => x.src === 'chapter').length;
      alert('有 ' + bad.length + ' 道题未通过硬校验（学习题 ' + nLearn + ' · 章节题 ' + nChapter + ' · 考试题 ' + nExam
        + '），请先到「② 题目」页签修正标红项后重试');
      return;
    }
    const payloads = buildQuestionsPayloads(d);
    if (!payloads.length) { alert('没有可同步的题目（未入库知识点的题需先同步结构）'); return; }
    let learn = 0, chapter = 0, exam = 0, examClear = 0;
    payloads.forEach(p => {
      learn += p.learnUpdates.length;
      chapter += p.chapterUpserts.length;
      p.examUpserts.forEach(g => { exam++; if (!g.questions.length) examClear++; });
    });
    const examText = examClear ? `${exam} 组（含 ${examClear} 组清空云端）` : `${exam}`;
    if (!confirm(`即将同步题目：学习题 ${learn} 组、章节题 ${chapter} 组、考试组 ${examText}。确认继续？`)) return;
    const failures = [];
    for (const p of payloads) {
      let res;
      try { res = await WB.cloud.pushQuestions(p); }
      catch (e) { failures.push({ tag: p.courseId, msg: e.message }); continue; }
      if (!res.success) { failures.push({ tag: p.courseId, msg: res.message }); continue; }
      (res.results || []).filter(r => r.ok === false).forEach(r => failures.push({ tag: r.op, msg: r.msg }));
    }
    // 同步成功的「清空意图」才消费：已经从云端被清空，下次不再发。
    // 失败时必须保留，否则意图丢失、云端那组永远清不掉。
    if (!failures.length) {
      const sentClearKeys = new Set();
      payloads.forEach(p => p.examUpserts.forEach(g => {
        if (!g.questions.length) sentClearKeys.add(p.courseId + '|' + g.examType + '|' + g.level);
      }));
      if (d._examGroupsCleared && d._examGroupsCleared.length) {
        d._examGroupsCleared = d._examGroupsCleared.filter(x => !sentClearKeys.has(x.courseId + '|' + x.examType + '|' + x.level));
        if (!d._examGroupsCleared.length) delete d._examGroupsCleared;
      }
      WB.state.save(d);
    }
    report(failures, '题目同步');
  }

  function report(failures, label) {
    if (failures.length) {
      alert(label + '部分失败：\n' + failures.map(f => (f.tag || '') + '：' + f.msg).join('\n'));
    } else {
      alert(label + '完成');
    }
  }

  // ===== 底部同步栏渲染 =====
  function render() {
    const bar = document.getElementById('wb-syncbar');
    if (!bar) return;
    bar.innerHTML = '';
    const d = draft();
    let adds = 0, ups = 0, dels = 0;
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => {
      if (!ch.cloudId) adds++; else ups++;
      ch.lessons.forEach(ls => { if (!ls.cloudId) adds++; else ups++; });
    }));
    dels = uniqByCloudId(d._deletedChapters).length + uniqByCloudId(d._deletedLessons).length;
    // 考试题独立：待清空的考试组也算「删除」，即便所属学科已被删也要显示出来，
    // 否则用户删了学科后根本看不到这些排队中的清空意图。
    const examClears = (d._examGroupsCleared || []).length;
    dels += examClears;
    const dirty = adds + dels;

    const hint = document.createElement('span');
    hint.className = 'wb-muted';
    hint.textContent = dirty
      ? `未同步：新增 ${adds} · 更新 ${ups} · 删除 ${dels}`
        + (examClears ? `（含 ${examClears} 组考试题待清空）` : '')
      : (d.password ? '没有未同步的变更' : '尚未设置管理密码（首次同步时提示输入）');
    bar.appendChild(hint);

    const r = document.createElement('div'); r.className = 'r';
    const btnPull = document.createElement('button'); btnPull.className = 'wb-btn'; btnPull.textContent = '从云端拉取';
    btnPull.onclick = () => pull();
    const btnS1 = document.createElement('button'); btnS1.className = 'wb-btn' + (dirty ? ' primary' : ''); btnS1.textContent = '同步结构与内容';
    btnS1.onclick = () => syncStructure();
    const btnS2 = document.createElement('button'); btnS2.className = 'wb-btn'; btnS2.textContent = '同步题目';
    btnS2.onclick = () => syncQuestions();
    r.appendChild(btnPull); r.appendChild(btnS1); r.appendChild(btnS2);
    bar.appendChild(r);
  }

  return { render, pull, existing, syncStructure, syncQuestions };
});
