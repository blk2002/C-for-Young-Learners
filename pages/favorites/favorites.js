// pages/favorites/favorites.js
const app = getApp();

Page({
  data: {
    courses: [],
    currentCourse: '',
    courseInfo: null
  },

  onShow() {
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    // 每次显示都同步学科列表（新学科自动出现）
    this.refreshCourses();
  },

  // 从 globalData 同步学科 tab；当前选中失效（被删）时回落到第一门
  refreshCourses() {
    const courses = app.globalData.courses || [];
    const current = courses.find(c => c.id === this.data.currentCourse);
    this.setData({
      courses,
      currentCourse: current ? current.id : (courses[0] ? courses[0].id : ''),
      courseInfo: current || courses[0] || null
    });
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
