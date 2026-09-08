// cloudfunctions/adminCreateUser/index.js - 管理员创建学生账号
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 默认初始密码（与「一键重置密码」保持一致）
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
// 注意：这是软校验，依赖前端传入 operatorId。严格方案需要绑定微信 openid。
async function assertAdmin(operatorId) {
  if (!operatorId) {
    return { ok: false, message: '缺少操作者身份' };
  }
  try {
    const res = await db.collection('users').doc(operatorId).get();
    if (!res.data || res.data.role !== 'admin') {
      return { ok: false, message: '只有老师可以创建账号' };
    }
    return { ok: true, operator: res.data };
  } catch (err) {
    return { ok: false, message: '操作者身份校验失败' };
  }
}

exports.main = async (event, context) => {
  const { operatorId, name, username, password, durationDays } = event;

  // 权限校验
  const auth = await assertAdmin(operatorId);
  if (!auth.ok) {
    return { success: false, message: auth.message };
  }

  // 参数校验
  if (!name || !name.trim()) {
    return { success: false, message: '请输入学生姓名' };
  }
  if (!username || !username.trim()) {
    return { success: false, message: '请输入登录账号' };
  }
  if (username.trim().length < 3) {
    return { success: false, message: '登录账号至少3个字符' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return { success: false, message: '登录账号只能包含字母、数字和下划线' };
  }

  const finalPassword = (password && password.trim()) ? password.trim() : DEFAULT_PASSWORD;
  if (finalPassword.length < 6) {
    return { success: false, message: '密码至少6个字符' };
  }

  try {
    // 账号查重
    const existing = await db.collection('users')
      .where({ username: username.trim() })
      .get();

    if (existing.data.length > 0) {
      return { success: false, message: '该登录账号已存在' };
    }

    // 计算有效期截止时间
    let validUntil = null;
    const days = parseInt(durationDays, 10);
    if (!isNaN(days) && days > 0) {
      validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const result = await db.collection('users').add({
      data: {
        username: username.trim(),
        name: name.trim(),
        nickname: name.trim(),
        password: simpleHash(finalPassword),
        role: 'user',
        status: 'approved', // 管理员创建的账号直接可用，无需审核
        validUntil: validUntil,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '账号创建成功',
      data: {
        _id: result._id,
        username: username.trim(),
        name: name.trim(),
        validUntil: validUntil,
        initialPassword: finalPassword
      }
    };
  } catch (err) {
    console.error('创建账号失败', err);
    return { success: false, message: '创建失败，请稍后重试' };
  }
};
