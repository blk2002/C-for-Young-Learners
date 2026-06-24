// cloudfunctions/getPendingUsers/index.js - 获取待审核用户列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取所有待审核用户
    const result = await db.collection('users').where({
      status: 'pending'
    }).orderBy('createdAt', 'asc').get();

    // 过滤掉密码字段
    const users = result.data.map(user => ({
      _id: user._id,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt
    }));

    return {
      success: true,
      data: users
    };
  } catch (err) {
    console.error('获取待审核用户失败', err);
    return {
      success: false,
      message: '获取学生列表失败'
    };
  }
};
