// pages/admin/admin.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    activeTab: 'users', // users / chapters / exercises
    pendingUsers: [],
    courses: [],
    chaptersMap: {},  // 按课程分组的章节
    selectedCourse: 'python',
    currentCourseName: 'Python',
    exerciseCourse: 'python',
    exerciseCourseName: 'Python',
    loading: true
  },

  onLoad() {
    // 检查是否是管理员
    if (!app.isAdmin()) {
      wx.showModal({
        title: '权限不足',
        content: '只有老师可以访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    this.setData({
      courses: app.globalData.courses,
      selectedCourse: app.globalData.courses[0].id,
      currentCourseName: app.globalData.courses[0].name,
      exerciseCourse: app.globalData.courses[0].id,
      exerciseCourseName: app.globalData.courses[0].name
    });

    this.loadData();
  },

  onShow() {
    if (app.isAdmin()) {
      this.loadData();
    }
  },

  // 加载所有数据
  async loadData() {
    this.setData({ loading: true });
    await Promise.all([
      this.loadPendingUsers(),
      this.loadChapters()
    ]);
    this.setData({ loading: false });
  },

  // 加载待审核用户
  async loadPendingUsers() {
    try {
      const result = await db.users.getPendingUsers();
      if (result.result && result.result.success) {
        this.setData({ pendingUsers: result.result.data });
      }
    } catch (err) {
      console.error('获取用户列表失败', err);
    }
  },

  // 加载章节
  async loadChapters() {
    try {
      const courses = app.globalData.courses;
      const chaptersMap = {};

      for (let course of courses) {
        const result = await db.courses.getChapters(course.id);
        chaptersMap[course.id] = result.data;
      }

      this.setData({ chaptersMap });
    } catch (err) {
      console.error('获取章节失败', err);
    }
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 切换课程
  switchCourse(e) {
    const courseId = e.currentTarget.dataset.id;
    const courseName = e.currentTarget.dataset.name;
    this.setData({
      selectedCourse: courseId,
      currentCourseName: courseName
    });
  },

  // 审核用户
  async reviewUser(e) {
    const userId = e.currentTarget.dataset.id;
    const approved = e.currentTarget.dataset.approved === 'true';
    const actionText = approved ? '通过' : '拒绝';

    wx.showModal({
      title: '确认',
      content: `确定${actionText}该学生吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            const result = await db.users.reviewUser(userId, approved);
            wx.hideLoading();

            if (result.result && result.result.success) {
              wx.showToast({ title: '操作成功', icon: 'success' });
              this.loadPendingUsers();
            } else {
              wx.showToast({ title: '操作失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            console.error('审核失败', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 编辑章节
  editChapter(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin-edit/admin-edit?type=chapter&id=${id}&courseId=${this.data.selectedCourse}`
    });
  },

  // 新增章节
  addChapter() {
    wx.navigateTo({
      url: `/pages/admin-edit/admin-edit?type=chapter&courseId=${this.data.selectedCourse}`
    });
  },

  // 删除章节
  async deleteChapter(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除此章节吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            await db.courses.deleteChapter(id);
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadChapters();
          } catch (err) {
            wx.hideLoading();
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 进入章节的知识点管理
  goToLessons(e) {
    const chapterId = e.currentTarget.dataset.id;
    const chapterTitle = e.currentTarget.dataset.title;
    wx.navigateTo({
      url: `/pages/admin-edit/admin-edit?type=lessonlist&chapterId=${chapterId}&chapterTitle=${encodeURIComponent(chapterTitle)}&courseId=${this.data.selectedCourse}`
    });
  },

  // 习题管理：切换课程
  switchExerciseCourse(e) {
    const courseId = e.currentTarget.dataset.id;
    const courseName = e.currentTarget.dataset.name;
    this.setData({
      exerciseCourse: courseId,
      exerciseCourseName: courseName
    });
  },

  // 习题管理：进入章节知识点习题
  goToChapterExercises() {
    wx.navigateTo({
      url: `/pages/admin-exercises/admin-exercises?courseId=${this.data.exerciseCourse}&courseName=${encodeURIComponent(this.data.exerciseCourseName)}`
    });
  },

  goToExamExercises() {
    wx.navigateTo({
      url: `/pages/admin-exam-type/admin-exam-type?courseId=${this.data.exerciseCourse}&courseName=${encodeURIComponent(this.data.exerciseCourseName)}`
    });
  }
});
