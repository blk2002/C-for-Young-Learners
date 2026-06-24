// pages/profile-edit/profile-edit.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    userInfo: null,
    username: '',
    nickname: '',
    signature: '',
    avatarUrl: '',
    tempAvatarPath: '',
    isAdmin: false,
    saving: false
  },

  onLoad() {
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    const userInfo = app.getUserInfo();
    this.setData({
      userInfo,
      username: userInfo.username,
      nickname: userInfo.nickname || '',
      signature: userInfo.signature || '',
      avatarUrl: userInfo.avatar || '',
      isAdmin: app.isAdmin()
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl,
      tempAvatarPath: avatarUrl
    });
  },

  chooseFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          avatarUrl: tempFilePath,
          tempAvatarPath: tempFilePath
        });
      },
      fail: (err) => {
        console.error('选择图片失败', err);
      }
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onSignatureInput(e) {
    this.setData({ signature: e.detail.value });
  },

  async uploadAvatar() {
    if (!this.data.tempAvatarPath) {
      return this.data.userInfo.avatar || '';
    }

    try {
      const userId = this.data.userInfo._id;
      const cloudPath = `avatars/${userId}_${Date.now()}.jpg`;

      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.tempAvatarPath
      });

      return uploadResult.fileID;
    } catch (err) {
      console.error('头像上传失败', err);
      throw err;
    }
  },

  async saveProfile() {
    const { nickname, signature } = this.data;

    if (nickname && nickname.length < 2) {
      wx.showToast({ title: '昵称至少2个字符', icon: 'none' });
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
        nickname: nickname.trim(),
        signature: signature.trim(),
        avatar: avatarFileId
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        const updatedUser = result.result.data;
        app.setUserInfo(updatedUser);

        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        wx.showToast({
          title: result.result?.message || '保存失败',
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
