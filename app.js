// app.js
let envConfig;
try {
  envConfig = require("./env.local.js");
} catch (e) {
  envConfig = require("./env.template.js");
  console.warn("请复制 env.template.js 并重命名为 env.local.js，填入你的云环境ID");
}

// 内置学科（python / cpp）的等级考试默认配置。
// 云端 courses 文档没有 examConfig 字段时兜底用（等价于旧版写死在页面里的数据）；
// 一旦在工作台「考试类型配置」里保存过，就以云端配置为准。
// type 是关联键，与 examQuestions / wrongQuestions 的 examType 字段对应。
const DEFAULT_EXAM_CONFIG = {
  python: [
    { type: 'CIE', name: 'CIE 等级考试', desc: '中国电子学会 Python 编程等级考试', icon: 'i-book', color: '#5B67F1', colorDark: '#8E5CF6',
      levels: ['一级', '二级', '三级', '四级', '五级', '六级'] },
    { type: 'GESP', name: 'GESP 等级考试', desc: 'CCF 编程能力等级认证', icon: 'i-target', color: '#22C08A', colorDark: '#1D9E75',
      levels: ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级'] }
  ],
  cpp: [
    { type: 'CIE', name: 'CIE 等级考试', desc: '中国电子学会 C++ 编程等级考试', icon: 'i-book', color: '#5B67F1', colorDark: '#8E5CF6',
      levels: ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'] },
    { type: 'GESP', name: 'GESP 等级考试', desc: 'CCF 编程能力等级认证', icon: 'i-target', color: '#22C08A', colorDark: '#1D9E75',
      levels: ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级'] },
    { type: 'CSP-JS', name: 'CSP-J/S 竞赛', desc: '信息学奥赛入门级/提高级', icon: 'i-trophy', color: '#8E5CF6', colorDark: '#5B67F1',
      levels: ['CSP-J（入门级）', 'CSP-S（提高级）'] }
  ]
};

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: envConfig.cloudEnvId,
        traceUser: true
      });
    }
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo._id) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }

    // 学科唯一真源是云端 courses 集合，启动即水合（失败时保留下方硬编码兜底）
    this.loadCourses();
  },

  // 从云端 courses 集合拉取学科列表，合并进 globalData.courses
  // 合并策略：以云端为准，但 python / cpp 两门内置学科强制保留——
  // 云端没 seed、集合被清空时也不会出现"内置学科消失"
  async loadCourses() {
    const builtinFallback = this.globalData.courses.filter(c => c.builtin);
    try {
      const res = await wx.cloud.database().collection('courses')
        .orderBy('order', 'asc')
        .limit(50)
        .get();
      if (res.data && res.data.length) {
        const cloudCourses = res.data.map(c => ({
          id: c._id,
          name: c.name,
          icon: c.icon || 'i-book',
          color: c.color || '#5B67F1',
          builtin: !!c.builtin,
          // 等级考试配置随文档走；内置学科缺字段时用默认配置兜底，其余学科缺省为空（= 未配置）
          examConfig: Array.isArray(c.examConfig) && c.examConfig.length
            ? c.examConfig
            : (DEFAULT_EXAM_CONFIG[c._id] || [])
        }));
        // 内置学科兜底：云端缺哪门补哪门（按 fallback 的顺序插到最前面）
        const missing = builtinFallback.filter(fb => !cloudCourses.some(c => c.id === fb.id));
        this.globalData.courses = missing.concat(cloudCourses);
      }
      // 集合为空 / 拉取失败时不动 globalData（保留兜底，防白屏）
    } catch (e) {
      console.warn('学科列表拉取失败，沿用兜底', e);
    }
  },
  checkLogin() {
    return this.globalData.isLoggedIn && this.globalData.userInfo;
  },
  getUserInfo() {
    return this.globalData.userInfo;
  },
  setUserInfo(user) {
    this.globalData.userInfo = user;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', user);
  },
  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
  },
  isAdmin() {
    return this.globalData.userInfo && this.globalData.userInfo.role === 'admin';
  },

  // 账号是否已过有效期
  // 管理员永久有效；没有 validUntil 的老账号也视为永久有效
  isExpired() {
    const user = this.globalData.userInfo;
    if (!user) return false;
    if (user.role === 'admin') return false;
    if (!user.validUntil) return false;

    const expireTime = new Date(user.validUntil).getTime();
    if (isNaN(expireTime)) return false;

    return Date.now() > expireTime;
  },

  // 已过期就强制退出登录并回到登录页
  // 在各页面的 onShow 里调用（小程序没有服务端推送，只能客户端检查）
  enforceValidity() {
    if (!this.checkLogin()) return false;
    if (!this.isExpired()) return false;

    this.logout();
    wx.reLaunch({ url: '/pages/login/login' });
    setTimeout(() => {
      wx.showModal({
        title: '账号已失效',
        content: '账号已失效，请联系老师续期',
        showCancel: false
      });
    }, 400);

    return true;
  },

  onShow() {
    // 从后台切回前台时检查一次有效期
    this.enforceValidity();
    // 前台回来时刷新一次学科（管理员可能刚在别端增删过）
    this.loadCourses();
  },
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    courses: [
      { id: 'python', name: 'Python', icon: 'i-code', color: '#45B0E0', builtin: true, examConfig: DEFAULT_EXAM_CONFIG.python },
      { id: 'cpp', name: 'C++', icon: 'i-chip', color: '#4E6EF2', builtin: true, examConfig: DEFAULT_EXAM_CONFIG.cpp }
    ]
  }
});