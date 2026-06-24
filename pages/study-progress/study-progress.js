// pages/study-progress/study-progress.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    progressData: [],
    loading: true
  },

  onShow() {
    this.loadProgress();
  },

  async loadProgress() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      const courses = app.globalData.courses;
      const progressList = [];

      for (let course of courses) {
        let chapters = [];
        let totalLessons = 0;

        try {
          const chaptersResult = await db.courses.getChapters(course.id);
          chapters = chaptersResult.data;

          for (let chapter of chapters) {
            try {
              const lessonsResult = await db.courses.getLessons(chapter._id);
              totalLessons += lessonsResult.data.length;
            } catch (e) {
              console.log('获取知识点失败', e);
            }
          }
        } catch (e) {
          console.log('获取章节失败', e);
        }

        let currentLessonTitle = '未开始';
        let isLearning = false;

        try {
          const progressResult = await db.progress.getProgress(userInfo._id, course.id);
          if (progressResult.data.length > 0) {
            const progress = progressResult.data[0];
            try {
              const lessonResult = await db.courses.getLesson(progress.lessonId);
              if (lessonResult.data) {
                currentLessonTitle = lessonResult.data.title;
                isLearning = true;
              }
            } catch (e) {
              console.log('获取知识点详情失败', e);
            }
          }
        } catch (e) {
          console.log('获取进度失败', e);
        }

        progressList.push({
          courseId: course.id,
          courseName: course.name,
          icon: course.icon,
          color: course.color,
          totalLessons: totalLessons,
          currentLessonTitle: currentLessonTitle,
          isLearning: isLearning
        });
      }

      this.setData({
        progressData: progressList,
        loading: false
      });
    } catch (err) {
      console.error('加载进度失败', err);
      this.setData({ loading: false });
    }
  },

  goToCourse(e) {
    const courseId = e.currentTarget.dataset.id;
    const courseName = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: `/pages/chapters/chapters?courseId=${courseId}&courseName=${courseName}`
    });
  }
});
