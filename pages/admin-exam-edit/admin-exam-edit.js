const db = require('../../utils/db.js');

Page({
  data: {
    courseId: '',
    courseName: '',
    examType: '',
    examName: '',
    level: '',
    questions: [],
    showChoiceModal: false,
    showFillModal: false,
    currentEditIndex: -1,
    choiceForm: {
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      answer: 'A',
      explanation: ''
    },
    fillForm: {
      question: '',
      answer: '',
      explanation: ''
    },
    isSaving: false,
    hasChanges: false
  },

  onLoad(options) {
    const courseId = options.courseId || 'cpp';
    const courseName = options.courseName ? decodeURIComponent(options.courseName) : 'C++';
    const examType = options.examType || 'CIE';
    const examName = options.examName ? decodeURIComponent(options.examName) : 'CIE';
    const level = options.level ? decodeURIComponent(options.level) : '一级';
    this.setData({ courseId, courseName, examType, examName, level });
    wx.setNavigationBarTitle({ title: level + ' 习题管理' });
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

      this.setData({ questions, hasChanges: false });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载习题失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  addChoice() {
    this.setData({
      showChoiceModal: true,
      currentEditIndex: -1,
      choiceForm: {
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        answer: 'A',
        explanation: ''
      }
    });
  },

  addFill() {
    this.setData({
      showFillModal: true,
      currentEditIndex: -1,
      fillForm: {
        question: '',
        answer: '',
        explanation: ''
      }
    });
  },

  editChoice(e) {
    const index = e.currentTarget.dataset.index;
    const q = this.data.questions[index];
    this.setData({
      showChoiceModal: true,
      currentEditIndex: index,
      choiceForm: {
        question: q.question,
        optionA: q.options.A,
        optionB: q.options.B,
        optionC: q.options.C,
        optionD: q.options.D,
        answer: q.answer,
        explanation: q.explanation || ''
      }
    });
  },

  editFill(e) {
    const index = e.currentTarget.dataset.index;
    const q = this.data.questions[index];
    this.setData({
      showFillModal: true,
      currentEditIndex: index,
      fillForm: {
        question: q.question,
        answer: q.answer,
        explanation: q.explanation || ''
      }
    });
  },

  deleteQuestion(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '提示',
      content: '确定删除这道题吗？',
      success: (res) => {
        if (res.confirm) {
          const questions = [...this.data.questions];
          questions.splice(index, 1);
          this.setData({ questions, hasChanges: true });
          this.autoSave();
        }
      }
    });
  },

  onChoiceInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`choiceForm.${field}`]: e.detail.value
    });
  },

  onFillInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`fillForm.${field}`]: e.detail.value
    });
  },

  selectAnswer(e) {
    const answer = e.currentTarget.dataset.value;
    this.setData({ 'choiceForm.answer': answer });
  },

  saveChoice() {
    const { choiceForm, currentEditIndex, questions } = this.data;

    if (!choiceForm.question.trim()) {
      wx.showToast({ title: '请输入题目内容', icon: 'none' });
      return;
    }
    if (!choiceForm.optionA.trim() || !choiceForm.optionB.trim() ||
        !choiceForm.optionC.trim() || !choiceForm.optionD.trim()) {
      wx.showToast({ title: '请填写所有选项', icon: 'none' });
      return;
    }

    const newQuestion = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'choice',
      question: choiceForm.question,
      options: {
        A: choiceForm.optionA,
        B: choiceForm.optionB,
        C: choiceForm.optionC,
        D: choiceForm.optionD
      },
      answer: choiceForm.answer,
      explanation: choiceForm.explanation
    };

    const newQuestions = [...questions];
    if (currentEditIndex >= 0) {
      newQuestions[currentEditIndex] = {
        ...newQuestions[currentEditIndex],
        ...newQuestion,
        id: newQuestions[currentEditIndex].id
      };
    } else {
      newQuestions.push(newQuestion);
    }

    this.setData({
      questions: newQuestions,
      showChoiceModal: false,
      hasChanges: true
    });

    this.autoSave();
  },

  saveFill() {
    const { fillForm, currentEditIndex, questions } = this.data;

    if (!fillForm.question.trim()) {
      wx.showToast({ title: '请输入题目内容', icon: 'none' });
      return;
    }
    if (!fillForm.answer.trim()) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    const newQuestion = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'fill',
      question: fillForm.question,
      answer: fillForm.answer,
      explanation: fillForm.explanation
    };

    const newQuestions = [...questions];
    if (currentEditIndex >= 0) {
      newQuestions[currentEditIndex] = {
        ...newQuestions[currentEditIndex],
        ...newQuestion,
        id: newQuestions[currentEditIndex].id
      };
    } else {
      newQuestions.push(newQuestion);
    }

    this.setData({
      questions: newQuestions,
      showFillModal: false,
      hasChanges: true
    });

    this.autoSave();
  },

  cancelChoice() {
    this.setData({ showChoiceModal: false });
  },

  cancelFill() {
    this.setData({ showFillModal: false });
  },

  async autoSave() {
    if (this.data.isSaving) return;
    this.setData({ isSaving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const result = await db.examQuestions.saveQuestions(
        this.data.courseId,
        this.data.examType,
        this.data.level,
        this.data.questions
      );

      wx.hideLoading();

      if (result.result && result.result.success) {
        this.setData({ hasChanges: false });
      } else {
        wx.showToast({
          title: result.result && result.result.message ? result.result.message : '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  moveUp(e) {
    const index = e.currentTarget.dataset.index;
    if (index === 0) return;
    const questions = [...this.data.questions];
    const temp = questions[index];
    questions[index] = questions[index - 1];
    questions[index - 1] = temp;
    this.setData({ questions, hasChanges: true });
    this.autoSave();
  },

  moveDown(e) {
    const index = e.currentTarget.dataset.index;
    const questions = this.data.questions;
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + 1];
    newQuestions[index + 1] = temp;
    this.setData({ questions: newQuestions, hasChanges: true });
    this.autoSave();
  }
});
