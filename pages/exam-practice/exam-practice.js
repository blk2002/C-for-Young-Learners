const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    examType: '',
    examName: '',
    level: '',
    questions: [],
    currentIndex: 0,
    userAnswers: {},
    submitted: false,
    loading: true,
    wrongCount: 0,
    answerResults: [],
    correctRate: 0
  },

  onLoad(options) {
    const courseId = options.courseId || 'cpp';
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : 'C++';
    const examType = options.examType || 'CIE';
    const examName = options.examName ? decodeURIComponent(options.examName) : 'CIE';
    const level = options.level ? decodeURIComponent(options.level) : '一级';
    this.setData({ courseId, courseName, examType, examName, level });
    wx.setNavigationBarTitle({ title: level });
    this.loadQuestions();
  },

  async loadQuestions() {
    wx.showLoading({ title: '加载中...' });
    try {
      const result = await db.examQuestions.getQuestions(
        this.data.courseId,
        this.data.examType,
        this.data.level
      );

      const questions = result.result && result.result.data && result.result.data.questions
        ? result.result.data.questions
        : [];

      const userAnswers = {};
      questions.forEach((q, index) => {
        userAnswers[index] = q.type === 'choice' ? '' : '';
      });

      this.setData({
        questions,
        userAnswers,
        loading: false
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载题目失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  selectOption(e) {
    if (this.data.submitted) return;
    const index = e.currentTarget.dataset.index;
    const option = e.currentTarget.dataset.option;
    const userAnswers = { ...this.data.userAnswers };
    userAnswers[index] = option;
    this.setData({ userAnswers });
  },

  onFillInput(e) {
    if (this.data.submitted) return;
    const index = e.currentTarget.dataset.index;
    const userAnswers = { ...this.data.userAnswers };
    userAnswers[index] = e.detail.value;
    this.setData({ userAnswers });
  },

  prevQuestion() {
    if (this.data.currentIndex > 0) {
      this.setData({ currentIndex: this.data.currentIndex - 1 });
    }
  },

  nextQuestion() {
    if (this.data.currentIndex < this.data.questions.length - 1) {
      this.setData({ currentIndex: this.data.currentIndex + 1 });
    }
  },

  submitAll() {
    const { questions, userAnswers } = this.data;
    let unanswered = 0;

    questions.forEach((q, index) => {
      if (!userAnswers[index] || userAnswers[index].trim() === '') {
        unanswered++;
      }
    });

    if (unanswered > 0) {
      wx.showModal({
        title: '提示',
        content: `还有 ${unanswered} 道题未作答，确定提交吗？`,
        success: (res) => {
          if (res.confirm) {
            this.doSubmit();
          }
        }
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '确定提交所有答案吗？',
        success: (res) => {
          if (res.confirm) {
            this.doSubmit();
          }
        }
      });
    }
  },

  async doSubmit() {
    const { questions, userAnswers, courseId, examType, level } = this.data;
    const userInfo = app.getUserInfo();
    const userId = userInfo ? userInfo._id : null;

    let wrongCount = 0;
    const wrongQuestions = [];
    const answerResults = [];

    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index] || '';
      const correctAnswer = q.answer || '';
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

      answerResults.push(isCorrect);

      if (!isCorrect) {
        wrongCount++;
        wrongQuestions.push({
          type: q.type,
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation
        });
      }
    });

    const correctRate = questions.length > 0
      ? Math.round((questions.length - wrongCount) / questions.length * 100)
      : 0;

    this.setData({ submitted: true, wrongCount, answerResults, correctRate });

    if (wrongQuestions.length > 0 && userId) {
      try {
        await db.wrongQuestions.addWrongQuestions({
          userId,
          courseId,
          examType,
          level,
          questions: wrongQuestions
        });
      } catch (err) {
        console.error('保存错题失败', err);
      }
    }
  },

  getCurrentQuestion() {
    const { questions, currentIndex } = this.data;
    return questions[currentIndex] || null;
  },

  isCorrect(index) {
    const { questions, userAnswers } = this.data;
    const q = questions[index];
    const userAnswer = userAnswers[index] || '';
    return userAnswer.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
  }
});
