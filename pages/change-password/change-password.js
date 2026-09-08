// pages/change-password/change-password.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    saving: false
  },

  onLoad() {
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
    }
  },

  onOldPasswordInput(e) {
    this.setData({ oldPassword: e.detail.value });
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  async onSubmit() {
    const { oldPassword, newPassword, confirmPassword } = this.data;

    if (!oldPassword) {
      wx.showToast({ title: '请输入原密码', icon: 'none' });
      return;
    }
    if (!newPassword) {
      wx.showToast({ title: '请输入新密码', icon: 'none' });
      return;
    }
    if (newPassword.length < 6) {
      wx.showToast({ title: '新密码至少6位', icon: 'none' });
      return;
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
      return;
    }
    if (oldPassword === newPassword) {
      wx.showToast({ title: '新密码不能与原密码相同', icon: 'none' });
      return;
    }

    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) {
      wx.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '提交中...', mask: true });

    try {
      const result = await db.users.changePassword(
        userInfo._id,
        oldPassword,
        newPassword,
        confirmPassword
      );

      wx.hideLoading();

      if (result.result && result.result.success) {
        wx.showModal({
          title: '修改成功',
          content: '请使用新密码重新登录',
          showCancel: false,
          success: () => {
            // 改完密码强制重新登录，避免本地缓存的旧身份信息不一致
            app.logout();
            wx.reLaunch({ url: '/pages/login/login' });
          }
        });
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '修改失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('修改密码失败', err);
      wx.showToast({ title: '修改失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
