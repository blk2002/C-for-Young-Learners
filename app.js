// app.js
let envConfig;
try {
  envConfig = require("./env.local.js");
} catch (e) {
  envConfig = require("./env.template.js");
  console.warn("请复制 env.template.js 并重命名为 env.local.js，填入你的云环境ID");
}

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
  },
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    courses: [
      { id: 'python', name: 'Python', icon: 'i-code', color: '#45B0E0' },
      { id: 'cpp', name: 'C++', icon: 'i-chip', color: '#4E6EF2' }
    ]
  }
});