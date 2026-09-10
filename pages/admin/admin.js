// pages/admin/admin.js
// 管理后台：只负责学生账号管理（建号/续期/重置密码/删除）。
// 课程内容（章节/知识点/习题）统一在内容工作台（content-workbench）维护。
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    studentList: [],       // 全部学生
    displayStudents: [],   // 筛选后显示的学生
    studentFilter: 'all',  // all / soon / expired
    filterCount: { all: 0, soon: 0, expired: 0 },
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

    this.loadData();
  },

  onShow() {
    if (app.isAdmin()) {
      this.loadData();
    }
  },

  // 加载数据
  async loadData() {
    this.setData({ loading: true });
    await this.loadStudents();
    this.setData({ loading: false });
  },

  // 加载学生列表
  async loadStudents() {
    try {
      const operatorId = this.getOperatorId();
      if (!operatorId) return;

      const result = await db.users.listUsers(operatorId);
      if (result.result && result.result.success) {
        const list = (result.result.data || []).map(item => ({
          ...item,
          validityText: this.formatValidity(item)
        }));

        const filterCount = {
          all: list.length,
          soon: list.filter(s => s.expireState === 'soon').length,
          expired: list.filter(s => s.expireState === 'expired').length
        };

        this.setData({ studentList: list, filterCount });
        this.applyStudentFilter();
      } else {
        wx.showToast({
          title: (result.result && result.result.message) || '加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取学生列表失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 当前管理员自己的 userId（云函数用它校验权限）
  getOperatorId() {
    const userInfo = app.getUserInfo();
    return userInfo ? userInfo._id : '';
  },

  // 把 validUntil 格式化成人话
  formatValidity(student) {
    if (student.expireState === 'permanent') {
      return '永久有效';
    }
    if (!student.validUntil) {
      return '永久有效';
    }
    const date = new Date(student.validUntil);
    if (isNaN(date.getTime())) {
      return '永久有效';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateText = `${y}-${m}-${d}`;

    if (student.remainDays < 0) {
      return `有效期至 ${dateText}（已过期 ${Math.abs(student.remainDays)} 天）`;
    }
    return `有效期至 ${dateText}（剩 ${student.remainDays} 天）`;
  },

  // 切换学生筛选
  switchStudentFilter(e) {
    this.setData({ studentFilter: e.currentTarget.dataset.filter });
    this.applyStudentFilter();
  },

  applyStudentFilter() {
    const { studentList, studentFilter } = this.data;
    let list = studentList;
    if (studentFilter === 'soon') {
      list = studentList.filter(s => s.expireState === 'soon');
    } else if (studentFilter === 'expired') {
      list = studentList.filter(s => s.expireState === 'expired');
    }
    this.setData({ displayStudents: list });
  },

  // 新建学生账号
  goToCreateStudent() {
    wx.navigateTo({ url: '/pages/admin-student-edit/admin-student-edit' });
  },

  // 重置学生密码
  async resetPassword(e) {
    const { id, name } = e.currentTarget.dataset;

    wx.showModal({
      title: '重置密码',
      content: `确定将「${name}」的密码重置为 123456 吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '处理中...', mask: true });
          const result = await db.users.resetPassword(this.getOperatorId(), id);
          wx.hideLoading();

          if (result.result && result.result.success) {
            wx.showModal({
              title: '重置成功',
              content: `「${name}」的密码已重置为：123456\n请告知学生尽快修改。`,
              showCancel: false
            });
          } else {
            wx.showToast({
              title: (result.result && result.result.message) || '重置失败',
              icon: 'none'
            });
          }
        } catch (err) {
          wx.hideLoading();
          console.error('重置密码失败', err);
          wx.showToast({ title: '重置失败', icon: 'none' });
        }
      }
    });
  },

  // 给学生续期
  renewStudent(e) {
    const { id, name } = e.currentTarget.dataset;
    const durations = [
      { label: '1个月', days: 30 },
      { label: '3个月', days: 90 },
      { label: '半年', days: 180 },
      { label: '1年', days: 365 }
    ];

    wx.showActionSheet({
      itemList: durations.map(d => `${d.label}（${d.days}天）`),
      success: async (res) => {
        const picked = durations[res.tapIndex];
        if (!picked) return;

        try {
          wx.showLoading({ title: '处理中...', mask: true });
          const result = await db.users.updateValidity(
            this.getOperatorId(),
            id,
            picked.days,
            null
          );
          wx.hideLoading();

          if (result.result && result.result.success) {
            wx.showToast({ title: '续期成功', icon: 'success' });
            this.loadStudents();
          } else {
            wx.showToast({
              title: (result.result && result.result.message) || '续期失败',
              icon: 'none'
            });
          }
        } catch (err) {
          wx.hideLoading();
          console.error('续期失败', err);
          wx.showToast({ title: '续期失败', icon: 'none' });
        }
      }
    });
  },

  // 删除学生（连同全部学习数据）
  async deleteStudent(e) {
    const { id, name } = e.currentTarget.dataset;

    wx.showModal({
      title: '删除学生账号',
      content: `确定删除「${name}」吗？\n该学生的学习进度、收藏、错题将一并删除，且无法恢复。`,
      confirmColor: '#FF5C72',
      success: async (res) => {
        if (!res.confirm) return;

        // 二次确认，删库这种事不嫌麻烦
        wx.showModal({
          title: '再次确认',
          content: '此操作不可撤销，确定继续吗？',
          confirmColor: '#FF5C72',
          success: async (res2) => {
            if (!res2.confirm) return;

            try {
              wx.showLoading({ title: '删除中...', mask: true });
              const result = await db.users.deleteUser(this.getOperatorId(), id);
              wx.hideLoading();

              if (result.result && result.result.success) {
                const cleaned = (result.result.data && result.result.data.cleaned) || {};
                const total = Object.keys(cleaned)
                  .reduce((sum, k) => sum + (cleaned[k] > 0 ? cleaned[k] : 0), 0);
                wx.showToast({
                  title: total > 0 ? `已删除（含${total}条记录）` : '已删除',
                  icon: 'success'
                });
                this.loadStudents();
              } else {
                wx.showToast({
                  title: (result.result && result.result.message) || '删除失败',
                  icon: 'none'
                });
              }
            } catch (err) {
              wx.hideLoading();
              console.error('删除失败', err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          }
        });
      }
    });
  }
});
