const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    examType: '',
    examName: '',
    levels: [],
    loading: true
  },

  onLoad(options) {
    const courseId = options.courseId;
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : '';
    const examType = options.examType;
    const examName = options.examName ? decodeURIComponent(options.examName) : '';

    this.setData({ courseId, courseName, examType, examName });

    wx.setNavigationBarTitle({ title: examName + ' - 错题' });

    this.loadLevels();
  },

  onShow() {
    if (this.data.courseId && this.data.examType) {
      this.loadLevels();
    }
  },

  async loadLevels() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      const wrongResult = await db.wrongQuestions.getWrongExamLevels(
        userInfo._id,
        this.data.courseId,
        this.data.examType
      );

      const wrongLevels = wrongResult.result && wrongResult.result.data
        ? wrongResult.result.data
        : [];

      const allLevels = this.getAllLevels();

      const levels = wrongLevels.map(item => {
        const levelInfo = allLevels.find(l => l.level === item.level) || {
          levelName: item.level,
          levelIndex: '?'
        };
        return {
          level: item.level,
          levelName: levelInfo.levelName,
          levelIndex: levelInfo.levelIndex,
          wrongCount: item.wrongCount
        };
      });

      this.setData({ levels, loading: false });
    } catch (err) {
      console.error('加载等级错题失败', err);
      this.setData({ loading: false });
    }
  },

  // 等级名称/序号优先取学科 examConfig 里该类型的 levels；
  // 未配置时返回空列表，loadLevels 里会用云端实际错题的 level 兜底展示。
  getAllLevels() {
    const { courseId, examType } = this.data;
    const courses = app.globalData.courses || [];
    const course = courses.find(c => c.id === courseId);
    const cfg = (((course && course.examConfig) || []) || []).find(t => t.type === examType);
    if (cfg && Array.isArray(cfg.levels) && cfg.levels.length) {
      return cfg.levels.filter(Boolean).map((name, i) => ({
        level: name, levelName: name, levelIndex: i + 1
      }));
    }
    return [];
  },

  goToPractice(e) {
    const level = e.currentTarget.dataset.level;

    wx.navigateTo({
      url: `/pages/wrong-practice/wrong-practice?source=exam&courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&examType=${this.data.examType}&examName=${encodeURIComponent(this.data.examName)}&level=${encodeURIComponent(level)}`
    });
  }
});
