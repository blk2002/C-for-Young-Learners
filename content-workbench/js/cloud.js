(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WB = root.WB || {}; root.WB.cloud = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const ENV = 'cloud1-d5g4wtnsn6cc1b835';
  let app = null;
  function init() {
    if (app) return app;
    app = cloudbase.init({ env: ENV });
    return app;
  }
  async function ensureLogin() {
    init();
    const auth = app.auth({ persistence: 'local' });
    if (!(await auth.hasLoginState())) await auth.signInAnonymously();
    return true;
  }
  async function call(name, data) {
    const res = await app.callFunction({ name, data });
    return res.result;
  }
  const pullTree = password => call('getCourseTree', { password });
  const pushStructure = payload => call('importContent', payload);
  const pushQuestions = payload => call('importContent', payload);
  return { init, ensureLogin, call, pullTree, pushStructure, pushQuestions };
});
