// cloudfunctions/userRegister/index.js - 用户注册云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 简单的MD5哈希（用于密码加密）
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

  // 参数校验
  if (!username || !password) {
    return {
      success: false,
      message: '学生姓名和密码不能为空'
    };
  }

  if (username.length < 3) {
    return {
      success: false,
      message: '学生姓名至少3个字符'
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: '密码至少6个字符'
    };
  }

  try {
    // 检查用户名是否已存在
    const existing = await db.collection('users').where({
      username: username
    }).get();

    if (existing.data.length > 0) {
      return {
        success: false,
        message: '该学生姓名已被注册'
      };
    }

    // 创建新用户
    const result = await db.collection('users').add({
      data: {
        username: username,
        password: simpleHash(password),
        role: 'user',
        status: 'pending', // pending: 待审核, approved: 已通过, rejected: 已拒绝
        createdAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '注册成功！请等待老师审核通过',
      data: {
        _id: result._id,
        username: username,
        role: 'user',
        status: 'pending'
      }
    };
  } catch (err) {
    console.error('注册失败', err);
    return {
      success: false,
      message: '注册失败，请稍后重试'
    };
  }
};
