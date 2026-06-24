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
      const userInfo = app.getUserInfo();
      const userId = userInfo ? userInfo._id : null;
      const result = await db.courses.getLessons(this.data.chapterId);
      const lessons = result.data || [];

      lessons.sort((a, b) => (a.order || 0) - (b.order || 0));

      const lessonsWithStats = await Promise.all(
        lessons.map(async (lesson) => {
          try {
            const qResult = await db.chapterQuestions.getQuestions(
              this.data.courseId,
              this.data.chapterId,
              lesson._id
            );
            const questions = qResult.result
              && qResult.result.data
              && qResult.result.data.questions
              ? qResult.result.data.questions
              : [];

            let completedCount = 0;

            if (userId) {
              try {
                const progressResult = await db.wrongQuestions.getExerciseProgress(
                  userId,
                  this.data.courseId,
                  this.data.chapterId,
                  lesson._id
                );
                const progressList = progressResult.result
                  && progressResult.result.data
                  ? progressResult.result.data
                  : [];
                if (progressList.length > 0) {
                  completedCount = progressList[0].correctCount || 0;
                }
              } catch (e) {
                console.log('获取练习进度失败', e);
              }
            }

            const questionCount = questions.length;
            const progressPercent = questionCount > 0
              ? Math.min(100, Math.round((completedCount / questionCount) * 100))
              : 0;

            let practiceStatus = 'not-started';
            let statusText = '未开始';
            if (questionCount === 0) {
              practiceStatus = 'no-questions';
              statusText = '暂无习题';
            } else if (completedCount >= questionCount) {
              practiceStatus = 'completed';
              statusText = '已完成';
            } else if (completedCount > 0) {
              practiceStatus = 'in-progress';
              statusText = '练习中';
            }

            return {
              ...lesson,
              questionCount,
              completedCount,
              progressPercent,
              practiceStatus,
              statusText
            };
          } catch (e) {
            return {
              ...lesson,
              questionCount: 0,
              completedCount: 0,
              progressPercent: 0,
              practiceStatus: 'not-started',
              statusText: '未开始'
            };
          }
        })
      );

      this.setData({
        lessons: lessonsWithStats,
        loading: false
      });
    } catch (err) {
      console.error('加载知识点失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToPractice(e) {
    const lessonId = e.currentTarget.dataset.lessonid;
    const lessonTitle = e.currentTarget.dataset.lessontitle;

    wx.navigateTo({
      url: `/pages/exercise-practice/exercise-practice?courseId=${this.data.courseId}&chapterId=${this.data.chapterId}&lessonId=${lessonId}&lessonTitle=${encodeURIComponent(lessonTitle)}&chapterTitle=${encodeURIComponent(this.data.chapterTitle)}`
    });
  }
});
