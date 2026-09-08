(function () {
  const $ = id => document.getElementById(id);
  let mode = 'structure';

  function setChip(el, ok, text) { el.textContent = text; el.classList.toggle('ok', !!ok); el.classList.toggle('err', ok === 'err'); }

  async function refreshConn() {
    try { await WB.cloud.ensureLogin(); setChip($('wb-status-cloud'), true, '云端：已连接（匿名）'); }
    catch (e) { setChip($('wb-status-cloud'), 'err', '云端：未连接'); showWarn('云端未连接：检查网络与控制台「匿名登录」是否已开启'); }
    const ol = await WB.ollama.check();
    if (ol.ok) { setChip($('wb-status-ollama'), true, '本地模型：' + (ol.model || '已连接')); }
    else { setChip($('wb-status-ollama'), false, '本地模型：未连接'); }
    refreshStat();
  }

  function showWarn(text) { const w = $('wb-warn'); w.textContent = text; w.classList.remove('hidden'); }
  function hideWarn() { $('wb-warn').classList.add('hidden'); }

  function refreshStat() {
    const d = WB.state.load();
    let chapters = 0, lessons = 0, qs = 0;
    Object.values(d.tree).forEach(c => c.chapters.forEach(ch => { chapters++; ch.lessons.forEach(ls => { lessons++; qs += (ls.questions || []).length + (ls.chapterQuestions || []).length; }); }));
    d.examQuestions.forEach(g => qs += g.questions.length);
    $('wb-stat').textContent = `草稿：章节 ${chapters} · 知识点 ${lessons} · 题目 ${qs}${d.savedAt ? ' · 保存于 ' + new Date(d.savedAt).toLocaleString() : ''}`;
  }

  function switchMode(m) {
    mode = m;
    $('wb-tab-structure').classList.toggle('cur', m === 'structure');
    $('wb-tab-quiz').classList.toggle('cur', m === 'quiz');
    WB.treeUI.render();
    WB.contentUI.render();
    WB.quizUI.render();
    WB.syncUI.render();
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('wb-tab-structure').onclick = () => switchMode('structure');
    $('wb-tab-quiz').onclick = () => switchMode('quiz');
    refreshConn();
    switchMode('structure');
    setInterval(refreshConn, 60000);
    window.WBRefreshStat = refreshStat;   // 各 UI 模块改草稿后调用
  });
})();
