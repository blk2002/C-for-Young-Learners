const test = require('node:test');
const assert = require('node:assert');
const lib = require('../../cloudfunctions/importContent/lib.js');

test('buildStructureOps 区分新增/更新/删除', () => {
  const payload = {
    courseId: 'python',
    chapters: [
      { key: 'c1', cloudId: 'ch-9', title: '第1章 改名', order: 1,
        lessons: [
          { key: 'l1', cloudId: 'ls-8', title: '1.1', order: 1,
            content: { concept: 'a', feature: 'b', confusion: 'c' }, codeExample: 'x=1', questions: [] },
          { key: 'l2', cloudId: null, title: '1.2 新增', order: 2,
            content: { concept: 'a', feature: 'b', confusion: 'c' }, codeExample: '', questions: [] }
        ] },
      { key: 'c2', cloudId: null, title: '第2章', order: 2, lessons: [] }
    ],
    deleteChapterIds: ['ch-7'], deleteLessonIds: ['ls-6']
  };
  const ops = lib.buildStructureOps(payload);
  assert.equal(ops.chapterAdds.length, 1);                       // c2
  assert.equal(ops.chapterUpdates.length, 1);                    // ch-9
  assert.equal(ops.chapterDeletes.length, 1);                    // ch-7
  assert.equal(ops.lessonAdds.length, 1);                        // l2（chapterKey 归 c1）
  assert.equal(ops.lessonAdds[0].chapterId, 'ch-9');
  assert.equal(ops.lessonUpdates.length, 1);                     // ls-8
  assert.equal(ops.lessonUpdates[0].data.content.startsWith('【概念】'), true);
});

test('buildQuestionOps 拒绝未入库知识点并分拣', () => {
  const payload = {
    courseId: 'python',
    learnUpdates: [ { lessonId: 'ls-8', questions: [{ type: 'fill', question: 'q', answer: 'a', explanation: '' }] } ],
    chapterUpserts: [ { lessonId: 'ls-8', questions: [] } ],
    examUpserts: [ { examType: 'GESP', level: '一级', questions: [] } ]
  };
  const ops = lib.buildQuestionOps(payload);
  assert.equal(ops.errors.length, 0);
  assert.equal(ops.learnUpdates.length, 1);
  const bad = { courseId: 'python', learnUpdates: [{ lessonId: null, questions: [] }], chapterUpserts: [], examUpserts: [] };
  assert.equal(lib.buildQuestionOps(bad).errors.length, 1);
});
