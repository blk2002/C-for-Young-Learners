const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    examTypes: []
  },

  onLoad(options) {
    const courseId = options.courseId || 'cpp';
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : 'C++';
    this.setData({ courseId, courseName });
    wx.setNavigationBarTitle({ title: courseName + ' - 等级考试' });
    this.loadExamTypes();
  },

  onShow() {
    if (this.data.courseId) {
      this.loadExamTypes();
    }
  },

  // 考试类型不再写死在本页：以学科 examConfig 配置为准（工作台「考试类型配置」维护，
  // 随 courses 集合下发；内置 python / cpp 缺配置时由 app.js 用默认配置兜底）。
  // 兜底：云端有题但未配置的类型也展示（灰卡），防止配置丢失导致题目不可达。
  async loadExamTypes() {
    // 先刷一次学科（管理员可能刚在工作台改过配置）
    try { await app.loadCourses(); } catch (e) { /* 拉取失败沿用现有 globalData */ }

    const { courseId } = this.data;
    const courses = app.globalData.courses || [];
    const course = courses.find(c => c.id === courseId);
    const config = (course && course.examConfig) || [];

    const examTypes = config.map(x => ({
      type: x.type,
      name: x.name || x.type,
      desc: x.desc || '',
      icon: x.icon || 'i-book',
      color: x.color || '#5B67F1'
    }));

    try {
      const res = await db.examQuestions.getTypesWithQuestions(courseId);
      const actual = (res.result && res.result.data) || [];
      actual.forEach(item => {
        if (!item.examType || examTypes.some(t => t.type === item.examType)) return;
        examTypes.push({
          type: item.examType,
          name: item.examType,
          desc: '未配置的考试类型（现有 ' + item.questionCount + ' 道题）',
          icon: 'i-edit',
          color: '#9AA0B0'
        });
      });
    } catch (e) {
      console.warn('聚合考试类型失败，仅展示已配置类型', e);
    }

    this.setData({ examTypes });
  },

  goToLevels(e) {
    const { type, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/exam-levels/exam-levels?courseId=${this.data.courseId}&courseName=${encodeURIComponent(this.data.courseName)}&examType=${type}&examName=${encodeURIComponent(name)}`
    });
  }
});
