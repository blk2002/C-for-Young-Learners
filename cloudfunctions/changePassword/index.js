// cloudfunctions/changePassword/index.js - 学生修改密码（需验证原密码）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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

exports.main = async (event, context) => {
  const { userId, oldPassword, newPassword, confirmPassword } = event;

  if (!userId) {
    return { success: false, message: '缺少用户ID' };
  }
  if (!oldPassword) {
    return { success: false, message: '请输入原密码' };
  }
  if (!newPassword) {
    return { success: false, message: '请输入新密码' };
  }
  if (newPassword.length < 6) {
    return { success: false, message: '新密码至少6个字符' };
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return { success: false, message: '两次输入的新密码不一致' };
  }

  try {
    const userRes = await db.collection('users').doc(userId).get();
    const user = userRes.data;

    if (!user) {
      return { success: false, message: '账号不存在' };
    }

    // 验证原密码
    if (user.password !== simpleHash(oldPassword)) {
      return { success: false, message: '原密码不正确' };
    }

    // 新密码不能和原密码一样
    if (user.password === simpleHash(newPassword)) {
      return { success: false, message: '新密码不能与原密码相同' };
    }

    await db.collection('users').doc(userId).update({
      data: {
        password: simpleHash(newPassword),
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '密码修改成功'
    };
  } catch (err) {
    console.error('修改密码失败', err);
    return { success: false, message: '修改失败，请稍后重试' };
  }
};
