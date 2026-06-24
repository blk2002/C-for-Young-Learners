const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    chapterId: '',
    lessonId: '',
    lessonTitle: '',
    chapterTitle: '',
    questions: [],
    currentIndex: 0,
    currentQuestion: null,
    userAnswers: [],
    submitted: false,
    isCorrect: [],
    correctCount: 0,
    progressPercent: 0,
    loading: true,
    isSaving: false
  },

  onLoad(options) {
    const courseId = options.courseId;
    const chapterId = options.chapterId;
    const lessonId = options.lessonId;
    const lessonTitle = options.lessonTitle ? decodeURIComponent(options.lessonTitle) : '';
    const chapterTitle = options.chapterTitle ? decodeURIComponent(options.chapterTitle) : '';

    this.setData({
      courseId: courseId,
      chapterId: chapterId,
      lessonId: lessonId,
      lessonTitle: lessonTitle,
      chapterTitle: chapterTitle
    });

    wx.setNavigationBarTitle({
      title: lessonTitle || '习题练习'
    });

    this.loadQuestions();
  },

  async loadQuestions() {
    this.setData({ loading: true });

    try {
      const result = await db.chapterQuestions.getQuestions(
        this.data.courseId,
        this.data.chapterId,
        this.data.lessonId
      );

      const questions = result.result
        && result.result.data
        && result.result.data.questions
        ? result.result.data.questions
        : [];

      const userAnswers = questions.map(() => null);
      const isCorrect = questions.map(() => false);

      this.setData({
        questions: questions,
        userAnswers: userAnswers,
        isCorrect: isCorrect,
        currentQuestion: questions.length > 0 ? questions[0] : null,
        progressPercent: questions.length > 0 ? (1 / questions.length) * 100 : 0,
        loading: false
      });
    } catch (err) {
      console.error('加载题目失败', err);
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
      progressPercent: ((newIndex + 1) / this.data.questions.length) * 100
    });
  },

  nextQuestion() {
    if (this.data.currentIndex >= this.data.questions.length - 1) return;
    const newIndex = this.data.currentIndex + 1;
    this.setData({
      currentIndex: newIndex,
      currentQuestion: this.data.questions[newIndex],
      progressPercent: ((newIndex + 1) / this.data.questions.length) * 100
    });
  },

  async submitAll() {
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

  async doSubmit() {
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

    this.saveWrongQuestions();
    this.saveProgress(questions.length, correctCount);
  },

  async saveProgress(totalQuestions, correctCount) {
    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) return;

    try {
      await db.wrongQuestions.saveExerciseProgress(
        userInfo._id,
        this.data.courseId,
        this.data.chapterId,
        this.data.lessonId,
        totalQuestions,
        correctCount
      );
    } catch (err) {
      console.error('保存练习进度失败', err);
    }
  },

  async saveWrongQuestions() {
    const userInfo = app.getUserInfo();
    if (!userInfo || !userInfo._id) return;

    const wrongQuestions = [];
    const questions = this.data.questions;
    const userAnswers = this.data.userAnswers;
    const isCorrect = this.data.isCorrect;

    for (let i = 0; i < questions.length; i++) {
      if (!isCorrect[i]) {
        wrongQuestions.push(questions[i]);
      }
    }

    if (wrongQuestions.length === 0) return;

    try {
      await db.wrongQuestions.addWrongQuestions({
        userId: userInfo._id,
        courseId: this.data.courseId,
        chapterId: this.data.chapterId,
        lessonId: this.data.lessonId,
        questions: wrongQuestions
      });
    } catch (err) {
      console.error('保存错题失败', err);
    }
  }
});
