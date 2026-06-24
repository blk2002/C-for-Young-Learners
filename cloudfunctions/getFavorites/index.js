// cloudfunctions/getFavorites/index.js - 获取收藏列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return {
      success: false,
      message: '学生ID不能为空'
    };
  }

  try {
    // 获取用户的所有收藏
    const favResult = await db.collection('favorites').where({
      userId
    }).orderBy('createdAt', 'desc').get();

    const favoriteList = favResult.data;

    if (favoriteList.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // 获取对应的知识点详情
    const lessonIds = favoriteList.map(item => item.lessonId);
    const lessonsResult = await db.collection('lessons').where({
      _id: _.in(lessonIds)
    }).get();

    // 获取章节信息
    const chapterIds = lessonsResult.data.map(lesson => lesson.chapterId);
    const chaptersResult = await db.collection('chapters').where({
      _id: _.in(chapterIds)
    }).get();

    // 组装返回数据
    const lessonMap = {};
    lessonsResult.data.forEach(lesson => {
      lessonMap[lesson._id] = lesson;
    });

    const chapterMap = {};
    chaptersResult.data.forEach(chapter => {
      chapterMap[chapter._id] = chapter;
    });

    const data = favoriteList.map(fav => {
      const lesson = lessonMap[fav.lessonId];
      const chapter = lesson ? chapterMap[lesson.chapterId] : null;
      return {
        _id: fav._id,
        lessonId: fav.lessonId,
        lessonTitle: lesson ? lesson.title : '已删除',
        chapterTitle: chapter ? chapter.title : '',
        chapterId: lesson ? lesson.chapterId : '',
        courseId: chapter ? chapter.courseId : '',
        createdAt: fav.createdAt
      };
    }).filter(item => item.lessonTitle !== '已删除');

    return {
      success: true,
      data
    };
  } catch (err) {
    console.error('获取收藏失败', err);
    return {
      success: false,
      message: '获取收藏失败'
    };
  }
};
