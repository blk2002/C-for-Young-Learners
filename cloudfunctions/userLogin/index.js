// cloudfunctions/userLogin/index.js - 用户登录云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 与注册相同的哈希函数
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // 修复括号
    hash = (hash << 5) - hash + char;
    // 转成正数（非常重要）
    hash = hash & 0x7FFFFFFF;
  }
  // 36进制短字符 + 长度
  return hash.toString(36) + str.length;
}

exports.main = async (event, context) => {
  const { username, password } = event;

  if (!username || !password) {
    return {
      success: false,
      message: '请输入学生姓名和密码'
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
        message: '学生不存在'
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

    // 检查状态
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

    // 登录成功，返回用户信息（不包含密码）
    return {
      success: true,
      message: '登录成功',
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        status: user.status
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
