// pages/index/index.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courses: [],
    userInfo: null,
    displayName: '',
    initial: '',
    lastStudy: null,
    isAdmin: false
  },

  onLoad() {
    this.setData({
      courses: app.globalData.courses
    });
  },

  async onShow() {
    // 检查登录状态
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    // 账号过有效期则强制登出
    if (app.enforceValidity()) {
      return;
    }

    // 先从云端刷新学科列表（管理员可能刚增删改过），再渲染
    await app.loadCourses();

    const userInfo = app.getUserInfo();
    const displayName = userInfo.name || userInfo.nickname || userInfo.username || '同学';

    this.setData({
      userInfo,
      displayName,
      initial: displayName.charAt(0).toUpperCase(),
      courses: app.globalData.courses,
      isAdmin: app.isAdmin()
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

  // ============ 学科管理（仅管理员） ============

  // ＋ 新建学科（只填名称，图标/颜色自动生成）
  async addCourse() {
    if (!app.isAdmin()) return;
    try {
      const res = await wx.showModal({
        title: '新建学科',
        editable: true,
        placeholderText: '输入学科名称'
      });
      if (!res.confirm || !res.content || !res.content.trim()) return;

      wx.showLoading({ title: '创建中', mask: true });
      const r = await db.courses.add(app.getUserInfo()._id, res.content.trim());
      wx.hideLoading();

      if (r.result && r.result.success) {
        wx.showToast({ title: '已添加', icon: 'success' });
        await app.loadCourses();
        this.setData({ courses: app.globalData.courses });
      } else {
        wx.showModal({
          title: '创建失败',
          content: (r.result && r.result.message) || '请稍后重试',
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('新建学科失败', e);
    }
  },

  // ✕ 删除学科（非内置；级联清理云端全部内容与学生数据）
  async removeCourse(e) {
    if (!app.isAdmin()) return;
    const { id, name, builtin } = e.currentTarget.dataset;
    if (builtin) {
      wx.showModal({ title: '提示', content: '内置学科不可删除', showCancel: false });
      return;
    }
    try {
      const res = await wx.showModal({
        title: '删除学科',
        content: `确定删除「${name}」？\n其下全部章节、知识点、习题、考试题，以及学生的错题和收藏都会一并删除！`,
        confirmText: '删除',
        confirmColor: '#e54d42'
      });
      if (!res.confirm) return;

      wx.showLoading({ title: '删除中', mask: true });
      const r = await db.courses.remove(app.getUserInfo()._id, id);
      wx.hideLoading();

      if (r.result && r.result.success) {
        wx.showToast({ title: '已删除', icon: 'success' });
        await app.loadCourses();
        this.setData({ courses: app.globalData.courses });
      } else {
        wx.showModal({
          title: '删除失败',
          content: (r.result && r.result.message) || '请稍后重试',
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('删除学科失败', e);
    }
  },

  // ✎ 学科改名（非内置）
  async renameCourse(e) {
    if (!app.isAdmin()) return;
    const { id, name, builtin } = e.currentTarget.dataset;
    if (builtin) {
      wx.showModal({ title: '提示', content: '内置学科不可改名', showCancel: false });
      return;
    }
    try {
      const res = await wx.showModal({
        title: '学科改名',
        editable: true,
        content: name
      });
      if (!res.confirm || !res.content || !res.content.trim()) return;
      const newName = res.content.trim();
      if (newName === name) return;

      wx.showLoading({ title: '保存中', mask: true });
      const r = await db.courses.rename(app.getUserInfo()._id, id, newName);
      wx.hideLoading();

      if (r.result && r.result.success) {
        wx.showToast({ title: '已改名', icon: 'success' });
        await app.loadCourses();
        this.setData({ courses: app.globalData.courses });
      } else {
        wx.showModal({
          title: '改名失败',
          content: (r.result && r.result.message) || '请稍后重试',
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('学科改名失败', e);
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
