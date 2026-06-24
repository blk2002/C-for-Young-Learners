// cloudfunctions/chapterQuestions/index.js
const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, courseId, chapterId, lessonId, questions } = event;

  try {
    switch (action) {
      case 'getQuestions': {
        // 根据 courseId、chapterId、lessonId 获取题目
        const result = await db.collection('chapterQuestions').where({
          courseId: courseId,
          chapterId: chapterId,
          lessonId: lessonId
        }).get();

        if (result.data && result.data.length > 0) {
          return {
            success: true,
            data: result.data[0]
          };
        }
        return {
          success: true,
          data: null
        };
      }

      case 'saveQuestions': {
        // 先查询是否存在
        const existing = await db.collection('chapterQuestions').where({
          courseId: courseId,
          chapterId: chapterId,
          lessonId: lessonId
        }).get();

        if (existing.data && existing.data.length > 0) {
          // 更新
          const docId = existing.data[0]._id;
          await db.collection('chapterQuestions').doc(docId).update({
            data: {
              questions: questions,
              updatedAt: db.serverDate()
            }
          });
        } else {
          // 新增
          await db.collection('chapterQuestions').add({
            data: {
              courseId: courseId,
              chapterId: chapterId,
              lessonId: lessonId,
              questions: questions,
              createdAt: db.serverDate(),
              updatedAt: db.serverDate()
            }
          });
        }

        return {
          success: true,
          message: '保存成功'
        };
      }

      default:
        return {
          success: false,
          message: '未知操作'
        };
    }
  } catch (err) {
    console.error('云函数错误', err);
    return {
      success: false,
      message: err.message || '服务器错误'
    };
  }
};