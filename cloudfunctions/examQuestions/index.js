const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, courseId, examType, level, questions } = event;

  try {
    switch (action) {
      case 'getQuestions': {
        if (!courseId || !examType || !level) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('examQuestions').where({
          courseId: courseId,
          examType: examType,
          level: level
        }).get();

        const data = result.data && result.data.length > 0 ? result.data[0] : null;
        return { success: true, data: data };
      }

      case 'saveQuestions': {
        if (!courseId || !examType || !level) {
          return { success: false, message: '参数不完整' };
        }

        const now = new Date();
        const existing = await db.collection('examQuestions').where({
          courseId: courseId,
          examType: examType,
          level: level
        }).get();

        if (existing.data && existing.data.length > 0) {
          const docId = existing.data[0]._id;
          await db.collection('examQuestions').doc(docId).update({
            data: {
              questions: questions || [],
              updatedAt: now
            }
          });
          return { success: true, message: '保存成功' };
        } else {
          await db.collection('examQuestions').add({
            data: {
              courseId: courseId,
              examType: examType,
              level: level,
              questions: questions || [],
              createdAt: now,
              updatedAt: now
            }
          });
          return { success: true, message: '保存成功' };
        }
      }

      case 'getLevelsWithQuestions': {
        if (!courseId || !examType) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('examQuestions').where({
          courseId: courseId,
          examType: examType
        }).field({
          level: true,
          questions: true
        }).get();

        const levels = (result.data || []).map(item => ({
          level: item.level,
          questionCount: (item.questions || []).length
        }));

        return { success: true, data: levels };
      }

      default:
        return { success: false, message: '未知操作' };
    }
  } catch (err) {
    console.error('云函数错误', err);
    return {
      success: false,
      message: err.message || '服务器错误'
    };
  }
};
