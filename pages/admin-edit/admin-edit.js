// pages/admin-edit/admin-edit.js
const app = getApp();
const db = require('../../utils/db.js');

Page({
  data: {
    type: 'chapter', // chapter / lesson / lessonlist
    courseId: '',
    chapterId: '',
    chapterTitle: '',
    lessonId: '',
    // 章节数据
    chapterData: {
      title: '',
      order: 1
    },
    // 知识点数据
    lessonData: {
      title: '',
      content: '',
      codeExample: '',
      order: 1
    },
    // 练习题
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
    // 知识点列表（用于lessonlist类型）
    lessons: [],
    loading: true,
    submitting: false
  },

  onLoad(options) {
    const type = options.type;
    const courseId = options.courseId;
    const chapterId = options.id || options.chapterId || '';
    const chapterTitle = options.chapterTitle ? decodeURIComponent(options.chapterTitle) : '';
    const lessonId = options.lessonId || '';

    this.setData({
      type,
      courseId,
      chapterId,
      chapterTitle,
      lessonId
    });

    // 设置导航标题
    let title = '';
    if (type === 'chapter') {
      title = chapterId ? '编辑章节' : '新增章节';
    } else if (type === 'lessonlist') {
      title = chapterTitle ? chapterTitle + '-知识点' : '知识点管理';
    } else if (type === 'lesson') {
      title = lessonId ? '编辑知识点' : '新增知识点';
    }
    wx.setNavigationBarTitle({ title });

    if (type === 'chapter' && chapterId) {
      this.loadChapter(chapterId);
    } else if (type === 'lesson' && lessonId) {
      this.loadLesson(lessonId);
    } else if (type === 'lessonlist') {
      this.loadLessons(chapterId);
    } else {
      this.setData({ loading: false });
    }
  },

  onShow() {
    // 知识点列表页：每次显示都刷新数据（新增/编辑返回后）
    if (this.data.type === 'lessonlist' && this.data.chapterId) {
      this.loadLessons(this.data.chapterId);
    }
  },

  // 加载章节详情
  async loadChapter(id) {
    try {
      const result = await db.courses.getChapter(id);
      this.setData({
        chapterData: {
          title: result.data.title || '',
          order: result.data.order || 1
        },
        loading: false
      });
    } catch (err) {
      console.error('加载章节失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载知识点列表
  async loadLessons(chapterId) {
    try {
      const result = await db.courses.getLessons(chapterId);
      this.setData({
        lessons: result.data,
        loading: false
      });
    } catch (err) {
      console.error('加载知识点失败', err);
      this.setData({ loading: false });
    }
  },

  // 加载知识点详情
  async loadLesson(id) {
    try {
      const result = await db.courses.getLesson(id);
      const lesson = result.data;

      let questions = [];
      if (lesson.questions) {
        try {
          if (typeof lesson.questions === 'string') {
            questions = JSON.parse(lesson.questions);
          } else {
            questions = lesson.questions;
          }
        } catch (e) {
          questions = [];
        }
      }

      this.setData({
        lessonData: {
          title: lesson.title || '',
          content: lesson.content || '',
          codeExample: lesson.codeExample || '',
          order: lesson.order || 1
        },
        questions: questions,
        loading: false
      });
    } catch (err) {
      console.error('加载知识点失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 输入处理
  onTitleInput(e) {
    if (this.data.type === 'chapter') {
      this.setData({ 'chapterData.title': e.detail.value });
    } else {
      this.setData({ 'lessonData.title': e.detail.value });
    }
  },

  onOrderInput(e) {
    const rawVal = e.detail.value;
    const val = rawVal === '' ? '' : (parseInt(rawVal) || 1);
    if (this.data.type === 'chapter') {
      this.setData({ 'chapterData.order': val });
    } else {
      this.setData({ 'lessonData.order': val });
    }
  },

  onContentInput(e) {
    this.setData({ 'lessonData.content': e.detail.value });
  },

  onCodeInput(e) {
    this.setData({ 'lessonData.codeExample': e.detail.value });
  },

  // ========== 练习题管理 ==========

  // 新增选择题
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

  // 新增填空题
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

  // 编辑题目
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

  // 删除题目
  deleteQuestion(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这道题目吗？',
      success: (res) => {
        if (res.confirm) {
          const questions = [...this.data.questions];
          questions.splice(index, 1);
          this.setData({ questions });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 上移
  moveUp(e) {
    const index = e.currentTarget.dataset.index;
    if (index <= 0) return;
    const questions = [...this.data.questions];
    const temp = questions[index];
    questions[index] = questions[index - 1];
    questions[index - 1] = temp;
    this.setData({ questions });
  },

  // 下移
  moveDown(e) {
    const index = e.currentTarget.dataset.index;
    if (index >= this.data.questions.length - 1) return;
    const questions = [...this.data.questions];
    const temp = questions[index];
    questions[index] = questions[index + 1];
    questions[index + 1] = temp;
    this.setData({ questions });
  },

  // 切换题目类型
  selectQuestionType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'editingQuestion.type': type,
      'editingQuestion.answer': ''
    });
  },

  // 编辑题干/解析
  onEditQuestionInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`editingQuestion.${field}`]: e.detail.value
    });
  },

  // 编辑选项
  onEditOptionInput(e) {
    const option = e.currentTarget.dataset.option;
    this.setData({
      [`editingQuestion.options.${option}`]: e.detail.value
    });
  },

  // 选择正确答案（选择题）
  selectAnswer(e) {
    const answer = e.currentTarget.dataset.answer;
    this.setData({
      'editingQuestion.answer': answer
    });
  },

  // 编辑正确答案（填空题）
  onEditAnswerInput(e) {
    this.setData({
      'editingQuestion.answer': e.detail.value
    });
  },

  // 保存题目
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
      showQuestionModal: false
    });

    wx.showToast({ title: '已保存', icon: 'success' });
  },

  // 关闭弹窗
  closeQuestionModal() {
    this.setData({ showQuestionModal: false });
  },

  // 阻止冒泡（空函数，用于 catchtap）
  preventBubble() {
    // 空函数，仅用于阻止事件冒泡
  },

  // 保存章节
  async saveChapter() {
    const { title, order } = this.data.chapterData;

    if (!title.trim()) {
      wx.showToast({ title: '请输入章节标题', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      if (this.data.chapterId) {
        // 更新
        await db.courses.updateChapter(this.data.chapterId, {
          title: title.trim(),
          order: parseInt(order) || 1
        });
      } else {
        // 新增
        await db.courses.addChapter({
          courseId: this.data.courseId,
          title: title.trim(),
          order: parseInt(order) || 1,
          createdAt: Date.now()
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      console.error('保存章节失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 保存知识点
  async saveLesson() {
    const { title, content, codeExample, order } = this.data.lessonData;
    const questions = this.data.questions;

    if (!title.trim()) {
      wx.showToast({ title: '请输入知识点标题', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const data = {
        chapterId: this.data.chapterId,
        title: title.trim(),
        content: content || '',
        codeExample: codeExample || '',
        order: parseInt(order) || 1,
        questions: questions.length > 0 ? questions : null
      };

      if (this.data.lessonId) {
        await db.courses.updateLesson(this.data.lessonId, data);
      } else {
        await db.courses.addLesson(data);
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      console.error('保存知识点失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 保存按钮
  onSave() {
    if (this.data.type === 'chapter') {
      this.saveChapter();
    } else {
      this.saveLesson();
    }
  },

  // 知识点列表：编辑知识点
  editLesson(e) {
    const lessonId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin-edit/admin-edit?type=lesson&lessonId=${lessonId}&chapterId=${this.data.chapterId}&courseId=${this.data.courseId}`
    });
  },

  // 知识点列表：新增知识点
  addLesson() {
    wx.navigateTo({
      url: `/pages/admin-edit/admin-edit?type=lesson&chapterId=${this.data.chapterId}&courseId=${this.data.courseId}`
    });
  },

  // 知识点列表：删除知识点
  async deleteLesson(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除此知识点吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            await db.courses.deleteLesson(id);
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadLessons(this.data.chapterId);
          } catch (err) {
            wx.hideLoading();
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
