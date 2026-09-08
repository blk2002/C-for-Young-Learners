// 纯逻辑，不引入 wx-server-sdk；由 index.js require，也可被 node --test 直接测试。
function composeContent(c) {
  if (!c) return '';
  return [['【概念】', c.concept], ['【特征】', c.feature], ['【易混淆】', c.confusion]]
    .filter(p => p[1]).map(p => p[0] + p[1]).join('\n');
}
function splitContent(s) {
  const out = { concept: '', feature: '', confusion: '' };
  const str = String(s || '');
  const m = str.match(/【概念】([\s\S]*?)(【特征】|$)/); if (m) out.concept = m[1].trim();
  const f = str.match(/【特征】([\s\S]*?)(【易混淆】|$)/); if (f) out.feature = f[1].trim();
  const cf = str.match(/【易混淆】([\s\S]*)$/); if (cf) out.confusion = cf[1].trim();
  if (!out.concept && !out.feature && !out.confusion && str) out.concept = str.trim();
  return out;
}
// payload: { courseId, chapters:[{key,cloudId,title,order,lessons:[{key,cloudId,title,order,content,codeExample,questions}]}], deleteChapterIds, deleteLessonIds }
function buildStructureOps(payload) {
  const ops = { chapterAdds: [], chapterUpdates: [], chapterDeletes: payload.deleteChapterIds || [],
    lessonAdds: [], lessonUpdates: [], lessonDeletes: payload.deleteLessonIds || [] };
  (payload.chapters || []).forEach((ch, i) => {
    if (ch.cloudId) {
      ops.chapterUpdates.push({ id: ch.cloudId, data: { title: ch.title, order: ch.order || i + 1 } });
    } else {
      ops.chapterAdds.push({ key: ch.key, data: { courseId: payload.courseId, title: ch.title, order: ch.order || i + 1 } });
    }
  });
  // 新章节下 lessonAdds 的 chapterId 为 null，由 index.js 用新建章节返回的 _id 回填
  (payload.chapters || []).forEach(ch => (ch.lessons || []).forEach((ls, j) => {
    const chapterId = ch.cloudId || null;
    const data = { title: ls.title, order: ls.order || j + 1,
      content: composeContent(ls.content), codeExample: ls.codeExample || '', questions: ls.questions || [] };
    if (ls.cloudId) ops.lessonUpdates.push({ id: ls.cloudId, data });
    else ops.lessonAdds.push({ key: ls.key, chapterKey: ch.key, chapterId: chapterId || null, data });
  }));
  return ops;
}
// payload: { courseId, learnUpdates:[{lessonId,questions}], chapterUpserts:[{lessonId,questions}], examUpserts:[{examType,level,questions}] }
function buildQuestionOps(payload) {
  const ops = { learnUpdates: [], chapterUpserts: [], examUpserts: [], errors: [] };
  (payload.learnUpdates || []).forEach(u => {
    if (!u.lessonId) ops.errors.push('学习题挂载知识点未入库');
    else ops.learnUpdates.push(u);
  });
  (payload.chapterUpserts || []).forEach(u => {
    if (!u.lessonId) ops.errors.push('章节题挂载知识点未入库');
    else ops.chapterUpserts.push(u);
  });
  (payload.examUpserts || []).forEach(u => ops.examUpserts.push(u));
  return ops;
}
module.exports = { composeContent, splitContent, buildStructureOps, buildQuestionOps };
