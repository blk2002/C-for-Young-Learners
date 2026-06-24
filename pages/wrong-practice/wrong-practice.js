const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    source: 'chapter',
    courseId: '',
    chapterId: '',
    lessonId: '',
    lessonTitle: '',
    chapterTitle: '',
    examType: '',
    examName: '',
    level: '',
    wrongQuestions: [],
    currentIndex: 0,
    currentQuestion: null,
    currentWrongItem: null,
    userAnswers: [],
    submitted: false,
    isCorrect: [],
    correctCount: 0,
    progressPercent: 0,
    loading: true
  },

  onLoad(options) {
    const source = options.source || 'chapter';
    const courseId = options.courseId;
    const chapterId = options.chapterId || '';
    const lessonId = options.lessonId || '';
    const lessonTitle = options.lessonTitle ? decodeURIComponent(options.lessonTitle) : '';
    const chapterTitle = options.chapterTitle ? decodeURIComponent(options.chapterTitle) : '';
    const examType = options.examType || '';
    const examName = options.examName ? decodeURIComponent(options.examName) : '';
    const level = options.level ? decodeURIComponent(options.level) : '';

    this.setData({
      source,
      courseId,
      chapterId,
      lessonId,
      lessonTitle,
      chapterTitle,
      examType,
      examName,
      level
    });

    if (source === 'exam') {
      wx.setNavigationBarTitle({
        title: level ? `${examName} ${level} - 错题` : '考试错题练习'
      });
    } else {
      wx.setNavigationBarTitle({
        title: lessonTitle ? `${lessonTitle} - 错题` : '错题练习'
      });
    }

    this.loadWrongQuestions();
  },

  onShow() {
    if (this.data.source === 'exam') {
      if (this.data.courseId && this.data.examType && this.data.level) {
        this.loadWrongQuestions();
      }
    } else {
      if (this.data.lessonId) {
        this.loadWrongQuestions();
      }
    }
  },

  async loadWrongQuestions() {
    this.setData({ loading: true });

    try {
      const userInfo = app.getUserInfo();
      if (!userInfo || !userInfo._id) {
        this.setData({ loading: false });
        return;
      }

      let result;
      if (this.data.source === 'exam') {
        result = await db.wrongQuestions.getWrongQuestions(
          userInfo._id,
          this.data.courseId,
          null, null,
          this.data.examType,
          this.data.level
        );
      } else {
        result = await db.wrongQuestions.getWrongQuestions(
          userInfo._id,
          this.data.courseId,
          this.data.chapterId,
          this.data.lessonId
        );
      }

      const wrongQuestions = result.result && result.result.data
        ? result.result.data
        : [];

      const questions = wrongQuestions.map(item => item.question);
      const userAnswers = questions.map(() => null);
      const isCorrect = questions.map(() => false);

      this.setData({
        wrongQuestions: wrongQuestions,
        questions: questions,
        userAnswers: userAnswers,
        isCorrect: isCorrect,
        currentQuestion: questions.length > 0 ? questions[0] : null,
        currentWrongItem: wrongQuestions.length > 0 ? wrongQuestions[0] : null,
        progressPercent: questions.length > 0 ? (1 / questions.length) * 100 : 0,
        loading: false
      });
    } catch (err) {
      console.error('加载错题失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  selectOption(e) {
    if (this.data.submitted) return;

    const option = e.currentTarget.dataset.option;
    const userAnswers = [...this.data.userAnswers];
    userAnswers[this.data.currentIndex] = option;

    this.setData({ userAnswers });
  },

  onFillInput(e) {
    if (this.data.submitted) return;

    const qIndex = this.data.currentIndex;
    const userAnswers = [...this.data.userAnswers];
    userAnswers[qIndex] = e.detail.value;

    this.setData({ userAnswers });
  },

  prevQuestion() {
    if (this.data.currentIndex <= 0) return;
    const newIndex = this.data.currentIndex - 1;
    this.setData({
      currentIndex: newIndex,
      currentQuestion: this.data.questions[newIndex],
      currentWrongItem: this.data.wrongQuestions[newIndex],
      progressPercent: ((newIndex + 1) / this.data.wrongQuestions.length) * 100
    });
  },

  nextQuestion() {
    if (this.data.currentIndex >= this.data.wrongQuestions.length - 1) return;
    const newIndex = this.data.currentIndex + 1;
    this.setData({
      currentIndex: newIndex,
      currentQuestion: this.data.questions[newIndex],
      currentWrongItem: this.data.wrongQuestions[newIndex],
      progressPercent: ((newIndex + 1) / this.data.wrongQuestions.length) * 100
    });
  },

  submitAll() {
    const unanswered = this.data.userAnswers.filter(a => a === null || a === undefined || a === '').length;
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
      this.doSubmit();
    }
  },

  doSubmit() {
    const questions = this.data.questions;
    const userAnswers = this.data.userAnswers;
    const isCorrect = [];
    let correctCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userAns = userAnswers[i];
      let correct = false;

      if (userAns === null || userAns === undefined || userAns === '') {
        correct = false;
      } else if (q.type === 'choice') {
        correct = userAns.toUpperCase() === q.answer.toUpperCase();
      } else {
        correct = userAns.trim() === q.answer.trim();
      }

      isCorrect.push(correct);
      if (correct) correctCount++;
    }

    this.setData({
      submitted: true,
      isCorrect: isCorrect,
      correctCount: correctCount
    });
  },

  async markMastered() {
    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) return;

    const currentWrongItem = this.data.currentWrongItem;
    if (!currentWrongItem || !currentWrongItem._id) return;

    wx.showModal({
      title: '确认移除',
      content: '确定将这道题移出错题本吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.wrongQuestions.markMastered(currentWrongItem._id);

            const wrongQuestions = [...this.data.wrongQuestions];
            wrongQuestions[this.data.currentIndex] = {
              ...wrongQuestions[this.data.currentIndex],
              mastered: true
            };

            this.setData({
              wrongQuestions: wrongQuestions,
              currentWrongItem: wrongQuestions[this.data.currentIndex]
            });

            wx.showToast({ title: '已移出错题本', icon: 'success' });
          } catch (err) {
            console.error('标记掌握失败', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  async markAllMastered() {
    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) return;

    wx.showModal({
      title: '确认全部移除',
      content: '确定将所有错题移出错题本吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            if (this.data.source === 'exam') {
              await db.wrongQuestions.markExamMastered(
                userInfo._id,
                this.data.courseId,
                this.data.examType,
                this.data.level
              );
            } else {
              await db.wrongQuestions.markLessonMastered(
                userInfo._id,
                this.data.courseId,
                this.data.chapterId,
                this.data.lessonId
              );
            }

            this.loadWrongQuestions();
            wx.showToast({ title: '已全部移除', icon: 'success' });
          } catch (err) {
            console.error('全部标记掌握失败', err);
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  }
});
