// cloudfunctions/updateUserProfile/index.js - 更新用户资料云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, name, nickname, signature, avatar } = event;

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

    // 真实姓名（编辑资料页的主要字段，同时同步到 nickname 保证旧逻辑兼容）
    if (name !== undefined) {
      updateData.name = name;
      updateData.nickname = name;
    }
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
        name: user.name || user.nickname || '',
        nickname: user.nickname || '',
        signature: user.signature || '',
        avatar: user.avatar || '',
        role: user.role,
        status: user.status,
        validUntil: user.validUntil || null
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
