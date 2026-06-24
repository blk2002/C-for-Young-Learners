const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, userId, courseId, chapterId, lessonId, questions, mastered } = event;

  try {
    switch (action) {
      case 'addWrongQuestions': {
        const { userId, courseId, chapterId, lessonId, questions, examType, level } = event;
        if (!userId || !courseId || !questions || !Array.isArray(questions)) {
          return { success: false, message: '参数不完整' };
        }

        const now = new Date();

        for (const question of questions) {
          const questionKey = JSON.stringify({
            type: question.type,
            question: question.question,
            answer: question.answer
          });

          const existing = await db.collection('wrongQuestions').where({
            userId: userId,
            courseId: courseId,
            chapterId: chapterId,
            lessonId: lessonId,
            examType: examType,
            level: level,
            questionKey: questionKey
          }).get();

          if (existing.data && existing.data.length > 0) {
            const docId = existing.data[0]._id;
            await db.collection('wrongQuestions').doc(docId).update({
              data: {
                wrongCount: _.inc(1),
                lastWrongAt: now,
                mastered: false
              }
            });
          } else {
            await db.collection('wrongQuestions').add({
              data: {
                userId: userId,
                courseId: courseId,
                chapterId: chapterId || '',
                lessonId: lessonId || '',
                examType: examType || '',
                level: level || '',
                questionKey: questionKey,
                question: question,
                wrongCount: 1,
                firstWrongAt: now,
                lastWrongAt: now,
                mastered: false,
                createdAt: now,
                updatedAt: now
              }
            });
          }
        }

        return { success: true, message: '错题保存成功' };
      }

      case 'getWrongQuestions': {
        if (!userId) {
          return { success: false, message: '参数不完整' };
        }

        let query = { userId: userId, mastered: false };
        if (courseId) query.courseId = courseId;
        if (chapterId) query.chapterId = chapterId;
        if (lessonId) query.lessonId = lessonId;
        if (event.examType) query.examType = event.examType;
        if (event.level) query.level = event.level;

        const result = await db.collection('wrongQuestions').where(query)
          .orderBy('lastWrongAt', 'desc')
          .get();

        return { success: true, data: result.data };
      }

      case 'getWrongChapters': {
        if (!userId || !courseId) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('wrongQuestions').where({
          userId: userId,
          courseId: courseId,
          mastered: false
        }).get();

        const chapterMap = {};
        for (const item of result.data) {
          if (!chapterMap[item.chapterId]) {
            chapterMap[item.chapterId] = {
              chapterId: item.chapterId,
              wrongCount: 0
            };
          }
          chapterMap[item.chapterId].wrongCount++;
        }

        const chapters = Object.values(chapterMap);
        return { success: true, data: chapters };
      }

      case 'getWrongLessons': {
        if (!userId || !courseId || !chapterId) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('wrongQuestions').where({
          userId: userId,
          courseId: courseId,
          chapterId: chapterId,
          mastered: false
        }).get();

        const lessonMap = {};
        for (const item of result.data) {
          if (!lessonMap[item.lessonId]) {
            lessonMap[item.lessonId] = {
              lessonId: item.lessonId,
              wrongCount: 0,
              lastWrongAt: item.lastWrongAt
            };
          }
          lessonMap[item.lessonId].wrongCount++;
          if (item.lastWrongAt > lessonMap[item.lessonId].lastWrongAt) {
            lessonMap[item.lessonId].lastWrongAt = item.lastWrongAt;
          }
        }

        const lessons = Object.values(lessonMap).sort((a, b) => b.lastWrongAt - a.lastWrongAt);
        return { success: true, data: lessons };
      }

      case 'markMastered': {
        const { questionId } = event;
        if (!questionId) {
          return { success: false, message: '参数不完整' };
        }

        await db.collection('wrongQuestions').doc(questionId).update({
          data: {
            mastered: true,
            updatedAt: new Date()
          }
        });

        return { success: true, message: '已标记为掌握' };
      }

      case 'markLessonMastered': {
        if (!userId || !courseId || !chapterId || !lessonId) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('wrongQuestions').where({
          userId: userId,
          courseId: courseId,
          chapterId: chapterId,
          lessonId: lessonId,
          mastered: false
        }).get();

        for (const item of result.data) {
          await db.collection('wrongQuestions').doc(item._id).update({
            data: {
              mastered: true,
              updatedAt: new Date()
            }
          });
        }

        return { success: true, message: '已全部标记为掌握' };
      }

      case 'markExamMastered': {
        const { examType, level } = event;
        if (!userId || !courseId || !examType || !level) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('wrongQuestions').where({
          userId: userId,
          courseId: courseId,
          examType: examType,
          level: level,
          mastered: false
        }).get();

        for (const item of result.data) {
          await db.collection('wrongQuestions').doc(item._id).update({
            data: {
              mastered: true,
              updatedAt: new Date()
            }
          });
        }

        return { success: true, message: '已全部标记为掌握' };
      }

      case 'saveExerciseProgress': {
        const { totalQuestions, correctCount } = event;
        if (!userId || !courseId || !chapterId || !lessonId || totalQuestions === undefined) {
          return { success: false, message: '参数不完整' };
        }

        const now = new Date();
        const existing = await db.collection('exerciseProgress').where({
          userId: userId,
          courseId: courseId,
          chapterId: chapterId,
          lessonId: lessonId
        }).get();

        if (existing.data && existing.data.length > 0) {
          const doc = existing.data[0];
          const bestCorrect = Math.max(doc.correctCount || 0, correctCount || 0);
          await db.collection('exerciseProgress').doc(doc._id).update({
            data: {
              totalQuestions: totalQuestions,
              correctCount: bestCorrect,
              attemptCount: _.inc(1),
              lastAttemptAt: now,
              updatedAt: now
            }
          });
        } else {
          await db.collection('exerciseProgress').add({
            data: {
              userId: userId,
              courseId: courseId,
              chapterId: chapterId,
              lessonId: lessonId,
              totalQuestions: totalQuestions,
              correctCount: correctCount || 0,
              attemptCount: 1,
              lastAttemptAt: now,
              createdAt: now,
              updatedAt: now
            }
          });
        }

        return { success: true };
      }

      case 'getExerciseProgress': {
        if (!userId) {
          return { success: false, message: '参数不完整' };
        }

        let query = { userId: userId };
        if (courseId) query.courseId = courseId;
        if (chapterId) query.chapterId = chapterId;
        if (lessonId) query.lessonId = lessonId;

        const result = await db.collection('exerciseProgress').where(query).get();
        return { success: true, data: result.data };
      }

      case 'getWrongExamTypes': {
        if (!userId || !courseId) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('wrongQuestions').where({
          userId: userId,
          courseId: courseId,
          examType: _.exists(true),
          mastered: false
        }).get();

        const typeMap = {};
        for (const item of result.data) {
          if (!item.examType) continue;
          if (!typeMap[item.examType]) {
            typeMap[item.examType] = { examType: item.examType, wrongCount: 0 };
          }
          typeMap[item.examType].wrongCount++;
        }

        return { success: true, data: Object.values(typeMap) };
      }

      case 'getWrongExamLevels': {
        if (!userId || !courseId || !event.examType) {
          return { success: false, message: '参数不完整' };
        }

        const result = await db.collection('wrongQuestions').where({
          userId: userId,
          courseId: courseId,
          examType: event.examType,
          mastered: false
        }).get();

        const levelMap = {};
        for (const item of result.data) {
          if (!item.level) continue;
          if (!levelMap[item.level]) {
            levelMap[item.level] = { level: item.level, wrongCount: 0 };
          }
          levelMap[item.level].wrongCount++;
        }

        return { success: true, data: Object.values(levelMap) };
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
