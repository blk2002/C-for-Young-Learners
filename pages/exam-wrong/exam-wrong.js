const app = getApp();
const db = require('../../utils/db.js');

const EXAM_TYPE_CONFIG = {
  CIE: { examType: 'CIE', examName: 'CIE', icon: '🏆', color: '#667eea', colorDark: '#764ba2' },
  GESP: { examType: 'GESP', examName: 'GESP', icon: '🎯', color: '#f093fb', colorDark: '#f5576c' },
  CSP: { examType: 'CSP-JS', examName: 'CSP-J/S', icon: '💻', color: '#4facfe', colorDark: '#00f2fe' }
};

Page({
  data: {
    courseId: '',
    courseName: '',
    examTypes: [],
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
      title: course ? `${course.name} - 考试错题` : '等级考试错题'
    });

    this.loadExamTypes();
  },

  onShow() {
    if (this.data.courseId) {
      this.loadExamTypes();
    }
  },

  async loadExamTypes() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      const result = await db.wrongQuestions.getWrongExamTypes(
        userInfo._id,
        this.data.courseId
      );

      const wrongTypes = result.result && result.result.data
        ? result.result.data
        : [];

      const examTypes = wrongTypes.map(item => {
        const config = EXAM_TYPE_CONFIG[item.examType] || {
          examType: item.examType,
          examName: item.examType,
          icon: '📝',
          color: '#999',
          colorDark: '#666'
        };
        return {
          ...config,
          wrongCount: item.wrongCount
        };
      });

      this.setData({ examTypes, loading: false });
    } catch (err) {
      console.error('加载考试错题类型失败', err);
      this.setData({ loading: false });
    }
  },

  goToLevels(e) {
    const examType = e.currentTarget.dataset.type;
    const examName = e.currentTarget.dataset.name;

    wx.navigateTo({
      url: `/pages/exam-wrong-levels/exam-wrong-levels?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&examType=${examType}&examName=${encodeURIComponent(examName)}`
    });
  }
});
