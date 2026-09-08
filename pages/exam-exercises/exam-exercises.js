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

  loadExamTypes() {
    const { courseId } = this.data;
    let examTypes = [];

    if (courseId === 'python') {
      examTypes = [
        {
          type: 'CIE',
          name: 'CIE 等级考试',
          desc: '中国电子学会 Python 编程等级考试',
          icon: "i-book",
          color: '#5B67F1'
        },
        {
          type: 'GESP',
          name: 'GESP 等级考试',
          desc: 'CCF 编程能力等级认证',
          icon: "i-target",
          color: '#22C08A'
        }
      ];
    } else {
      examTypes = [
        {
          type: 'CIE',
          name: 'CIE 等级考试',
          desc: '中国电子学会 C++ 编程等级考试',
          icon: "i-book",
          color: '#5B67F1'
        },
        {
          type: 'GESP',
          name: 'GESP 等级考试',
          desc: 'CCF 编程能力等级认证',
          icon: "i-target",
          color: '#22C08A'
        },
        {
          type: 'CSP-JS',
          name: 'CSP-J/S 竞赛',
          desc: '信息学奥赛入门级/提高级',
          icon: "i-trophy",
          color: '#8E5CF6'
        }
      ];
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
