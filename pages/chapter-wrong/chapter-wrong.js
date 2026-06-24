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
    const courses = app.globalData.courses;
    const course = courses.find(c => c.id === courseId);

    this.setData({
      courseId: courseId,
      courseName: course ? course.name : ''
    });

    wx.setNavigationBarTitle({
      title: course ? `${course.name} - 章节错题` : '章节知识点错题'
    });

    this.loadWrongChapters();
  },

  onShow() {
    if (this.data.courseId) {
      this.loadWrongChapters();
    }
  },

  async loadWrongChapters() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      const chaptersResult = await db.courses.getChapters(this.data.courseId);
      const allChapters = chaptersResult.data || [];

      const wrongResult = await db.wrongQuestions.getWrongChapters(
        userInfo._id,
        this.data.courseId
      );

      const wrongChaptersData = wrongResult.result && wrongResult.result.data
        ? wrongResult.result.data
        : [];

      const wrongChapterMap = {};
      for (const item of wrongChaptersData) {
        wrongChapterMap[item.chapterId] = item.wrongCount;
      }

      const chaptersWithWrong = allChapters
        .filter(chapter => wrongChapterMap[chapter._id] && wrongChapterMap[chapter._id] > 0)
        .map(chapter => ({
          ...chapter,
          wrongCount: wrongChapterMap[chapter._id]
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      this.setData({
        chapters: chaptersWithWrong,
        loading: false
      });
    } catch (err) {
      console.error('加载错题章节失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToLessons(e) {
    const chapterId = e.currentTarget.dataset.chapterid;
    const chapterTitle = e.currentTarget.dataset.chaptertitle;

    wx.navigateTo({
      url: `/pages/wrong-lesson/wrong-lesson?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&chapterId=${chapterId}&chapterTitle=${encodeURIComponent(chapterTitle)}`
    });
  }
});
