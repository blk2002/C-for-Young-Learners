// pages/progress/progress.js
const app = getApp();

Page({
  data: {
    currentCourse: 'cpp',
    courseInfo: null
  },

  onLoad() {
    // 默认显示第一个课程
    const courses = app.globalData.courses;
    if (courses && courses.length > 0) {
      this.setData({
        currentCourse: courses[0].id,
        courseInfo: courses[0]
      });
    }
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
  },

  // 切换课程
  switchCourse(e) {
    const courseId = e.currentTarget.dataset.course;
    const courses = app.globalData.courses;
    const courseInfo = courses.find(c => c.id === courseId);
    
    this.setData({
      currentCourse: courseId,
      courseInfo: courseInfo
    });
  },

  // 进入章节知识点习题
  goToChapterExercises() {
    wx.navigateTo({
      url: `/pages/chapter-exercises/chapter-exercises?courseId=${this.data.currentCourse}`
    });
  },

  // 进入等级考试习题
  goToExamExercises() {
    wx.navigateTo({
      url: `/pages/exam-exercises/exam-exercises?courseId=${this.data.currentCourse}`
    });
  }
});