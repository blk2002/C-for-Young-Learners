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
    wx.setNavigationBarTitle({ title: examName + ' - 等级列表' });
    this.initLevels();
    this.loadLevelCounts();
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

  onShow() {
    if (this.data.courseId && this.data.examType) {
      this.loadLevelCounts();
    }
  },

  goToEdit(e) {
    const level = e.currentTarget.dataset.level;
    wx.navigateTo({
      url: `/pages/admin-exam-edit/admin-exam-edit?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&examType=${this.data.examType}&examName=${encodeURIComponent(this.data.examName)}&level=${encodeURIComponent(level)}`
    });
  }
});
