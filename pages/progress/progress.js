// pages/progress/progress.js
const app = getApp();

Page({
  data: {
    courses: [],
    currentCourse: '',
    courseInfo: null
  },

  onShow() {
    // 检查登录状态
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
    const courseName = this.data.courseInfo ? this.data.courseInfo.name : '';
    wx.navigateTo({
      url: `/pages/chapter-exercises/chapter-exercises?courseId=${this.data.currentCourse}&courseName=${courseName}`
    });
  },

  // 进入等级考试习题
  goToExamExercises() {
    const courseName = this.data.courseInfo ? this.data.courseInfo.name : '';
    wx.navigateTo({
      url: `/pages/exam-exercises/exam-exercises?courseId=${this.data.currentCourse}&courseName=${courseName}`
    });
  }
});
