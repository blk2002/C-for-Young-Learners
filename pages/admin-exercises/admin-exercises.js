// pages/admin-exercises/admin-exercises.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    chapters: [],
    loading: true
  },

  onLoad(options) {
    const courseId = options.courseId;
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : '';

    this.setData({
      courseId: courseId,
      courseName: courseName
    });

    wx.setNavigationBarTitle({
      title: `${courseName} - 章节知识点习题`
    });

    this.loadChapters();
  },

  onShow() {
    if (this.data.courseId) {
      this.loadChapters();
    }
  },

  async loadChapters() {
    this.setData({ loading: true });

    try {
      const result = await db.courses.getChapters(this.data.courseId);
      const chapters = result.data || [];

      // 按序号排序
      chapters.sort((a, b) => (a.order || 0) - (b.order || 0));

      this.setData({
        chapters: chapters,
        loading: false
      });
    } catch (err) {
      console.error('加载章节失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToLessons(e) {
    const chapterId = e.currentTarget.dataset.chapterid;
    const chapterTitle = e.currentTarget.dataset.chaptertitle;

    wx.navigateTo({
      url: `/pages/admin-lessons/admin-lessons?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&chapterId=${chapterId}&chapterTitle=${encodeURIComponent(chapterTitle)}`
    });
  }
});