(function () {
  const $ = id => document.getElementById(id);
  let mode = 'structure';

  function setChip(el, ok, text) { el.textContent = text; el.classList.toggle('ok', !!ok); el.classList.toggle('err', ok === 'err'); }

  async function refreshConn() {
    try { await WB.cloud.ensureLogin(); setChip($('wb-status-cloud'), true, '云端已连接'); }
    catch (e) { setChip($('wb-status-cloud'), 'err', '云端未连接'); showWarn('云端未连接：检查网络与控制台「匿名登录」是否已开启'); }
    const ol = await WB.ollama.check();
    if (ol.ok) { setChip($('wb-status-ollama'), true, '本地模型：' + (ol.model || '已连接')); }
    else { setChip($('wb-status-ollama'), false, '本地模型未连接'); }
    refreshStat();
  }

  function showWarn(text) { const w = $('wb-warn'); w.textContent = text; w.classList.remove('hidden'); }
  function hideWarn() { $('wb-warn').classList.add('hidden'); }

  function refreshStat() {
    const d = WB.state.load();
    let chapters = 0, lessons = 0, qs = 0, pending = 0;
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => {
      chapters++;
      if (!ch.cloudId) pending++;
      ch.lessons.forEach(ls => {
        lessons++;
        qs += (ls.questions || []).length + (ls.chapterQuestions || []).length;
        if (!ls.cloudId) pending++;
      });
    }));
    (d.examQuestions || []).forEach(g => qs += (g.questions || []).length);
    $('wb-stat').textContent = `草稿：章节 ${chapters} · 知识点 ${lessons} · 题目 ${qs}`
      + (d.savedAt ? ' · 保存于 ' + new Date(d.savedAt).toLocaleString() : '');

    const cid = (WB.treeUI && WB.treeUI.getCurrentCourse) ? WB.treeUI.getCurrentCourse() : null;
    const c = cid ? d.tree[cid] : null;
    $('wb-tab-course').textContent = c ? '当前学科：' + (c.name || cid) : '';
    const badge = $('wb-tab-dirty');
    if (badge) {
      badge.textContent = pending ? pending + ' 项未入库' : '';
      badge.className = 'wb-badge' + (pending ? ' warn' : '');
    }
    if (WB.treeUI && WB.treeUI.renderStats) WB.treeUI.renderStats();
  }

  function switchMode(m) {
    mode = m;
    $('wb-tab-structure').classList.toggle('cur', m === 'structure');
    $('wb-tab-quiz').classList.toggle('cur', m === 'quiz');
    $('wb-workspace').className = 'wb-workspace mode-' + (m === 'quiz' ? 'quiz' : 'structure');
    WB.treeUI.render();
    // 关键：两个面板共用 #wb-workspace，只渲染当前这一个（否则后渲染的会覆盖前一个）
    if (m === 'quiz') WB.quizUI.render(); else WB.contentUI.render();
    WB.syncUI.render();
    refreshStat();
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('wb-tab-structure').onclick = () => switchMode('structure');
    $('wb-tab-quiz').onclick = () => switchMode('quiz');
    refreshConn();
    switchMode('structure');
    setInterval(refreshConn, 60000);
    window.WBGetMode = () => mode;
    window.WBRefreshStat = refreshStat;
    window.WBRefreshPanel = () => { if (mode === 'quiz') WB.quizUI.render(); else WB.contentUI.render(); };
    if (WB.help && WB.help.mount) WB.help.mount();
  });
})();
