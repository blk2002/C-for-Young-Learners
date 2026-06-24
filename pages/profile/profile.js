// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    isAdmin: false
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    this.setData({
      userInfo: app.getUserInfo(),
      isAdmin: app.isAdmin()
    });
  },

  // 进入我的收藏
  goToFavorites() {
    wx.navigateTo({ url: '/pages/my-favorites/my-favorites' });
  },

  // 进入学习进度
  goToProgress() {
    wx.navigateTo({ url: '/pages/study-progress/study-progress' });
  },

  // 进入管理员页面
  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  // 进入编辑资料页
  goToEditProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});
