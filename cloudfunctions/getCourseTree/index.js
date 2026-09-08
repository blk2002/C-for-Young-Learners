const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// splitContent 与 importContent/lib.js 同实现，此处内联复制——云函数目录必须自包含
function splitContent(s) {
  const out = { concept: '', feature: '', confusion: '' };
  const str = String(s || '');
  const m = str.match(/【概念】([\s\S]*?)(【特征】|$)/); if (m) out.concept = m[1].trim();
  const f = str.match(/【特征】([\s\S]*?)(【易混淆】|$)/); if (f) out.feature = f[1].trim();
  const cf = str.match(/【易混淆】([\s\S]*)$/); if (cf) out.confusion = cf[1].trim();
  if (!out.concept && !out.feature && !out.confusion && str) out.concept = str.trim();
  return out;
}

exports.main = async (event) => {
  if (!ADMIN_PASSWORD) return { success: false, message: '未配置 ADMIN_PASSWORD 环境变量' };
  if (event.password !== ADMIN_PASSWORD) return { success: false, message: '管理密码错误' };
  try {
    const chapters = (await db.collection('chapters').limit(1000).get()).data;
    const lessons = (await db.collection('lessons').limit(1000).get()).data;
    const chapterQ = (await db.collection('chapterQuestions').limit(1000).get()).data;
    const examQ = (await db.collection('examQuestions').limit(1000).get()).data;
    const cqByLesson = {};
    chapterQ.forEach(d => { cqByLesson[d.lessonId] = d.questions || []; });
    const byChapter = {};
    lessons.forEach(l => { (byChapter[l.chapterId] = byChapter[l.chapterId] || []).push(l); });
    const courses = {};
    chapters.forEach(c => {
      const cid = c.courseId;
      (courses[cid] = courses[cid] || { courseId: cid, chapters: [] }).chapters.push({
        id: c._id, title: c.title, order: c.order,
        lessons: (byChapter[c._id] || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(l => ({
          id: l._id, title: l.title, order: l.order, content: splitContent(l.content),
          codeExample: l.codeExample || '', questions: l.questions || [], chapterQuestions: cqByLesson[l._id] || []
        }))
      });
    });
    Object.values(courses).forEach(c => c.chapters.sort((a, b) => (a.order || 0) - (b.order || 0)));
    const exams = examQ.map(d => ({ courseId: d.courseId, examType: d.examType, level: d.level, questions: d.questions || [] }));
    return { success: true, courses: Object.values(courses), exams };
  } catch (err) {
    return { success: false, message: String(err.message || err) };
  }
};
