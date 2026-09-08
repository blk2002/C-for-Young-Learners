// cloudfunctions/adminDeleteUser/index.js - 管理员删除学生账号（级联清理全部数据）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 需要连带清理的集合（都按 userId 字段关联）
const RELATED_COLLECTIONS = ['progress', 'favorites', 'wrongQuestions'];

// 校验操作者是否为管理员
async function assertAdmin(operatorId) {
  if (!operatorId) {
    return { ok: false, message: '缺少操作者身份' };
  }
  try {
    const res = await db.collection('users').doc(operatorId).get();
    if (!res.data || res.data.role !== 'admin') {
      return { ok: false, message: '只有老师可以删除账号' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: '操作者身份校验失败' };
  }
}

// 分批删除（云数据库 where 删除一次上限 1000 条，这里循环删干净）
async function removeByUserId(collectionName, userId) {
  let removed = 0;
  for (let i = 0; i < 20; i++) {
    const res = await db.collection(collectionName)
      .where({ userId })
      .limit(100)
      .get();

    if (!res.data || res.data.length === 0) break;

    for (const doc of res.data) {
      await db.collection(collectionName).doc(doc._id).remove();
      removed++;
    }

    if (res.data.length < 100) break;
  }
  return removed;
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

  if (userId === operatorId) {
    return { success: false, message: '不能删除自己的账号' };
  }

  try {
    // 取出学生信息
    const userRes = await db.collection('users').doc(userId).get();
    const user = userRes.data;

    if (!user) {
      return { success: false, message: '账号不存在' };
    }
    if (user.role === 'admin') {
      return { success: false, message: '不能删除管理员账号' };
    }

    // 级联清理关联数据
    const cleaned = {};
    for (const name of RELATED_COLLECTIONS) {
      try {
        cleaned[name] = await removeByUserId(name, userId);
      } catch (err) {
        console.error(`清理 ${name} 失败`, err);
        cleaned[name] = -1; // -1 表示清理失败
      }
    }

    // 删除账号本身
    await db.collection('users').doc(userId).remove();

    return {
      success: true,
      message: '已删除该学生及其全部学习数据',
      data: {
        username: user.username,
        name: user.name || user.username,
        cleaned: cleaned
      }
    };
  } catch (err) {
    console.error('删除账号失败', err);
    return { success: false, message: '删除失败，请稍后重试' };
  }
};
