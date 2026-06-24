// cloudfunctions/updateUserProfile/index.js - 更新用户资料云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, nickname, signature, avatar } = event;

  if (!userId) {
    return {
      success: false,
      message: '用户ID不能为空'
    };
  }

  try {
    const updateData = {
      updatedAt: db.serverDate()
    };

    if (nickname !== undefined) {
      updateData.nickname = nickname;
    }
    if (signature !== undefined) {
      updateData.signature = signature;
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    await db.collection('users').doc(userId).update({
      data: updateData
    });

    const userResult = await db.collection('users').doc(userId).get();
    const user = userResult.data;

    return {
      success: true,
      message: '更新成功',
      data: {
        _id: user._id,
        username: user.username,
        nickname: user.nickname || '',
        signature: user.signature || '',
        avatar: user.avatar || '',
        role: user.role,
        status: user.status
      }
    };
  } catch (err) {
    console.error('更新用户资料失败', err);
    return {
      success: false,
      message: '更新失败，请稍后重试'
    };
  }
};
