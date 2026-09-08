// cloudfunctions/cleanPendingUsers/index.js - 一次性清理待审核（pending）账号
// 账号改由管理员发放后，自助注册产生的 pending 账号全部作废。
// 用法：在微信开发者工具里右键该云函数 →「上传并部署」，然后「云端测试」执行一次即可。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  // 安全开关：必须显式传 confirm: true 才会真删
  if (!event || event.confirm !== true) {
    return {
      success: false,
      message: '这是危险操作。请在云端测试时传入 { "confirm": true } 才会执行删除。'
    };
  }

  try {
    const result = await db.collection('users')
      .where({ status: 'pending' })
      .limit(100)
      .get();

    const list = result.data || [];

    if (list.length === 0) {
      return { success: true, message: '没有待审核账号需要清理', removed: 0 };
    }

    let removed = 0;
    const removedNames = [];
    for (const user of list) {
      await db.collection('users').doc(user._id).remove();
      removed++;
      removedNames.push(user.username);
    }

    return {
      success: true,
      message: `已清理 ${removed} 个待审核账号`,
      removed: removed,
      usernames: removedNames
    };
  } catch (err) {
    console.error('清理待审核账号失败', err);
    return { success: false, message: '清理失败：' + err.message };
  }
};
