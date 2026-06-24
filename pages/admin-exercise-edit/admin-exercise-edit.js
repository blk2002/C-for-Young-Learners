// pages/admin-exercise-edit/admin-exercise-edit.js
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
    showQuestionModal: false,
    editingIndex: -1,
    editingQuestion: {
      type: 'choice',
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      answer: '',
      explanation: ''
    },
    loading: true,
    hasChanges: false,
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
      title: lessonTitle || '习题管理'
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

      const questions = result.result && result.result.data && result.result.data.questions
        ? result.result.data.questions
        : [];

      this.setData({
        questions: questions,
        loading: false
      });
    } catch (err) {
      console.error('加载题目失败', err);
      this.setData({
        questions: [],
        loading: false
      });
    }
  },

  // ========== 题目管理 ==========

  addChoiceQuestion() {
    this.setData({
      showQuestionModal: true,
      editingIndex: -1,
      editingQuestion: {
        type: 'choice',
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        answer: '',
        explanation: ''
      }
    });
  },

  addFillQuestion() {
    this.setData({
      showQuestionModal: true,
      editingIndex: -1,
      editingQuestion: {
        type: 'fill',
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        answer: '',
        explanation: ''
      }
    });
  },

  editQuestion(e) {
    const index = e.currentTarget.dataset.index;
    const q = this.data.questions[index];
    const editingQuestion = {
      type: q.type,
      question: q.question || '',
      options: q.options ? { ...q.options } : { A: '', B: '', C: '', D: '' },
      answer: q.answer || '',
      explanation: q.explanation || ''
    };
    this.setData({
      showQuestionModal: true,
      editingIndex: index,
      editingQuestion: editingQuestion
    });
  },

  deleteQuestion(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这道题目吗？',
      success: (res) => {
        if (res.confirm) {
          const questions = [...this.data.questions];
          questions.splice(index, 1);
          this.setData({ questions, hasChanges: true });
          this.autoSave();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  moveUp(e) {
    const index = e.currentTarget.dataset.index;
    if (index <= 0) return;
    const questions = [...this.data.questions];
    const temp = questions[index];
    questions[index] = questions[index - 1];
    questions[index - 1] = temp;
    this.setData({ questions, hasChanges: true });
    this.autoSave();
  },

  moveDown(e) {
    const index = e.currentTarget.dataset.index;
    if (index >= this.data.questions.length - 1) return;
    const questions = [...this.data.questions];
    const temp = questions[index];
    questions[index] = questions[index + 1];
    questions[index + 1] = temp;
    this.setData({ questions, hasChanges: true });
    this.autoSave();
  },

  selectQuestionType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'editingQuestion.type': type,
      'editingQuestion.answer': ''
    });
  },

  onEditQuestionInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`editingQuestion.${field}`]: e.detail.value
    });
  },

  onEditOptionInput(e) {
    const option = e.currentTarget.dataset.option;
    this.setData({
      [`editingQuestion.options.${option}`]: e.detail.value
    });
  },

  selectAnswer(e) {
    const answer = e.currentTarget.dataset.answer;
    this.setData({
      'editingQuestion.answer': answer
    });
  },

  onEditAnswerInput(e) {
    this.setData({
      'editingQuestion.answer': e.detail.value
    });
  },

  saveQuestion() {
    const q = this.data.editingQuestion;

    if (!q.question.trim()) {
      wx.showToast({ title: '请输入题干', icon: 'none' });
      return;
    }

    if (q.type === 'choice') {
      if (!q.options.A.trim() || !q.options.B.trim()) {
        wx.showToast({ title: '请填写至少 A、B 两个选项', icon: 'none' });
        return;
      }
      if (!q.answer) {
        wx.showToast({ title: '请选择正确答案', icon: 'none' });
        return;
      }
    } else {
      if (!q.answer.trim()) {
        wx.showToast({ title: '请输入正确答案', icon: 'none' });
        return;
      }
    }

    const questions = [...this.data.questions];
    const newQuestion = {
      type: q.type,
      question: q.question.trim(),
      answer: q.type === 'choice' ? q.answer : q.answer.trim(),
      explanation: q.explanation.trim() || undefined
    };

    if (q.type === 'choice') {
      const options = {};
      if (q.options.A.trim()) options.A = q.options.A.trim();
      if (q.options.B.trim()) options.B = q.options.B.trim();
      if (q.options.C.trim()) options.C = q.options.C.trim();
      if (q.options.D.trim()) options.D = q.options.D.trim();
      newQuestion.options = options;
    }

    if (this.data.editingIndex >= 0) {
      questions[this.data.editingIndex] = newQuestion;
    } else {
      questions.push(newQuestion);
    }

    this.setData({
      questions: questions,
      showQuestionModal: false,
      hasChanges: true
    });

    this.autoSave();
  },

  closeQuestionModal() {
    this.setData({ showQuestionModal: false });
  },

  preventBubble() {
    // 空函数，用于阻止事件冒泡
  },

  // 自动保存
  async autoSave() {
    if (this.data.isSaving) return;

    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const result = await db.chapterQuestions.saveQuestions(
        this.data.courseId,
        this.data.chapterId,
        this.data.lessonId,
        this.data.questions
      );

      wx.hideLoading();

      if (result.result && result.result.success) {
        this.setData({ hasChanges: false });
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        const errMsg = result.result && result.result.message ? result.result.message : '保存失败';
        wx.showToast({ title: errMsg, icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  }
});