// pages/login/login.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    username: '',
    password: '',
    focusField: '', // 当前聚焦的输入框：username / password
    loading: false
  },

  // 输入框聚焦
  onFocus(e) {
    this.setData({ focusField: e.currentTarget.dataset.field });
  },

  // 输入框失焦
  onBlur() {
    this.setData({ focusField: '' });
  },

  // 输入账号
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 提交登录
  async onSubmit() {
    const { username, password } = this.data;

    if (!username.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    await this.login();
  },

  // 登录
  async login() {
    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const result = await db.users.login(this.data.username, this.data.password);

      wx.hideLoading();
      this.setData({ loading: false });

      if (result.result.success) {
        // 保存用户信息
        app.setUserInfo(result.result.data);
        wx.showToast({ title: '登录成功', icon: 'success' });

        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1000);
      } else {
        // 账号过期等失败原因都走这里，message 由云函数给出
        wx.showModal({
          title: '登录失败',
          content: result.result.message,
          showCancel: false
        });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('登录错误', err);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  // 页面显示时检查登录状态
  onShow() {
    if (app.checkLogin()) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  }
});
