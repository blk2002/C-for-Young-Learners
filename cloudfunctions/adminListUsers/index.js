// cloudfunctions/adminListUsers/index.js - 管理员获取学生列表
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
      return { ok: false, message: '只有老师可以查看学生列表' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: '操作者身份校验失败' };
  }
}

exports.main = async (event, context) => {
  const { operatorId } = event;

  const auth = await assertAdmin(operatorId);
  if (!auth.ok) {
    return { success: false, message: auth.message };
  }

  try {
    // 拉取全部用户后过滤掉管理员（学生数量不会很大，全量拉取最稳）
    const result = await db.collection('users').limit(100).get();
    const rawUsers = (result.data || []).filter(u => u.role !== 'admin');

    const now = Date.now();
    const users = rawUsers.map(user => {
      let expireState = 'permanent'; // permanent / active / soon / expired
      let remainDays = -1;

      if (user.role === 'admin' || !user.validUntil) {
        expireState = 'permanent';
      } else {
        const expireTime = new Date(user.validUntil).getTime();
        if (isNaN(expireTime)) {
          expireState = 'permanent';
        } else {
          remainDays = Math.ceil((expireTime - now) / (24 * 60 * 60 * 1000));
          if (remainDays < 0) expireState = 'expired';
          else if (remainDays <= 30) expireState = 'soon';
          else expireState = 'active';
        }
      }

      return {
        _id: user._id,
        username: user.username,
        name: user.name || user.nickname || user.username,
        avatar: user.avatar || '',
        role: user.role,
        status: user.status,
        validUntil: user.validUntil || null,
        expireState: expireState,
        remainDays: remainDays,
        createdAt: user.createdAt
      };
    });

    // 已过期的排最后，其余按创建时间倒序
    users.sort((a, b) => {
      if (a.expireState === 'expired' && b.expireState !== 'expired') return 1;
      if (b.expireState === 'expired' && a.expireState !== 'expired') return -1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return {
      success: true,
      data: users
    };
  } catch (err) {
    console.error('获取学生列表失败', err);
    return { success: false, message: '获取学生列表失败' };
  }
};
