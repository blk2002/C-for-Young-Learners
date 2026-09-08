// cloudfunctions/adminResetPassword/index.js - 管理员一键重置学生密码
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 默认密码（与建号时的初始密码保持一致）
const DEFAULT_PASSWORD = '123456';

// 与登录相同的哈希函数
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & 0x7FFFFFFF;
  }
  return hash.toString(36) + str.length;
}

// 校验操作者是否为管理员
async function assertAdmin(operatorId) {
  if (!operatorId) {
    return { ok: false, message: '缺少操作者身份' };
  }
  try {
    const res = await db.collection('users').doc(operatorId).get();
    if (!res.data || res.data.role !== 'admin') {
      return { ok: false, message: '只有老师可以重置密码' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: '操作者身份校验失败' };
  }
}

exports.main = async (event, context) => {
  const { operatorId, userId } = event;

  const auth = await assertAdmin(operatorId);
  if (!auth.ok) {
    return { success: false, message: auth.message };
  }

  if (!userId) {
    return { success: false, message: '缺少学生ID' };
  }

  try {
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return { success: false, message: '账号不存在' };
    }

    await db.collection('users').doc(userId).update({
      data: {
        password: simpleHash(DEFAULT_PASSWORD),
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '密码已重置',
      data: {
        username: userRes.data.username,
        name: userRes.data.name || userRes.data.username,
        newPassword: DEFAULT_PASSWORD
      }
    };
  } catch (err) {
    console.error('重置密码失败', err);
    return { success: false, message: '重置失败，请稍后重试' };
  }
};
