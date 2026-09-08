// pages/profile-edit/profile-edit.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    userInfo: null,
    username: '',
    name: '',
    initial: '',
    signature: '',
    avatarUrl: '',
    tempAvatarPath: '',
    isAdmin: false,
    saving: false,
    origin: '',   // 初始快照，用于判断是否有未保存的修改
    dirty: false
  },

  onLoad() {
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    const userInfo = app.getUserInfo();
    const name = userInfo.name || userInfo.nickname || userInfo.username || '';
    const signature = userInfo.signature || '';
    const avatar = userInfo.avatar || '';

    this.setData({
      userInfo,
      username: userInfo.username,
      name,
      initial: name.charAt(0).toUpperCase(),
      signature,
      avatarUrl: avatar,
      isAdmin: app.isAdmin(),
      origin: this.snapshot(name, signature, avatar)
    });
  },

  onUnload() {
    // 离开页面时务必关掉拦截，避免影响其他页面
    this.syncLeaveGuard(false);
  },

  // 生成内容快照，用于比对是否被修改过
  snapshot(name, signature, avatar) {
    return [(name || '').trim(), (signature || '').trim(), avatar || ''].join('\u0001');
  },

  // 比对当前值与初始快照，同步「离开拦截」状态
  checkDirty() {
    const cur = this.snapshot(this.data.name, this.data.signature, this.data.avatarUrl);
    const dirty = cur !== this.data.origin;
    if (dirty === this.data.dirty) return;

    this.setData({ dirty });
    this.syncLeaveGuard(dirty);
  },

  // 有未保存修改时，拦截左上角返回 / 手势返回
  syncLeaveGuard(dirty) {
    try {
      if (dirty && wx.enableAlertBeforeUnload) {
        wx.enableAlertBeforeUnload({ message: '有修改还没保存，确定离开吗？' });
      } else if (wx.disableAlertBeforeUnload) {
        wx.disableAlertBeforeUnload();
      }
    } catch (err) {
      // 低版本基础库不支持该能力，忽略即可
      console.warn('离开拦截不可用', err);
    }
  },

  // 点击头像（open-type="chooseAvatar"）→ 直接唤起微信头像选择
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl,
      tempAvatarPath: avatarUrl
    }, () => this.checkDirty());
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value }, () => this.checkDirty());
  },

  onSignatureInput(e) {
    this.setData({ signature: e.detail.value }, () => this.checkDirty());
  },

  goToChangePassword() {
    wx.navigateTo({ url: '/pages/change-password/change-password' });
  },

  async uploadAvatar() {
    if (!this.data.tempAvatarPath) {
      return this.data.userInfo.avatar || '';
    }

    const userId = this.data.userInfo._id;
    const cloudPath = `avatars/${userId}_${Date.now()}.jpg`;

    const uploadResult = await wx.cloud.uploadFile({
      cloudPath,
      filePath: this.data.tempAvatarPath
    });

    return uploadResult.fileID;
  },

  async saveProfile() {
    const { name, signature } = this.data;

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (name.trim().length < 2) {
      wx.showToast({ title: '姓名至少2个字符', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      let avatarFileId = '';
      if (this.data.tempAvatarPath) {
        avatarFileId = await this.uploadAvatar();
      } else {
        avatarFileId = this.data.userInfo.avatar || '';
      }

      const result = await db.users.updateProfile(this.data.userInfo._id, {
        name: name.trim(),
        nickname: name.trim(),
        signature: signature.trim(),
        avatar: avatarFileId
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        app.setUserInfo(result.result.data);

        // 存成功了就解除拦截，否则返回时会误弹「未保存」
        this.syncLeaveGuard(false);
        this.setData({
          origin: this.snapshot(name, signature, avatarFileId),
          dirty: false,
          tempAvatarPath: ''
        });

        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});