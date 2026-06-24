// pages/admin-lessons/admin-lessons.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    chapterId: '',
    chapterTitle: '',
    lessons: [],
    loading: true
  },

  onLoad(options) {
    const courseId = options.courseId;
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : '';
    const chapterId = options.chapterId;
    const chapterTitle = options.chapterTitle ? decodeURIComponent(options.chapterTitle) : '';

    this.setData({
      courseId: courseId,
      courseName: courseName,
      chapterId: chapterId,
      chapterTitle: chapterTitle
    });

    wx.setNavigationBarTitle({
      title: `${chapterTitle} - 知识点`
    });

    this.loadLessons();
  },

  onShow() {
    if (this.data.chapterId) {
      this.loadLessons();
    }
  },

  async loadLessons() {
    this.setData({ loading: true });

    try {
      // 加载知识点
      const result = await db.courses.getLessons(this.data.chapterId);
      const lessons = result.data || [];

      // 按序号排序
      lessons.sort((a, b) => (a.order || 0) - (b.order || 0));

      // 检查每个知识点是否有习题
      const lessonsWithQuestions = await Promise.all(
        lessons.map(async (lesson) => {
          try {
            const qResult = await db.chapterQuestions.getQuestions(
              this.data.courseId,
              this.data.chapterId,
              lesson._id
            );
            return {
              ...lesson,
              hasQuestions: qResult.result
                && qResult.result.data
                && qResult.result.data.questions
                && qResult.result.data.questions.length > 0
            };
          } catch (e) {
            return {
              ...lesson,
              hasQuestions: false
            };
          }
        })
      );

      this.setData({
        lessons: lessonsWithQuestions,
        loading: false
      });
    } catch (err) {
      console.error('加载知识点失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 进入习题管理
  goToExerciseEdit(e) {
    const lessonId = e.currentTarget.dataset.lessonid;
    const lessonTitle = e.currentTarget.dataset.lessontitle;

    wx.navigateTo({
      url: `/pages/admin-exercise-edit/admin-exercise-edit?courseId=${this.data.courseId}&chapterId=${this.data.chapterId}&lessonId=${lessonId}&lessonTitle=${encodeURIComponent(lessonTitle)}&chapterTitle=${encodeURIComponent(this.data.chapterTitle)}`
    });
  }
});