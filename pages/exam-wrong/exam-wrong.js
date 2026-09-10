const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    examTypes: [],
    loading: true
  },

  onLoad(options) {
    const courseId = options.courseId;
    this.setData({
      courseId: courseId
    });

    wx.setNavigationBarTitle({
      title: '等级考试错题'
    });

    this.loadExamTypes();
  },

  onShow() {
    if (this.data.courseId) {
      this.loadExamTypes();
    }
  },

  // 本页按 wrongQuestions 实际错题聚合（数据驱动，做错什么显示什么）；
  // 名称 / 图标 / 颜色从学科 examConfig 里取，未配置的类型走灰色兜底。
  async loadExamTypes() {
    this.setData({ loading: true });

    try {
      // 先刷一次学科（管理员可能刚在工作台改过配置）
      try { await app.loadCourses(); } catch (e) { /* 拉取失败沿用现有 globalData */ }

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

      const courses = app.globalData.courses || [];
      const course = courses.find(c => c.id === this.data.courseId);
      const config = (course && course.examConfig) || [];

      const examTypes = wrongTypes.map(item => {
        const cfg = config.find(t => t.type === item.examType);
        return {
          examType: item.examType,
          examName: (cfg && cfg.name) || item.examType,
          icon: (cfg && cfg.icon) || 'i-edit',
          color: (cfg && cfg.color) || '#9AA0B0',
          colorDark: (cfg && cfg.colorDark) || '#666',
          wrongCount: item.wrongCount
        };
      });

      // 标题带上学科名（此时 courses 已刷新）
      const courseFresh = courses.find(c => c.id === this.data.courseId);
      if (courseFresh && courseFresh.name) {
        wx.setNavigationBarTitle({ title: courseFresh.name + ' - 考试错题' });
      }

      this.setData({ examTypes, courseName: (courseFresh && courseFresh.name) || '', loading: false });
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
