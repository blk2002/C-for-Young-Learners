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
    if (!(await auth.hasLoginState())) {
      if (typeof auth.signInAnonymously === 'function') {
        await auth.signInAnonymously();
      } else if (auth.anonymousAuthProvider) {
        await auth.anonymousAuthProvider().signIn();
      } else {
        throw new Error('SDK 不支持匿名登录');
      }
    }
    return true;
  }
  async function call(name, data) {
    const res = await app.callFunction({ name, data });
    return res.result;
  }
  const pullTree = password => call('getCourseTree', { password });
  const pushStructure = payload => call('importContent', payload);
  const pushQuestions = payload => call('importContent', payload);
  // 学科 registry（courses 集合）：学科只在小程序端增删改，工作台拉取时合并进来
  async function listCourses() {
    init();
    const db = app.database();
    const res = await db.collection('courses').limit(50).get();
    return res.data || [];
  }
  return { init, ensureLogin, call, pullTree, pushStructure, pushQuestions, listCourses };
});
