const cloud = require('wx-server-sdk');
const { buildStructureOps, buildQuestionOps } = require('./lib');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 管理密码：部署后在云开发控制台 → 云函数 → 配置 → 环境变量 设置 ADMIN_PASSWORD
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// 连续失败锁定（实例内存计数）
let failCount = 0, lockedUntil = 0;
function authOk(password) {
  const now = Date.now();
  if (now < lockedUntil) return false;
  if (!ADMIN_PASSWORD) throw new Error('未配置 ADMIN_PASSWORD 环境变量');
  if (password === ADMIN_PASSWORD) { failCount = 0; return true; }
  failCount++;
  if (failCount >= 5) { lockedUntil = now + 10 * 60 * 1000; failCount = 0; }
  return false;
}

exports.main = async (event) => {
  try {
    if (!authOk(event.password)) return { success: false, message: '管理密码错误（连续错5次锁定10分钟）' };
    if (event.mode === 'structure') return await runStructure(event);
    if (event.mode === 'questions') return await runQuestions(event);
    return { success: false, message: 'mode 必须是 structure 或 questions' };
  } catch (err) {
    return { success: false, message: String(err.message || err) };
  }
};

async function runStructure(e) {
  const ops = buildStructureOps(e);
  const results = [], idMap = { chapters: {}, lessons: {} };
  for (const id of ops.lessonDeletes) { try { await db.collection('lessons').doc(id).remove(); } catch (err) { results.push({ op: 'del-lesson', id, ok: false, msg: err.message }); } }
  for (const id of ops.chapterDeletes) { try { await db.collection('chapters').doc(id).remove(); } catch (err) { results.push({ op: 'del-chapter', id, ok: false, msg: err.message }); } }
  for (const add of ops.chapterAdds) {
    try {
      const res = await db.collection('chapters').add({ data: { ...add.data, createdAt: db.serverDate() } });
      idMap.chapters[add.key] = res._id;
    } catch (err) { results.push({ op: 'add-chapter', ok: false, msg: err.message }); }
  }
  for (const add of ops.lessonAdds) {
    const chapterId = add.chapterId || idMap.chapters[add.chapterKey];
    if (!chapterId) { results.push({ op: 'add-lesson', ok: false, msg: '章节未入库：' + add.data.title }); continue; }
    try {
      const res = await db.collection('lessons').add({ data: { chapterId, ...add.data, createdAt: db.serverDate() } });
      idMap.lessons[add.key] = res._id;
    } catch (err) { results.push({ op: 'add-lesson', ok: false, msg: err.message }); }
  }
  for (const u of ops.chapterUpdates) { try { await db.collection('chapters').doc(u.id).update({ data: u.data }); } catch (err) { results.push({ op: 'upd-chapter', id: u.id, ok: false, msg: err.message }); } }
  for (const u of ops.lessonUpdates) { try { await db.collection('lessons').doc(u.id).update({ data: u.data }); } catch (err) { results.push({ op: 'upd-lesson', id: u.id, ok: false, msg: err.message }); } }
  return { success: true, results, idMap };
}

async function runQuestions(e) {
  const ops = buildQuestionOps(e);
  if (ops.errors.length) return { success: false, message: ops.errors.join('；') };
  const results = [];
  for (const u of ops.learnUpdates) {
    try { await db.collection('lessons').doc(u.lessonId).update({ data: { questions: u.questions } }); }
    catch (err) { results.push({ op: 'learn', id: u.lessonId, ok: false, msg: err.message }); }
  }
  for (const u of ops.chapterUpserts) {
    try {
      const lessonDoc = await db.collection('lessons').doc(u.lessonId).get();
      const chapterId = lessonDoc.data && lessonDoc.data.chapterId;
      if (!chapterId) { results.push({ op: 'chapter', id: u.lessonId, ok: false, msg: '知识点无章节归属' }); continue; }
      const exist = await db.collection('chapterQuestions').where({ courseId: e.courseId, chapterId, lessonId: u.lessonId }).get();
      if (exist.data && exist.data.length) {
        await db.collection('chapterQuestions').doc(exist.data[0]._id).update({ data: { questions: u.questions, updatedAt: db.serverDate() } });
      } else {
        await db.collection('chapterQuestions').add({ data: { courseId: e.courseId, chapterId, lessonId: u.lessonId, questions: u.questions, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
      }
    } catch (err) { results.push({ op: 'chapter', id: u.lessonId, ok: false, msg: err.message }); }
  }
  for (const u of ops.examUpserts) {
    try {
      const exist = await db.collection('examQuestions').where({ courseId: e.courseId, examType: u.examType, level: u.level }).get();
      if (exist.data && exist.data.length) {
        await db.collection('examQuestions').doc(exist.data[0]._id).update({ data: { questions: u.questions, updatedAt: db.serverDate() } });
      } else {
        await db.collection('examQuestions').add({ data: { courseId: e.courseId, examType: u.examType, level: u.level, questions: u.questions, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
      }
    } catch (err) { results.push({ op: 'exam', key: u.examType + '/' + u.level, ok: false, msg: err.message }); }
  }
  return { success: true, results };
}
