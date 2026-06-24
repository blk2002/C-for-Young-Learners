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

  getAllLevels() {
    const { courseId, examType } = this.data;
    const levels = [];

    if (examType === 'CIE') {
      if (courseId === 'python') {
        ['一级', '二级', '三级', '四级', '五级', '六级'].forEach((name, i) => {
          levels.push({ level: name, levelName: name, levelIndex: i + 1 });
        });
      } else {
        ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级'].forEach((name, i) => {
          levels.push({ level: name, levelName: name, levelIndex: i + 1 });
        });
      }
    } else if (examType === 'GESP') {
      ['一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级'].forEach((name, i) => {
        levels.push({ level: name, levelName: name, levelIndex: i + 1 });
      });
    } else {
      ['CSP-J（入门级）', 'CSP-S（提高级）'].forEach((name, i) => {
        levels.push({ level: name, levelName: name, levelIndex: i + 1 });
      });
    }

    return levels;
  },

  goToPractice(e) {
    const level = e.currentTarget.dataset.level;

    wx.navigateTo({
      url: `/pages/wrong-practice/wrong-practice?source=exam&courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&examType=${this.data.examType}&examName=${encodeURIComponent(this.data.examName)}&level=${encodeURIComponent(level)}`
    });
  }
});
