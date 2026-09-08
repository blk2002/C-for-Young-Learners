// pages/admin-student-edit/admin-student-edit.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    name: '',
    username: '',
    password: '',
    durationDays: 365,
    validUntilText: '',
    saving: false
  },

  onLoad() {
    if (!app.isAdmin()) {
      wx.showModal({
        title: '权限不足',
        content: '只有老师可以创建学生账号',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }
    this.updateValidUntilText();
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 选择有效期时长
  selectDuration(e) {
    const days = parseInt(e.currentTarget.dataset.days, 10);
    this.setData({ durationDays: days });
    this.updateValidUntilText();
  },

  // 算出截止日期
  updateValidUntilText() {
    const target = new Date(Date.now() + this.data.durationDays * 24 * 60 * 60 * 1000);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    this.setData({ validUntilText: `${y}-${m}-${d}` });
  },

  async onSubmit() {
    const { name, username, password, durationDays } = this.data;

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入学生姓名', icon: 'none' });
      return;
    }
    if (!username || !username.trim()) {
      wx.showToast({ title: '请输入登录账号', icon: 'none' });
      return;
    }
    if (username.trim().length < 3) {
      wx.showToast({ title: '登录账号至少3位', icon: 'none' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      wx.showToast({ title: '账号只能包含字母、数字、下划线', icon: 'none' });
      return;
    }
    if (password && password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) {
      wx.showToast({ title: '登录状态已失效', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '创建中...', mask: true });

    try {
      const result = await db.users.createUser(
        userInfo._id,
        name.trim(),
        username.trim(),
        password.trim(),
        durationDays
      );

      wx.hideLoading();

      if (result.result && result.result.success) {
        const data = result.result.data;
        wx.showModal({
          title: '创建成功',
          content: `学生：${data.name}\n账号：${data.username}\n初始密码：${data.initialPassword}\n有效期至：${this.data.validUntilText}`,
          showCancel: false,
          success: () => wx.navigateBack()
        });
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '创建失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('创建账号失败', err);
      wx.showToast({ title: '创建失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
