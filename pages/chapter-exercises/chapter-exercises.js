// pages/chapter-exercises/chapter-exercises.js
const app = getApp();

Page({
  data: {
    courseId: '',
    courseName: ''
  },

  onLoad(options) {
    const courseId = options.courseId;
    const courses = app.globalData.courses;
    const course = courses.find(c => c.id === courseId);
    
    this.setData({
      courseId: courseId,
      courseName: course ? course.name : ''
    });

    wx.setNavigationBarTitle({
      title: course ? `${course.name} - 章节习题` : '章节知识点习题'
    });
  }
});