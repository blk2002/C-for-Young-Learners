const app = getApp();
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

  // 等级列表不再写死：从学科 examConfig 里该考试类型的 levels 取
  // （配置在工作台「考试类型配置」维护，随 courses 集合下发）。
  // 未配置时先留空，loadLevelCounts 会用云端实际有题的等级兜底。
  initLevels() {
    const { courseId, examType } = this.data;
    const courses = app.globalData.courses || [];
    const course = courses.find(c => c.id === courseId);
    const cfg = (((course && course.examConfig) || []) || []).find(t => t.type === examType);
    const levels = (cfg && Array.isArray(cfg.levels)) ? cfg.levels.filter(Boolean) : [];
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

      // 兜底：该考试类型未配置等级列表时，用云端实际有题的等级展示
      let levels = this.data.levels;
      if (!levels.length && levelData.length) {
        levels = levelData.filter(item => item.questionCount > 0).map(item => item.level);
        this.setData({ levels });
      }

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
