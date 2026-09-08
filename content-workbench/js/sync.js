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
    let res;
    try { res = await WB.cloud.pullTree(d.password); }
    catch (e) { alert('拉取失败：' + e.message); return; }
    if (!res.success) { alert('拉取失败：' + res.message); return; }
    mergePull(d, res);
    WB.state.save(d);
    WB.treeUI.render(); WB.contentUI.render(); WB.quizUI.render(); WBRefreshStat(); render();
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
    (res.exams || []).forEach(cloudExam => {
      let g = d.examQuestions.find(x => x.courseId === cloudExam.courseId && x.examType === cloudExam.examType && x.level === cloudExam.level);
      if (!g) {
        g = { courseId: cloudExam.courseId, examType: cloudExam.examType, level: cloudExam.level, questions: cloudExam.questions || [] };
        d.examQuestions.push(g);
      }
      (cloudExam.questions || []).forEach(q => snapshot.push(q));
    });
  }

  function existing() { return snapshot; }

  // ===== 结构同步 =====
  function buildStructurePayload(d) {
    const payloads = [];
    Object.entries(d.tree).forEach(([courseId, c]) => {
      const delCh = (d._deletedChapters || []).map(x => x.cloudId).filter(Boolean);
      const delLs = (d._deletedLessons || []).map(x => x.cloudId).filter(Boolean);
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
    return payloads;
  }

  async function syncStructure() {
    const d = draft();
    if (!ensurePassword(d)) return;
    const payloads = buildStructurePayload(d);
    if (!payloads.length) { alert('没有可同步的课程结构'); return; }
    let adds = 0, ups = 0, dels = 0;
    payloads.forEach(p => {
      p.chapters.forEach(ch => { ch.cloudId ? ups++ : adds++; ch.lessons.forEach(ls => ls.cloudId ? ups++ : adds++); });
      dels += (p.deleteChapterIds || []).length + (p.deleteLessonIds || []).length;
    });
    if (!confirm(`即将同步结构与内容：新增 ${adds}、更新 ${ups}、删除 ${dels}。确认继续？`)) return;
    const failures = [];
    for (const p of payloads) {
      let res;
      try { res = await WB.cloud.pushStructure(p); }
      catch (e) { failures.push({ tag: p.courseId, msg: e.message }); continue; }
      if (!res.success) { failures.push({ tag: p.courseId, msg: res.message }); continue; }
      const course = d.tree[p.courseId];
      Object.entries(res.idMap.chapters || {}).forEach(([key, id]) => {
        const ch = course.chapters.find(x => x.key === key); if (ch) ch.cloudId = id;
      });
      Object.entries(res.idMap.lessons || {}).forEach(([key, id]) => {
        course.chapters.forEach(ch => { const ls = ch.lessons.find(x => x.key === key); if (ls) ls.cloudId = id; });
      });
      (res.results || []).filter(r => r.ok === false).forEach(r => failures.push({ tag: r.op, msg: r.msg }));
    }
    delete d._deletedChapters; delete d._deletedLessons;
    WB.state.save(d);
    WB.treeUI.render(); WBRefreshStat(); render();
    report(failures, '结构同步');
    if (!failures.length) await pull();
  }

  // ===== 题目同步 =====
  function buildQuestionsPayloads(d) {
    const payloads = [];
    Object.entries(d.tree).forEach(([courseId, c]) => {
      const learnUpdates = [], chapterUpserts = [];
      c.chapters.forEach(ch => ch.lessons.forEach(ls => {
        if (!ls.cloudId) return;                      // 未入库知识点：拦截
        const learnQ = (ls.questions || []).filter(q => !q._skip);
        const chapterQ = (ls.chapterQuestions || []).filter(q => !q._skip);
        if (learnQ.length) learnUpdates.push({ lessonId: ls.cloudId, questions: learnQ });
        if (chapterQ.length) chapterUpserts.push({ lessonId: ls.cloudId, questions: chapterQ });
      }));
      const examUpserts = (d.examQuestions || []).filter(g => g.courseId === courseId)
        .map(g => ({ examType: g.examType, level: g.level, questions: (g.questions || []).filter(q => !q._skip) }))
        .filter(g => g.questions.length);
      if (learnUpdates.length || chapterUpserts.length || examUpserts.length) {
        payloads.push({ mode: 'questions', password: d.password, courseId, learnUpdates, chapterUpserts, examUpserts });
      }
    });
    return payloads;
  }

  function collectAllQuestions(d) {
    const arr = [];
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => ch.lessons.forEach(ls => {
      (ls.questions || []).forEach(q => arr.push({ q, lessonId: ls.cloudId }));
      (ls.chapterQuestions || []).forEach(q => arr.push({ q, lessonId: ls.cloudId }));
    })));
    return arr;
  }

  async function syncQuestions() {
    const d = draft();
    if (!ensurePassword(d)) return;
    // 硬校验（不含 _skip）
    const bad = collectAllQuestions(d).filter(x => !x.q._skip && WB.validate.validateQuestion(x.q).length);
    if (bad.length) { alert('有 ' + bad.length + ' 道题未通过硬校验，请先到「② 题目」页签修正（标红项）'); return; }
    const payloads = buildQuestionsPayloads(d);
    if (!payloads.length) { alert('没有可同步的题目（未入库知识点的题需先同步结构）'); return; }
    let learn = 0, chapter = 0, exam = 0;
    payloads.forEach(p => { learn += p.learnUpdates.length; chapter += p.chapterUpserts.length; exam += p.examUpserts.length; });
    if (!confirm(`即将同步题目：学习题 ${learn} 组、章节题 ${chapter} 组、考试组 ${exam}。确认继续？`)) return;
    const failures = [];
    for (const p of payloads) {
      let res;
      try { res = await WB.cloud.pushQuestions(p); }
      catch (e) { failures.push({ tag: p.courseId, msg: e.message }); continue; }
      if (!res.success) { failures.push({ tag: p.courseId, msg: res.message }); continue; }
      (res.results || []).filter(r => r.ok === false).forEach(r => failures.push({ tag: r.op, msg: r.msg }));
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
    const btnPull = document.createElement('button'); btnPull.className = 'wb-btn'; btnPull.textContent = '从云端拉取';
    btnPull.onclick = () => pull();
    const btnS1 = document.createElement('button'); btnS1.className = 'wb-btn primary'; btnS1.textContent = '同步结构与内容';
    btnS1.onclick = () => syncStructure();
    const btnS2 = document.createElement('button'); btnS2.className = 'wb-btn primary'; btnS2.textContent = '同步题目';
    btnS2.onclick = () => syncQuestions();
    bar.appendChild(btnPull); bar.appendChild(btnS1); bar.appendChild(btnS2);
    const hint = document.createElement('span'); hint.className = 'wb-muted';
    hint.textContent = d.password ? '' : '尚未设置管理密码（首次同步时提示输入）';
    bar.appendChild(hint);
  }

  return { render, pull, existing, syncStructure, syncQuestions };
});
