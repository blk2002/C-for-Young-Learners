// cloudfunctions/adminUpdateValidity/index.js - 管理员给学生账号续期
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 校验操作者是否为管理员
async function assertAdmin(operatorId) {
  if (!operatorId) {
    return { ok: false, message: '缺少操作者身份' };
  }
  try {
    const res = await db.collection('users').doc(operatorId).get();
    if (!res.data || res.data.role !== 'admin') {
      return { ok: false, message: '只有老师可以续期' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: '操作者身份校验失败' };
  }
}

exports.main = async (event, context) => {
  const { operatorId, userId, durationDays, validUntil } = event;

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
    if (userRes.data.role === 'admin') {
      return { success: false, message: '管理员账号无需续期' };
    }

    let newValidUntil = null;

    // 优先用直接传的截止日期
    if (validUntil) {
      const t = new Date(validUntil).getTime();
      if (isNaN(t)) {
        return { success: false, message: '截止日期格式不正确' };
      }
      newValidUntil = new Date(t);
    } else {
      // 否则按 durationDays 累加：未过期/永久有效的从今天算起，已过期的也从今天算起
      const days = parseInt(durationDays, 10);
      if (isNaN(days) || days <= 0) {
        return { success: false, message: '请选择续期时长' };
      }
      newValidUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    await db.collection('users').doc(userId).update({
      data: {
        validUntil: newValidUntil,
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '续期成功',
      data: {
        _id: userId,
        username: userRes.data.username,
        validUntil: newValidUntil
      }
    };
  } catch (err) {
    console.error('续期失败', err);
    return { success: false, message: '续期失败，请稍后重试' };
  }
};
