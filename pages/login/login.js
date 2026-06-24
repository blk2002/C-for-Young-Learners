// pages/login/login.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    mode: 'login', // login / register
    username: '',
    password: '',
    confirmPassword: '',
    loading: false
  },

  // 切换登录/注册模式
  switchMode() {
    this.setData({
      mode: this.data.mode === 'login' ? 'register' : 'login',
      username: '',
      password: '',
      confirmPassword: ''
    });
  },

  // 输入用户名
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 输入确认密码
  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  // 提交登录或注册
  async onSubmit() {
    const { mode, username, password, confirmPassword } = this.data;

    // 校验
    if (!username.trim()) {
      wx.showToast({ title: '请输入学生姓名', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        wx.showToast({ title: '两次密码不一致', icon: 'none' });
        return;
      }
      await this.register();
    } else {
      await this.login();
    }
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

  // 注册
  async register() {
    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...' });

    try {
      const result = await db.users.register(this.data.username, this.data.password);

      wx.hideLoading();
      this.setData({ loading: false });

      if (result.result.success) {
        wx.showModal({
          title: '注册成功',
          content: '请等待老师审核通过后再登录',
          showCancel: false,
          confirmText: '好的',
          success: () => {
            this.setData({ mode: 'login', password: '', confirmPassword: '' });
          }
        });
      } else {
        wx.showModal({
          title: '注册失败',
          content: result.result.message,
          showCancel: false
        });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('注册错误', err);
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
