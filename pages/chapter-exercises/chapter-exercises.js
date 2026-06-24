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
      title: course ? `${course.name} - 章节习题` : '章节知识点习题'
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
      const userInfo = app.getUserInfo();
      const userId = userInfo ? userInfo._id : null;
      const result = await db.courses.getChapters(this.data.courseId);
      const chapters = result.data || [];

      chapters.sort((a, b) => (a.order || 0) - (b.order || 0));

      const chaptersWithStats = await Promise.all(
        chapters.map(async (chapter) => {
          try {
            const lessonsResult = await db.courses.getLessons(chapter._id);
            const lessons = lessonsResult.data || [];

            let totalQuestions = 0;
            let completedQuestions = 0;

            for (const lesson of lessons) {
              try {
                const qResult = await db.chapterQuestions.getQuestions(
                  this.data.courseId,
                  chapter._id,
                  lesson._id
                );
                const questions = qResult.result
                  && qResult.result.data
                  && qResult.result.data.questions
                  ? qResult.result.data.questions
                  : [];
                totalQuestions += questions.length;
              } catch (e) {
                console.log('获取知识点习题失败', e);
              }
            }

            if (userId) {
              try {
                const progressResult = await db.wrongQuestions.getExerciseProgress(
                  userId,
                  this.data.courseId,
                  chapter._id
                );
                const progressList = progressResult.result
                  && progressResult.result.data
                  ? progressResult.result.data
                  : [];
                completedQuestions = progressList.reduce(
                  (sum, p) => sum + (p.correctCount || 0), 0
                );
              } catch (e) {
                console.log('获取练习进度失败', e);
              }
            }

            const progressPercent = totalQuestions > 0
              ? Math.min(100, Math.round((completedQuestions / totalQuestions) * 100))
              : 0;

            return {
              ...chapter,
              totalQuestions,
              completedQuestions,
              progressPercent
            };
          } catch (e) {
            return {
              ...chapter,
              totalQuestions: 0,
              completedQuestions: 0,
              progressPercent: 0
            };
          }
        })
      );

      this.setData({
        chapters: chaptersWithStats,
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
      url: `/pages/lesson-exercises/lesson-exercises?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&chapterId=${chapterId}&chapterTitle=${encodeURIComponent(chapterTitle)}`
    });
  }
});
