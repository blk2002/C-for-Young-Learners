// utils/db.js - 云数据库操作工具

// 获取数据库引用
function getDB() {
  return wx.cloud.database();
}

// 获取集合引用
function collection(name) {
  return getDB().collection(name);
}

// 用户相关操作
const users = {
  // 注册新用户
  register(username, password) {
    return wx.cloud.callFunction({
      name: 'userRegister',
      data: { username, password }
    });
  },

  // 用户登录
  login(username, password) {
    return wx.cloud.callFunction({
      name: 'userLogin',
      data: { username, password }
    });
  },

  // 获取待审核用户列表
  getPendingUsers() {
    return wx.cloud.callFunction({
      name: 'getPendingUsers'
    });
  },

  // 审核用户
  reviewUser(userId, approved) {
    return wx.cloud.callFunction({
      name: 'reviewUser',
      data: { userId, approved }
    });
  },

  // 更新用户资料
  updateProfile(userId, data) {
    return wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: { userId, ...data }
    });
  }
};

// 课程相关操作
const courses = {
  // 获取课程章节列表
  getChapters(courseId) {
    return collection('chapters')
      .where({ courseId })
      .orderBy('order', 'asc')
      .get();
  },

  // 获取章节详情
  getChapter(chapterId) {
    return collection('chapters').doc(chapterId).get();
  },

  // 获取知识点列表
  getLessons(chapterId) {
    return collection('lessons')
      .where({ chapterId })
      .orderBy('order', 'asc')
      .get();
  },

  // 获取知识点详情
  getLesson(lessonId) {
    return collection('lessons').doc(lessonId).get();
  },

  // 添加章节
  addChapter(data) {
    return collection('chapters').add({ data });
  },

  // 更新章节
  updateChapter(id, data) {
    return collection('chapters').doc(id).update({ data });
  },

  // 删除章节
  deleteChapter(id) {
    return collection('chapters').doc(id).remove();
  },

  // 添加知识点
  addLesson(data) {
    return collection('lessons').add({ data });
  },

  // 更新知识点
  updateLesson(id, data) {
    return collection('lessons').doc(id).update({ data });
  },

  // 删除知识点
  deleteLesson(id) {
    return collection('lessons').doc(id).remove();
  }
};

// 学习进度相关操作
const progress = {
  // 获取用户学习进度
  getProgress(userId, courseId) {
    return collection('progress')
      .where({ userId, courseId })
      .get();
  },

  // 更新学习进度
  updateProgress(userId, courseId, chapterId, lessonId) {
    return wx.cloud.callFunction({
      name: 'updateProgress',
      data: { userId, courseId, chapterId, lessonId }
    });
  },

  // 获取所有课程进度
  getAllProgress(userId) {
    return collection('progress')
      .where({ userId })
      .get();
  }
};

// 收藏相关操作
const favorites = {
  // 获取用户收藏列表
  getFavorites(userId) {
    return wx.cloud.callFunction({
      name: 'getFavorites',
      data: { userId }
    });
  },

  // 切换收藏状态
  toggleFavorite(userId, lessonId) {
    return wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: { userId, lessonId }
    });
  },

  // 检查是否已收藏
  isFavorite(userId, lessonId) {
    return collection('favorites')
      .where({ userId, lessonId })
      .count();
  }
};

// 章节知识点习题相关操作
const chapterQuestions = {
  // 获取题目
  getQuestions(courseId, chapterId, lessonId) {
    return wx.cloud.callFunction({
      name: 'chapterQuestions',
      data: {
        action: 'getQuestions',
        courseId,
        chapterId,
        lessonId
      }
    });
  },

  // 保存题目
  saveQuestions(courseId, chapterId, lessonId, questions) {
    return wx.cloud.callFunction({
      name: 'chapterQuestions',
      data: {
        action: 'saveQuestions',
        courseId,
        chapterId,
        lessonId,
        questions
      }
    });
  }
};

// 错题本相关操作
const wrongQuestions = {
  // 添加错题
  addWrongQuestions(data) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'addWrongQuestions',
        ...data
      }
    });
  },

  // 获取错题列表
  getWrongQuestions(userId, courseId, chapterId, lessonId, examType, level) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'getWrongQuestions',
        userId,
        courseId,
        chapterId,
        lessonId,
        examType,
        level
      }
    });
  },

  // 获取有错题的章节列表
  getWrongChapters(userId, courseId) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'getWrongChapters',
        userId,
        courseId
      }
    });
  },

  // 获取有错题的知识点列表
  getWrongLessons(userId, courseId, chapterId) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'getWrongLessons',
        userId,
        courseId,
        chapterId
      }
    });
  },

  // 标记单题为已掌握
  markMastered(questionId) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'markMastered',
        questionId
      }
    });
  },

  // 标记知识点所有错题为已掌握
  markLessonMastered(userId, courseId, chapterId, lessonId) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'markLessonMastered',
        userId,
        courseId,
        chapterId,
        lessonId
      }
    });
  },

  // 获取有错题的考试类型列表
  getWrongExamTypes(userId, courseId) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'getWrongExamTypes',
        userId,
        courseId
      }
    });
  },

  // 获取某考试类型下有错题的等级列表
  getWrongExamLevels(userId, courseId, examType) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'getWrongExamLevels',
        userId,
        courseId,
        examType
      }
    });
  },

  // 标记某考试类型某等级所有错题为已掌握
  markExamMastered(userId, courseId, examType, level) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'markExamMastered',
        userId,
        courseId,
        examType,
        level
      }
    });
  },

  // 保存练习进度
  saveExerciseProgress(userId, courseId, chapterId, lessonId, totalQuestions, correctCount) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'saveExerciseProgress',
        userId,
        courseId,
        chapterId,
        lessonId,
        totalQuestions,
        correctCount
      }
    });
  },

  // 获取练习进度
  getExerciseProgress(userId, courseId, chapterId, lessonId) {
    return wx.cloud.callFunction({
      name: 'wrongQuestions',
      data: {
        action: 'getExerciseProgress',
        userId,
        courseId,
        chapterId,
        lessonId
      }
    });
  }
};

// 等级考试习题相关操作
const examQuestions = {
  // 获取题目
  getQuestions(courseId, examType, level) {
    return wx.cloud.callFunction({
      name: 'examQuestions',
      data: {
        action: 'getQuestions',
        courseId,
        examType,
        level
      }
    });
  },

  // 保存题目
  saveQuestions(courseId, examType, level, questions) {
    return wx.cloud.callFunction({
      name: 'examQuestions',
      data: {
        action: 'saveQuestions',
        courseId,
        examType,
        level,
        questions
      }
    });
  },

  // 获取有题目的等级列表
  getLevelsWithQuestions(courseId, examType) {
    return wx.cloud.callFunction({
      name: 'examQuestions',
      data: {
        action: 'getLevelsWithQuestions',
        courseId,
        examType
      }
    });
  }
};

module.exports = {
  users,
  courses,
  progress,
  favorites,
  chapterQuestions,
  wrongQuestions,
  examQuestions,
  collection,
  getDB
};
