// cloudfunctions/userLogin/index.js - 用户登录云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 与建号相同的哈希函数
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & 0x7FFFFFFF;
  }
  return hash.toString(36) + str.length;
}

exports.main = async (event, context) => {
  const { username, password } = event;

  if (!username || !password) {
    return {
      success: false,
      message: '请输入账号和密码'
    };
  }

  try {
    // 查找用户
    const result = await db.collection('users').where({
      username: username
    }).get();

    if (result.data.length === 0) {
      return {
        success: false,
        message: '账号不存在'
      };
    }

    const user = result.data[0];

    // 验证密码
    if (user.password !== simpleHash(password)) {
      return {
        success: false,
        message: '密码错误'
      };
    }

    // 检查状态（历史遗留的审核状态，新建的账号一律是 approved）
    if (user.status === 'pending') {
      return {
        success: false,
        message: '账号正在审核中，请等待老师审核通过',
        needReview: true
      };
    }

    if (user.status === 'rejected') {
      return {
        success: false,
        message: '账号已被拒绝，请联系老师'
      };
    }

    // 检查有效期
    // 管理员永久有效；没有 validUntil 字段的老账号也视为永久有效
    if (user.role !== 'admin' && user.validUntil) {
      const expireTime = new Date(user.validUntil).getTime();
      if (!isNaN(expireTime) && Date.now() > expireTime) {
        return {
          success: false,
          message: '账号已失效，请联系老师续期',
          expired: true
        };
      }
    }

    // 登录成功，返回用户信息（不包含密码）
    return {
      success: true,
      message: '登录成功',
      data: {
        _id: user._id,
        username: user.username,
        name: user.name || user.nickname || user.username,
        nickname: user.nickname || '',
        avatar: user.avatar || '',
        signature: user.signature || '',
        role: user.role,
        status: user.status,
        validUntil: user.validUntil || null,
        isPermanent: user.role === 'admin' || !user.validUntil
      }
    };
  } catch (err) {
    console.error('登录失败', err);
    return {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
};
