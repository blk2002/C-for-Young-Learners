// pages/profile/profile.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    displayName: '',
    initial: '',
    courseCount: 0,   // 学习中的课程数
    lastChapter: '',  // 上次学到的章节标题
    wrongCount: 0,    // 未掌握的错题数
    continueInfo: null // { courseId, courseName, chapterId }
  },

  onShow() {
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    // 账号过有效期则强制登出（enforceValidity 内部会跳转，这里直接 return）
    if (app.enforceValidity()) {
      return;
    }

    const userInfo = app.getUserInfo();
    const displayName = userInfo.name || userInfo.nickname || userInfo.username || '同学';
    const subtitle = (userInfo.signature && userInfo.signature.trim())
      ? userInfo.signature.trim()
      : `账号：${userInfo.username || ''}`;

    this.setData({
      userInfo,
      isAdmin: app.isAdmin(),
      displayName,
      subtitle,
      initial: displayName.charAt(0).toUpperCase()
    });

    this.loadStats();
  },

  // 加载学习数据概览
  async loadStats() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo._id) return;

    try {
      const userId = userInfo._id;
      const courses = app.globalData.courses || [];

      // 1. 学习进度：课程数 + 最近学到哪
      const progressRes = await db.progress.getAllProgress(userId);
      const progressList = progressRes.data || [];

      // 按 updatedAt 倒序，取最近学习的那条
      const sorted = progressList.slice().sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      const latest = sorted[0];

      let lastChapter = '';
      let continueInfo = null;

      if (latest) {
        const course = courses.find(c => c.id === latest.courseId);
        continueInfo = {
          courseId: latest.courseId,
          courseName: course ? course.name : '',
          chapterId: latest.chapterId
        };

        // 查章节标题（查不到就退回显示"已开始"）
        if (latest.chapterId) {
          try {
            const chapterRes = await db.courses.getChapter(latest.chapterId);
            if (chapterRes && chapterRes.data && chapterRes.data.title) {
              lastChapter = chapterRes.data.title;
            }
          } catch (err) {
            console.warn('获取章节信息失败', err);
          }
        }
        if (!lastChapter) lastChapter = '已开始';
      }

      // 2. 错题数：逐门课程统计未掌握的错题
      let wrongCount = 0;
      for (const course of courses) {
        try {
          const res = await db.wrongQuestions.getWrongChapters(userId, course.id);
          const chapters = (res.result && res.result.data) || [];
          for (const item of chapters) {
            wrongCount += item.wrongCount || 0;
          }
        } catch (err) {
          console.warn('获取错题数失败', course.id, err);
        }
      }

      this.setData({
        courseCount: progressList.length,
        lastChapter,
        wrongCount,
        continueInfo
      });
    } catch (err) {
      console.error('加载学习数据失败', err);
    }
  },

  // 点击「上次学到」继续学习
  continueLearning() {
    const info = this.data.continueInfo;
    if (!info || !info.courseId) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    wx.navigateTo({
      url: `/pages/chapters/chapters?courseId=${info.courseId}&courseName=${info.courseName}`
    });
  },

  // 进入我的收藏
  goToFavorites() {
    wx.navigateTo({ url: '/pages/my-favorites/my-favorites' });
  },

  // 进入学习进度
  goToProgress() {
    wx.navigateTo({ url: '/pages/study-progress/study-progress' });
  },

  // 进入管理员页面
  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  // 进入编辑资料页
  goToEditProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },

  // 进入修改密码页
  goToChangePassword() {
    wx.navigateTo({ url: '/pages/change-password/change-password' });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});
