// cloudfunctions/reviewUser/index.js - 审核用户
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, approved } = event;

  if (!userId) {
    return {
      success: false,
      message: '学生ID不能为空'
    };
  }

  try {
    const status = approved ? 'approved' : 'rejected';

    await db.collection('users').doc(userId).update({
      data: {
        status: status,
        reviewedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: approved ? '已通过审核' : '已拒绝该学生'
    };
  } catch (err) {
    console.error('审核失败', err);
    return {
      success: false,
      message: '审核操作失败'
    };
  }
};
