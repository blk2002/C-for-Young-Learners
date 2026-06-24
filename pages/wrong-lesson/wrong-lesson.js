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
      title: `${chapterTitle} - 错题`
    });

    this.loadWrongLessons();
  },

  onShow() {
    if (this.data.chapterId) {
      this.loadWrongLessons();
    }
  },

  async loadWrongLessons() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      const lessonsResult = await db.courses.getLessons(this.data.chapterId);
      const allLessons = lessonsResult.data || [];

      const wrongResult = await db.wrongQuestions.getWrongLessons(
        userInfo._id,
        this.data.courseId,
        this.data.chapterId
      );

      const wrongLessonsData = wrongResult.result && wrongResult.result.data
        ? wrongResult.result.data
        : [];

      const wrongLessonMap = {};
      for (const item of wrongLessonsData) {
        wrongLessonMap[item.lessonId] = item;
      }

      const lessonsWithWrong = allLessons
        .filter(lesson => wrongLessonMap[lesson._id] && wrongLessonMap[lesson._id].wrongCount > 0)
        .map(lesson => ({
          ...lesson,
          wrongCount: wrongLessonMap[lesson._id].wrongCount,
          lastWrongAt: wrongLessonMap[lesson._id].lastWrongAt
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      this.setData({
        lessons: lessonsWithWrong,
        loading: false
      });
    } catch (err) {
      console.error('加载错题知识点失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToPractice(e) {
    const lessonId = e.currentTarget.dataset.lessonid;
    const lessonTitle = e.currentTarget.dataset.lessontitle;

    wx.navigateTo({
      url: `/pages/wrong-practice/wrong-practice?courseId=${this.data.courseId}&chapterId=${this.data.chapterId}&lessonId=${lessonId}&lessonTitle=${encodeURIComponent(lessonTitle)}&chapterTitle=${encodeURIComponent(this.data.chapterTitle)}`
    });
  }
});
