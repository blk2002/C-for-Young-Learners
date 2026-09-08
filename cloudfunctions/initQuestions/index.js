// cloudfunctions/initQuestions/index.js - 初始化三套练习题
// 依赖：需先部署并执行 initCourses（章节/知识点已入库）。
// ① 学习页内嵌题：写入 lessons 文档的 questions 字段（每知识点 2 道）
// ② 章节知识点习题：写入 chapterQuestions 集合（每知识点 3 道）
// ③ 等级考试习题：写入 examQuestions 集合（CIE/GESP 各一级，CSP-J 入门级仅 C++，每级 5 道）
// 用法：右键「上传并部署：云端安装依赖」→ 云端测试传 { "confirm": true } 执行一次。幂等可重复执行。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 题目构造辅助
function choice(question, options, answer, explanation) {
  return { type: 'choice', question, options, answer, explanation };
}
function fill(question, answer, explanation) {
  return { type: 'fill', question, answer, explanation };
}

// ============ 题目内容（按 课程 → 章节 → 知识点 顺序，与 initCourses 建立的顺序一一对应） ============
const DATA = {
  python: {
    chapters: [
      { // 第1章 认识 Python 与第一个程序
        lessons: [
          { // 1.1 什么是编程与 Python
            study: [
              choice('下面哪个说法最能说明「编程」是什么？',
                { A: '用电脑玩游戏', B: '用计算机能理解的语言写出解决问题的步骤，让计算机执行', C: '给电脑充电', D: '上网查资料' },
                'B', '编程就是把解决问题的步骤写成计算机能看懂的指令，让它照着执行。'),
              choice('关于 Python 语言，下面哪个说法正确？',
                { A: '语法复杂难懂', B: '语法简单、容易阅读，适合初学者', C: '只能用来做游戏', D: '不能做人工智能' },
                'B', 'Python 语法简洁易读，网站、游戏、人工智能等领域都能用。')
            ],
            practice: [
              choice('计算机「执行程序」的意思是？',
                { A: '把程序打印出来', B: '按照程序里写好的指令一步一步运行', C: '把程序删掉', D: '把程序翻译成英文' },
                'B', '执行程序就是让计算机按指令顺序运行。'),
              choice('下面哪个是正确的 Python 程序文件后缀？',
                { A: '.txt', B: '.py', C: '.exe', D: '.doc' },
                'B', 'Python 程序文件一般以 .py 结尾。'),
              fill('Python 程序的源文件后缀是____（英文句点加两个字母）。', '.py', 'Python 源文件后缀是 .py。')
            ]
          },
          { // 1.2 第一个程序：Hello World
            study: [
              choice('在 Python 中，要把文字显示到屏幕上，用哪个函数？',
                { A: 'input()', B: 'print()', C: 'output()', D: 'show()' },
                'B', 'print() 是 Python 的输出函数。'),
              fill('运行 print("Hello World") 后，屏幕上显示的内容是____。', 'Hello World', 'print 会输出引号内的文字 Hello World。')
            ],
            practice: [
              choice('运行 print("Hi") 会输出什么？',
                { A: 'Hi（带引号）', B: 'Hi（不带引号）', C: 'print("Hi")', D: '报错' },
                'B', 'print 输出引号里的内容，引号本身不会显示。'),
              fill('想让程序输出 I love Python，应写 print(____)。', '"I love Python"', '文字要用英文引号包起来。'),
              choice('下面哪行代码是正确的 Python 输出语句？',
                { A: 'print(你好)', B: 'print("你好")', C: 'print 你好', D: 'print["你好"]' },
                'B', '文字要用引号包起来，函数用圆括号。')
            ]
          },
          { // 1.3 变量与赋值
            study: [
              choice('下面哪个是合法的 Python 变量名？',
                { A: '2name', B: 'my-name', C: 'name2', D: 'class' },
                'C', '变量不能以数字开头、不能有连字符，也不能用关键字 class。'),
              fill('执行 x = 5 后，x 的值是____。', '5', '等号把 5 赋值给了变量 x。')
            ],
            practice: [
              choice('执行 name = "小明"，再 name = "小红"，此时 name 的值是？',
                { A: '小明', B: '小红', C: '小明小红', D: '空' },
                'B', '变量重新赋值后，新值会覆盖旧值。'),
              fill('执行 x = 5，再 x = x + 3，最后 x 的值是____。', '8', '5 + 3 = 8。'),
              choice('下面哪个变量名不合法？',
                { A: 'age', B: 'my_age', C: '3age', D: 'Age' },
                'C', '变量名不能以数字开头。')
            ]
          }
        ]
      },
      { // 第2章 输入输出与基本运算
        lessons: [
          { // 2.1 print() 输出
            study: [
              choice('运行 print(1 + 1) 输出什么？',
                { A: '1 + 1', B: '11', C: '2', D: '报错' },
                'C', 'print 会先算出 1+1 的结果 2，再输出。'),
              choice('运行 print("1" + "2") 输出什么？',
                { A: '3', B: '12', C: '1 + 2', D: '报错' },
                'B', '两个字符串用 + 是拼接，得到 "12"。')
            ],
            practice: [
              fill('运行 print("3", "个", "苹果") 会输出____。', '3 个 苹果', '多个内容用逗号隔开，输出时自动用空格分隔。'),
              fill('运行 print("Hello" + " " + "World") 输出____。', 'Hello World', '字符串拼接后是 Hello World。'),
              choice('关于 print() 的说法，正确的是？',
                { A: '只能输出数字', B: '可以输出文字、数字，也能一次输出多个内容', C: '括号里不能写算式', D: '一次只能输出一个内容' },
                'B', 'print 很灵活，文字、数字、算式、多内容都行。')
            ]
          },
          { // 2.2 input() 输入
            study: [
              choice('接收用户从键盘输入的内容，用哪个函数？',
                { A: 'print()', B: 'input()', C: 'scan()', D: 'read()' },
                'B', 'input() 用来接收键盘输入。'),
              choice('input("请输入你的名字：") 括号里的文字起什么作用？',
                { A: '是显示给用户的提示语', B: '是输入的默认值', C: '没有作用', D: '是变量名' },
                'A', '括号里的文字是提示语，输入前显示给用户看。')
            ],
            practice: [
              fill('运行 name = input()，用户输入「小明」，则 name 的值是____。', '小明', 'input 把用户输入的内容存进变量 name。'),
              choice('关于 input() 的说法，正确的是？',
                { A: '读进来的内容都是字符串', B: '读进来的是数字', C: '不能写提示语', D: '会输出文字' },
                'A', 'input 读入的内容一律是字符串。'),
              fill('想把 input() 读进来的内容转成整数，用____() 函数。', 'int', 'int() 可以把字符串转成整数。')
            ]
          },
          { // 2.3 算术运算
            study: [
              choice('表达式 7 % 3 的值是？',
                { A: '2', B: '1', C: '0', D: '3' },
                'B', '% 是取余，7 除以 3 余 1。'),
              fill('表达式 2 ** 3 的值是____。', '8', '** 是幂运算，2 的 3 次方等于 8。')
            ],
            practice: [
              choice('下面哪个算式的结果是 10？',
                { A: '5 * 3', B: '5 + 5', C: '20 / 4', D: '2 ** 4' },
                'B', '5+5=10；其余分别是 15、5.0、16。'),
              fill('表达式 5 // 2 的值是____（整数除法）。', '2', '// 是整数除法，5 除以 2 向下取整得 2。'),
              choice('表达式 3 + 4 * 2 的值是？',
                { A: '14', B: '11', C: '10', D: '24' },
                'B', '先乘除后加减：4*2=8，再加 3 得 11。')
            ]
          }
        ]
      }
    ],
    exams: [
      { examType: 'CIE', level: '一级', questions: [
        choice('Python 中 print() 的作用是？',
          { A: '输入', B: '输出', C: '赋值', D: '循环' },
          'B', 'print() 用于输出内容。'),
        choice('下面哪个是正确的 Python 变量名？',
          { A: '123abc', B: 'abc_123', C: 'a-b-c', D: 'for' },
          'B', '变量名不能以数字开头、不能有连字符、不能用关键字 for。'),
        fill('运行 print(2 + 3 * 4) 输出____。', '14', '先算 3*4=12，再加 2 得 14。'),
        choice('input() 读入的数据默认是什么类型？',
          { A: '整数', B: '小数', C: '字符串', D: '布尔值' },
          'C', 'input 读入的内容一律是字符串。'),
        fill('运行 x = 10，再 x = x - 4，print(x) 输出____。', '6', '10 - 4 = 6。')
      ]},
      { examType: 'GESP', level: '一级', questions: [
        choice('下列输出语句正确的是？',
          { A: 'print("你好")', B: 'print 你好', C: 'print(你好)', D: 'print["你好"]' },
          'A', '输出文字要用引号包起来并用圆括号。'),
        fill('表达式 3 ** 2 的值是____。', '9', '3 的 2 次方等于 9。'),
        choice('表达式 10 % 3 的值是？',
          { A: '3', B: '1', C: '0', D: '10' },
          'B', '10 除以 3 余 1。'),
        choice('想让程序接收用户输入，用哪个函数？',
          { A: 'print()', B: 'input()', C: 'len()', D: 'type()' },
          'B', 'input() 用于接收输入。'),
        fill('运行 print("3" + "5") 输出____。', '35', '两个字符串相加是拼接，得到 "35"。')
      ]}
    ]
  },

  cpp: {
    chapters: [
      { // 第1章 认识 C++ 与第一个程序
        lessons: [
          { // 1.1 什么是编程与 C++
            study: [
              choice('关于 C++ 的说法，正确的是？',
                { A: '运行速度慢', B: '需要写清楚变量类型，运行速度快', C: '只能做游戏', D: '和 Python 语法完全相同' },
                'B', 'C++ 是强类型语言，需要声明变量类型，但运行速度快。'),
              choice('下列哪项是 C++ 的典型应用场景？',
                { A: '信息学竞赛（如 CSP）', B: '只能做网页', C: '只能做表格', D: '只能画画' },
                'A', 'CSP、NOI 等信息学竞赛主要使用 C++。')
            ],
            practice: [
              choice('与 Python 相比，C++ 的一个明显特点是？',
                { A: '不用声明变量类型', B: '需要声明变量类型', C: '不能算数', D: '不能输出文字' },
                'B', 'C++ 是强类型语言，变量必须先声明类型再使用。'),
              fill('C++ 源程序文件的后缀通常是____。', '.cpp', 'C++ 源文件后缀是 .cpp。'),
              choice('一个 C++ 程序从哪里开始执行？',
                { A: 'main 函数', B: '最后一行', C: '第一行注释', D: '任意位置' },
                'A', '程序从 main 函数开始执行。')
            ]
          },
          { // 1.2 第一个程序：Hello World
            study: [
              choice('C++ 中用来输出内容的工具是？',
                { A: 'print', B: 'cout', C: 'output', D: 'printf' },
                'B', 'cout 是 C++ 的标准输出工具。'),
              fill('执行 cout << "Hello" << endl; 会输出____。', 'Hello', 'cout 输出引号里的文字 Hello。')
            ],
            practice: [
              choice('引入输入输出工具的头文件是？',
                { A: '#include <iostream>', B: '#include <string>', C: '#include <stdio>', D: 'import io' },
                'A', '用 #include <iostream> 引入输入输出工具。'),
              fill('C++ 中表示换行的关键字是____。', 'endl', 'endl 表示换行。'),
              choice('每个完整的 C++ 程序都必须有哪个函数？',
                { A: 'start()', B: 'main()', C: 'run()', D: 'begin()' },
                'B', 'main 函数是程序的入口，必须要有。')
            ]
          },
          { // 1.3 变量与基本数据类型
            study: [
              choice('C++ 中用来存整数的类型是？',
                { A: 'int', B: 'double', C: 'char', D: 'string' },
                'A', 'int 用于存整数。'),
              fill('C++ 中存小数用____类型。', 'double', 'double 用于存小数（浮点数）。')
            ],
            practice: [
              choice('存一个字符（如 \'A\'）用哪个类型？',
                { A: 'int', B: 'double', C: 'char', D: 'bool' },
                'C', 'char 用于存单个字符。'),
              choice('下面哪个变量声明是正确的？',
                { A: 'int 3age;', B: 'int age;', C: 'int my-age;', D: 'int class;' },
                'B', '变量名不能以数字开头、不能有连字符，class 是关键字。'),
              fill('bool 类型只能存 true 或____。', 'false', 'bool 类型只有 true 和 false 两个值。')
            ]
          }
        ]
      },
      { // 第2章 输入输出与基本运算
        lessons: [
          { // 2.1 cout 输出
            study: [
              choice('执行 cout << 1 + 1 << endl; 输出什么？',
                { A: '1 + 1', B: '11', C: '2', D: '报错' },
                'C', 'cout 先算出 1+1 的结果 2 再输出。'),
              fill('执行 cout << "你好"; 会输出____。', '你好', 'cout 输出引号里的文字。')
            ],
            practice: [
              choice('把内容送给 cout 输出，用什么符号？',
                { A: '<<', B: '>>', C: '==', D: '=' },
                'A', 'cout 用 << 输出，cin 用 >> 输入。'),
              choice('下面哪个输出语句正确？',
                { A: 'cout << 你好;', B: 'cout << "你好";', C: 'cout >> "你好";', D: 'cout < 你好;' },
                'B', '输出文字要加双引号，方向用 <<。'),
              fill('执行 cout << "a" << "b" << endl; 会输出____。', 'ab', '两个内容连续输出，得到 ab。')
            ]
          },
          { // 2.2 cin 输入
            study: [
              choice('C++ 中接收键盘输入用哪个？',
                { A: 'cout', B: 'cin', C: 'input', D: 'scan' },
                'B', 'cin 是 C++ 的标准输入工具。'),
              choice('把输入送进变量，用什么符号？',
                { A: '<<', B: '>>', C: '==', D: '=' },
                'B', 'cin 用 >> 把输入送进变量。')
            ],
            practice: [
              choice('下面哪段代码能正确读入一个整数到变量 age？',
                { A: 'int age; cin >> age;', B: 'cin >> age; int age;', C: 'int age; cin << age;', D: 'int age; cout >> age;' },
                'A', '先声明 int age，再用 cin >> age 读入，方向是 >>。'),
              fill('运行 int n; cin >> n; 用户输入 6，则 n 的值是____。', '6', 'cin 把输入 6 存进变量 n。'),
              choice('cin 和 cout 的方向，正确的是？',
                { A: 'cout 用 << 输出，cin 用 >> 输入', B: 'cout 用 >> 输出，cin 用 << 输入', C: '都用 <<', D: '都用 >>' },
                'A', 'cout 用 << 输出，cin 用 >> 输入，方向相反。')
            ]
          },
          { // 2.3 算术运算
            study: [
              choice('C++ 中 7 / 2（两个整数相除）的结果是？',
                { A: '3.5', B: '3', C: '2', D: '4' },
                'B', '整数除法舍去小数部分，7/2 得 3。'),
              fill('表达式 7 % 3 的值是____。', '1', '7 除以 3 余 1。')
            ],
            practice: [
              choice('两个整数相除，想得到小数结果，应该？',
                { A: '用 double 类型', B: '用 int 类型', C: '不能算', D: '用 char 类型' },
                'A', '用 double 类型相除才能保留小数。'),
              fill('表达式 5 * 2 + 3 的值是____。', '13', '先算 5*2=10，再加 3 得 13。'),
              choice('下面哪个算式结果是 1？',
                { A: '7 % 3', B: '7 / 3', C: '7 - 3', D: '7 + 3' },
                'A', '7%3=1；其余分别是 2、4、10。')
            ]
          }
        ]
      }
    ],
    exams: [
      { examType: 'CIE', level: '一级', questions: [
        choice('C++ 中输出用哪个？',
          { A: 'cout', B: 'cin', C: 'print', D: 'echo' },
          'A', 'cout 用于输出。'),
        choice('存整数用哪个类型？',
          { A: 'int', B: 'double', C: 'char', D: 'bool' },
          'A', 'int 用于存整数。'),
        fill('表达式 7 % 2 的值是____。', '1', '7 除以 2 余 1。'),
        choice('每个 C++ 程序的入口函数是？',
          { A: 'main', B: 'start', C: 'run', D: 'begin' },
          'A', '程序从 main 函数开始执行。'),
        fill('执行 cout << 5 + 5 << endl; 输出____。', '10', '5+5=10。')
      ]},
      { examType: 'GESP', level: '一级', questions: [
        choice('引入输入输出的头文件是？',
          { A: '#include <iostream>', B: '#include <math>', C: '#include <string.h>', D: 'import io' },
          'A', '用 #include <iostream> 引入输入输出。'),
        choice('cin 的作用是？',
          { A: '输出', B: '输入', C: '赋值', D: '换行' },
          'B', 'cin 用于输入。'),
        fill('int x = 5; 再 x = x * 2; 之后 x 的值是____。', '10', '5 * 2 = 10。'),
        choice('C++ 中表示换行的是？',
          { A: 'endl', B: 'end', C: 'enter', D: 'newline' },
          'A', 'endl 表示换行。'),
        fill('表达式 5 + 2 * 3 的值是____。', '11', '先算 2*3=6，再加 5 得 11。')
      ]},
      { examType: 'CSP-JS', level: 'CSP-J（入门级）', questions: [
        choice('下列变量名合法的是？',
          { A: '_count', B: '2count', C: 'count-1', D: 'int' },
          'A', '下划线开头合法；不能以数字开头、不能有连字符，int 是关键字。'),
        choice('表达式 8 / 3（整数除法）的值是？',
          { A: '2', B: '2.666', C: '3', D: '8' },
          'A', '整数除法舍去小数，8/3 得 2。'),
        fill('表达式 8 % 3 的值是____。', '2', '8 除以 3 余 2。'),
        choice('下面哪个语句正确输出变量 x 的值？',
          { A: 'cout << x << endl;', B: 'cout >> x;', C: 'cin << x;', D: 'print(x)' },
          'A', '用 cout << x 输出变量值。'),
        fill('int a = 3, b = 4; cout << a * b; 输出____。', '12', '3 * 4 = 12。')
      ]}
    ]
  }
};

// 章节知识点习题 upsert（与 chapterQuestions 云函数 saveQuestions 逻辑一致）
async function upsertChapterQuestions(courseId, chapterId, lessonId, questions) {
  const existing = await db.collection('chapterQuestions').where({
    courseId, chapterId, lessonId
  }).get();
  if (existing.data && existing.data.length > 0) {
    await db.collection('chapterQuestions').doc(existing.data[0]._id).update({
      data: { questions, updatedAt: db.serverDate() }
    });
  } else {
    await db.collection('chapterQuestions').add({
      data: {
        courseId, chapterId, lessonId, questions,
        createdAt: db.serverDate(), updatedAt: db.serverDate()
      }
    });
  }
}

// 等级考试习题 upsert（与 examQuestions 云函数 saveQuestions 逻辑一致）
async function upsertExamQuestions(courseId, examType, level, questions) {
  const existing = await db.collection('examQuestions').where({
    courseId, examType, level
  }).get();
  if (existing.data && existing.data.length > 0) {
    await db.collection('examQuestions').doc(existing.data[0]._id).update({
      data: { questions, updatedAt: db.serverDate() }
    });
  } else {
    await db.collection('examQuestions').add({
      data: {
        courseId, examType, level, questions,
        createdAt: db.serverDate(), updatedAt: db.serverDate()
      }
    });
  }
}

exports.main = async (event, context) => {
  if (!event || event.confirm !== true) {
    return {
      success: false,
      message: '这是会写入/覆盖练习题的操作。请在云端测试时传入 { "confirm": true } 才会执行。'
    };
  }

  const stats = { studyQuestions: 0, practiceQuestions: 0, examQuestions: 0, lessonsMatched: 0 };

  try {
    for (const courseId of Object.keys(DATA)) {
      const chaptersRes = await db.collection('chapters')
        .where({ courseId })
        .orderBy('order', 'asc')
        .get();
      const chapters = chaptersRes.data || [];

      if (chapters.length === 0) {
        return {
          success: false,
          message: `课程 ${courseId} 还没有章节，请先部署并执行 initCourses 云函数。`
        };
      }

      const course = DATA[courseId];

      // ① ② 学习页内嵌题 + 章节知识点习题
      for (let ci = 0; ci < course.chapters.length; ci++) {
        const chapter = chapters[ci];
        if (!chapter) continue;

        const lessonsRes = await db.collection('lessons')
          .where({ chapterId: chapter._id })
          .orderBy('order', 'asc')
          .get();
        const lessons = lessonsRes.data || [];

        const lessonDefs = course.chapters[ci].lessons;
        for (let li = 0; li < lessonDefs.length; li++) {
          const lesson = lessons[li];
          if (!lesson) continue;
          const def = lessonDefs[li];

          // ① 学习页内嵌题 → 更新 lessons.questions
          if (def.study && def.study.length > 0) {
            await db.collection('lessons').doc(lesson._id).update({
              data: { questions: def.study }
            });
            stats.studyQuestions += def.study.length;
          }

          // ② 章节知识点习题 → chapterQuestions
          if (def.practice && def.practice.length > 0) {
            await upsertChapterQuestions(courseId, chapter._id, lesson._id, def.practice);
            stats.practiceQuestions += def.practice.length;
          }

          stats.lessonsMatched++;
        }
      }

      // ③ 等级考试习题 → examQuestions
      for (const ex of course.exams) {
        if (ex.questions && ex.questions.length > 0) {
          await upsertExamQuestions(courseId, ex.examType, ex.level, ex.questions);
          stats.examQuestions += ex.questions.length;
        }
      }
    }

    return {
      success: true,
      message: `练习题初始化完成：学习页 ${stats.studyQuestions} 道、章节知识点 ${stats.practiceQuestions} 道、等级考试 ${stats.examQuestions} 道`,
      matchedLessons: stats.lessonsMatched,
      ...stats
    };
  } catch (err) {
    console.error('初始化练习题失败', err);
    return { success: false, message: '初始化失败：' + err.message };
  }
};
