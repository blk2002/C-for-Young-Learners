const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    examType: '',
    examName: '',
    levels: [],
    levelQuestionCounts: {}
  },

  onLoad(options) {
    const courseId = options.courseId || 'cpp';
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : 'C++';
    const examType = options.examType || 'CIE';
    const examName = options.examName ? decodeURIComponent(options.examName) : 'CIE';
    this.setData({ courseId, courseName, examType, examName });
    wx.setNavigationBarTitle({ title: examName });
    this.initLevels();
    this.loadLevelCounts();
  },

  onShow() {
    if (this.data.courseId && this.data.examType) {
      this.loadLevelCounts();
    }
  },

  initLevels() {
    const { courseId, examType } = this.data;
    let levels = [];

    if (examType === 'CIE') {
      if (courseId === 'python') {
        levels = ['一级', '二级', '三级', '四级', '五级', '六级'];
      } else {
        levels = ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'];
      }
    } else if (examType === 'GESP') {
      levels = ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级'];
    } else if (examType === 'CSP-JS') {
      levels = ['CSP-J（入门级）', 'CSP-S（提高级）'];
    }

    this.setData({ levels });
  },

  async loadLevelCounts() {
    try {
      const result = await db.examQuestions.getLevelsWithQuestions(
        this.data.courseId,
        this.data.examType
      );

      const levelData = (result.result && result.result.data) || [];
      const levelQuestionCounts = {};
      levelData.forEach(item => {
        levelQuestionCounts[item.level] = item.questionCount;
      });

      this.setData({ levelQuestionCounts });
    } catch (err) {
      console.error('加载等级题数失败', err);
    }
  },

  goToPractice(e) {
    const level = e.currentTarget.dataset.level;
    const count = this.data.levelQuestionCounts[level] || 0;

    if (count === 0) {
      wx.showToast({ title: '该等级暂无习题', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/exam-practice/exam-practice?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&examType=${this.data.examType}&examName=${encodeURIComponent(this.data.examName)}&level=${encodeURIComponent(level)}`
    });
  }
});
