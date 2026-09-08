// pages/index/index.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courses: [],
    userInfo: null,
    displayName: '',
    initial: '',
    lastStudy: null
  },

  onLoad() {
    this.setData({
      courses: app.globalData.courses
    });
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    // 账号过有效期则强制登出
    if (app.enforceValidity()) {
      return;
    }

    const userInfo = app.getUserInfo();
    const displayName = userInfo.name || userInfo.nickname || userInfo.username || '同学';

    this.setData({
      userInfo,
      displayName,
      initial: displayName.charAt(0).toUpperCase(),
      courses: app.globalData.courses
    });

    this.loadHeroData();
  },

  // 加载首页学习进度（真实数据 · 章节维度）
  async loadHeroData() {
    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) return;

    try {
      const res = await db.progress.getAllProgress(userInfo._id);
      const records = (res.data || []).slice();
      if (records.length === 0) {
        this.setData({ lastStudy: null });
        return;
      }

      // 取 updatedAt 最新的一条 = 最近学习的课程
      records.sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
      const latest = records[0];

      const course = app.globalData.courses.find(c => c.id === latest.courseId);
      const courseName = course ? course.name : '';

      // 拉该课程全量章节，算当前章节序号 / 总章节数
      const chaptersRes = await db.courses.getChapters(latest.courseId);
      const chapters = chaptersRes.data || [];
      const idx = chapters.findIndex(c => c._id === latest.chapterId);

      if (idx < 0 || chapters.length === 0) {
        this.setData({ lastStudy: null });
        return;
      }

      const cur = idx + 1;
      const total = chapters.length;
      const percent = Math.round((cur / total) * 100);

      this.setData({
        lastStudy: {
          courseName,
          chapterTitle: chapters[idx].title,
          cur,
          total,
          percent
        }
      });
    } catch (err) {
      console.error('加载首页学习进度失败', err);
      this.setData({ lastStudy: null });
    }
  },

  // 头像跳「我的」页面（tabBar 页，必须 switchTab）
  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  // 进入课程章节
  goToCourse(e) {
    const courseId = e.currentTarget.dataset.id;
    const courseName = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: `/pages/chapters/chapters?courseId=${courseId}&courseName=${courseName}`
    });
  }
});
