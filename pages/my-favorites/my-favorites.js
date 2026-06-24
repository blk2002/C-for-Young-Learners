// pages/my-favorites/my-favorites.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    favorites: [],
    loading: true
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      const result = await db.favorites.getFavorites(userInfo._id);
      if (result.result && result.result.success) {
        this.setData({
          favorites: result.result.data,
          loading: false
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载收藏失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToLesson(e) {
    const lessonId = e.currentTarget.dataset.lesson;
    const chapterId = e.currentTarget.dataset.chapter;
    const courseId = e.currentTarget.dataset.course;
    const title = e.currentTarget.dataset.title;

    wx.navigateTo({
      url: `/pages/lesson/lesson?chapterId=${chapterId}&lessonId=${lessonId}&title=${encodeURIComponent(title)}&courseId=${courseId}`
    });
  }
});
