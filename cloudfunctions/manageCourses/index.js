// cloudfunctions/manageCourses/index.js - 学科（课程）管理：新增 / 删除 / 改名
// 仅小程序端管理员可调用（沿用 admin 系列云函数的 operatorId 软校验范式）。
// 学科唯一真源是 courses 集合；删除学科时级联清理其云端内容与学生个人数据：
//   chapters / lessons / chapterQuestions / examQuestions / progress / wrongQuestions / favorites
//   （favorites 没有 courseId 字段，需先收集该学科全部 lessonId 再按 lessonId 删）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 新学科的候选主题色（按已有学科数量轮询取色）
const PALETTE = [
  '#5B67F1', '#8E5CF6', '#45B0E0', '#4E6EF2',
  '#F59E0B', '#10B981', '#EF4444', '#0EA5E9'
];

// 服务端单次 get 上限 1000，写个分页取全函数，防大课数据漏删
async function getAllWhere(coll, where) {
  const PAGE = 1000;
  let out = [];
  let skip = 0;
  // 最多翻 50 页（5 万条）兜底，防死循环
  for (let i = 0; i < 50; i++) {
    const res = await db.collection(coll).where(where).skip(skip).limit(PAGE).get();
    const batch = res.data || [];
    out = out.concat(batch);
    if (batch.length < PAGE) break;
    skip += PAGE;
  }
  return out;
}

// 批量按 id 删除（每批最多 500 个 id）
async function removeByIds(coll, ids) {
  let removed = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const res = await db.collection(coll).where({ _id: _.in(chunk) }).remove();
    removed += (res.stats && res.stats.removed) || chunk.length;
  }
  return removed;
}

// 校验操作者是否为管理员（与 adminCreateUser 一致的软校验）
async function assertAdmin(operatorId) {
  if (!operatorId) {
    return { ok: false, message: '缺少操作者身份' };
  }
  try {
    const res = await db.collection('users').doc(operatorId).get();
    if (!res.data || res.data.role !== 'admin') {
      return { ok: false, message: '只有老师可以管理学科' };
    }
    return { ok: true, operator: res.data };
  } catch (err) {
    return { ok: false, message: '操作者身份校验失败' };
  }
}

// 名称 → 学科 id（slug）。中文名会得到空串，此时退化为时间戳 id
function slugify(name) {
  const s = String(name).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || ('course-' + Date.now().toString(36));
}

// 找一个未被占用的 id：base、base-2、base-3 ...
async function uniqueId(base) {
  let id = base;
  let n = 2;
  // 最多试 50 次，避免极端情况死循环
  while (n < 52) {
    try {
      await db.collection('courses').doc(id).get();
      id = base + '-' + n;
      n++;
    } catch (e) {
      return id; // 查不到 = 可用
    }
  }
  return base + '-' + Date.now().toString(36);
}

exports.main = async (event) => {
  const action = event && event.action;
  const { operatorId } = event || {};

  // 权限校验（三个 action 都需要管理员）
  const auth = await assertAdmin(operatorId);
  if (!auth.ok) {
    return { success: false, message: auth.message };
  }

  try {
    // ============ 新增学科 ============
    if (action === 'add') {
      const name = (event.name || '').trim();
      if (!name) return { success: false, message: '请输入学科名称' };
      if (name.length > 20) return { success: false, message: '学科名称最多 20 个字' };

      // 名称查重
      const dup = await db.collection('courses').where({ name }).count();
      if (dup.total > 0) {
        return { success: false, message: '已存在同名学科' };
      }

      // order = 现有最大 order + 1
      const all = await getAllWhere('courses', {});
      const maxOrder = all.reduce((m, c) => Math.max(m, Number(c.order) || 0), 0);

      const id = await uniqueId(slugify(name));
      const doc = {
        name,
        icon: 'i-book',
        color: PALETTE[all.length % PALETTE.length],
        order: maxOrder + 1,
        builtin: false,
        createdAt: db.serverDate()
      };
      await db.collection('courses').doc(id).set({ data: doc });

      return {
        success: true,
        message: '学科已创建',
        data: { _id: id, ...doc, color: doc.color, order: doc.order }
      };
    }

    // ============ 删除学科（级联清理） ============
    if (action === 'remove') {
      const courseId = event.courseId;
      if (!courseId) return { success: false, message: '缺少学科 id' };

      let course;
      try {
        course = (await db.collection('courses').doc(courseId).get()).data;
      } catch (e) {
        return { success: false, message: '学科不存在或已被删除' };
      }
      if (course && course.builtin) {
        return { success: false, message: '内置学科不可删除' };
      }

      const stats = { chapters: 0, lessons: 0, others: 0, favorites: 0 };

      // 1. 收集该学科全部章节 → 全部知识点（lessons 挂在 chapterId 下）
      const chapters = await getAllWhere('chapters', { courseId });
      const chapterIds = chapters.map(c => c._id);

      let lessonIds = [];
      if (chapterIds.length) {
        // 分块查知识点（_.in 每次最多 500 个值）
        for (let i = 0; i < chapterIds.length; i += 500) {
          const chunk = chapterIds.slice(i, i + 500);
          const ls = await getAllWhere('lessons', { chapterId: _.in(chunk) });
          lessonIds = lessonIds.concat(ls.map(l => l._id));
        }
      }

      // 2. 删章节 + 知识点
      if (lessonIds.length) {
        stats.lessons += await removeByIds('lessons', lessonIds);
      }
      if (chapterIds.length) {
        stats.chapters += await removeByIds('chapters', chapterIds);
      }

      // 3. 按 courseId 直删：习题 / 考试题 / 学习进度 / 错题
      for (const coll of ['chapterQuestions', 'examQuestions', 'progress', 'wrongQuestions']) {
        const res = await db.collection(coll).where({ courseId }).remove();
        stats.others += (res.stats && res.stats.removed) || 0;
      }

      // 4. 收藏：favorites 只有 lessonId，按收集到的 lessonId 分块删
      if (lessonIds.length) {
        for (let i = 0; i < lessonIds.length; i += 500) {
          const chunk = lessonIds.slice(i, i + 500);
          const res = await db.collection('favorites').where({ lessonId: _.in(chunk) }).remove();
          stats.favorites += (res.stats && res.stats.removed) || 0;
        }
      }

      // 5. 最后删学科本身
      await db.collection('courses').doc(courseId).remove();

      return {
        success: true,
        message: `已删除学科「${course ? course.name : courseId}」及其全部内容`,
        stats
      };
    }

    // ============ 改名 ============
    if (action === 'update') {
      const courseId = event.courseId;
      const name = (event.name || '').trim();
      if (!courseId) return { success: false, message: '缺少学科 id' };
      if (!name) return { success: false, message: '请输入学科名称' };
      if (name.length > 20) return { success: false, message: '学科名称最多 20 个字' };

      let course;
      try {
        course = (await db.collection('courses').doc(courseId).get()).data;
      } catch (e) {
        return { success: false, message: '学科不存在或已被删除' };
      }
      if (course && course.builtin) {
        return { success: false, message: '内置学科不可改名' };
      }

      // 名称查重（排除自身）
      const dup = await db.collection('courses').where({ name }).get();
      if ((dup.data || []).some(d => d._id !== courseId)) {
        return { success: false, message: '已存在同名学科' };
      }

      await db.collection('courses').doc(courseId).update({ data: { name } });
      return { success: true, message: '已改名', data: { _id: courseId, name } };
    }

    return { success: false, message: '未知操作：' + action };
  } catch (err) {
    console.error('manageCourses 失败', err);
    return { success: false, message: '操作失败，请稍后重试' };
  }
};
