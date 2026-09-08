(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.ollama = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const BASE = 'http://localhost:11434';
  async function check() {
    try {
      const r = await fetch(BASE + '/api/tags', { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      const first = j.models && j.models[0] && j.models[0].name;
      return { ok: true, model: first || '' };
    } catch (e) { return { ok: false, model: '' }; }
  }
  async function chat(messages, opts) {
    const o = opts || {};
    const base = { model: o.model || 'qwen3:4b', messages, stream: false };
    for (const extra of [{ think: false }, {}]) {   // 部分老版本 Ollama 不认 think 字段，400 后用无 think 参数重试
      try {
        const r = await fetch(BASE + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, base, extra)) });
        if (!r.ok) continue;
        const j = await r.json();
        return (j.message && j.message.content) || '';
      } catch (e) { /* 进入下一种参数组合 */ }
    }
    throw new Error('本地模型调用失败（Ollama 未运行或模型未拉取）');
  }
  function extractJSON(text) {
    let t = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '');
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1];
    const s = t.indexOf('{'), a = t.indexOf('[');
    const start = (s === -1) ? a : (a === -1 ? s : Math.min(s, a));
    if (start === -1) return null;
    const openCh = t[start], closeCh = openCh === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < t.length; i++) {
      if (t[i] === openCh) depth++;
      else if (t[i] === closeCh) { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)); } catch (e) { return null; } } }
    }
    return null;
  }
  return { check, chat, extractJSON };
});
