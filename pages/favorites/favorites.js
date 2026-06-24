// pages/favorites/favorites.js
const app = getApp();

Page({
  data: {
    currentCourse: 'cpp',
    courseInfo: null
  },

  onLoad() {
    const courses = app.globalData.courses;
    if (courses && courses.length > 0) {
      this.setData({
        currentCourse: courses[0].id,
        courseInfo: courses[0]
      });
    }
  },

  onShow() {
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
  },

  switchCourse(e) {
    const courseId = e.currentTarget.dataset.course;
    const courses = app.globalData.courses;
    const courseInfo = courses.find(c => c.id === courseId);
    
    this.setData({
      currentCourse: courseId,
      courseInfo: courseInfo
    });
  },

  goToChapterWrong() {
    wx.navigateTo({
      url: `/pages/chapter-wrong/chapter-wrong?courseId=${this.data.currentCourse}`
    });
  },

  goToExamWrong() {
    wx.navigateTo({
      url: `/pages/exam-wrong/exam-wrong?courseId=${this.data.currentCourse}`
    });
  }
});