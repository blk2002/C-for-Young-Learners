// cloudfunctions/initCourses/index.js - 初始化 Python / C++ 两门课的章节与知识点（测试内容）
// 每门课 2 章、每章 3 个知识点，练习题先留空，用于测试「章节 → 知识点 → 学习」链路。
// 用法：在微信开发者工具里右键该云函数 →「上传并部署：云端安装依赖」，
//      再到云开发控制台 → 云函数 → initCourses → 云端测试，传 { "confirm": true } 执行一次。
// 会先清掉 python / cpp 已有的章节（及其知识点）再重建，保证幂等、可重复执行。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ============ 课程内容定义 ============
// courseId 与 app.js globalData.courses 保持一致：python / cpp
const COURSES = {
  python: {
    name: 'Python',
    chapters: [
      {
        title: '认识 Python 与第一个程序',
        lessons: [
          {
            title: '什么是编程与 Python',
            content: `编程，就是告诉计算机一步一步做什么。我们用一种计算机能理解的语言，把解决问题的步骤写下来，计算机就会照着执行。

Python 是一种非常流行的编程语言，语法简单、容易阅读，特别适合初学者。很多网站、游戏和人工智能都用 Python 开发。

写 Python 程序就像写英文句子，一行一行地告诉计算机要做什么。`,
            codeExample: ''
          },
          {
            title: '第一个程序：Hello World',
            content: `几乎所有程序员的第一行代码，都是打印一句 Hello World。在 Python 中，用 print() 函数就能把文字显示到屏幕上。

print 是「打印、输出」的意思，括号里放你想显示的内容，文字要用英文引号包起来。`,
            codeExample: `print("Hello World")

# 运行后会输出：
# Hello World`
          },
          {
            title: '变量与赋值',
            content: `变量就像一个小盒子，用来存放数据。给变量起个名字，再用等号 = 把值放进盒子里，这就是「赋值」。

变量名可以用字母、数字和下划线，但不能以数字开头，也不能用 Python 的关键字。`,
            codeExample: `name = "小明"
age = 10
print(name)
print(age)`
          }
        ]
      },
      {
        title: '输入输出与基本运算',
        lessons: [
          {
            title: 'print() 输出',
            content: `print() 是最常用的输出函数，可以打印文字、数字，也可以一次打印多个内容，用逗号隔开。

print 还可以做字符串拼接，用加号 + 把两段文字连起来。`,
            codeExample: `print("你好")
print(1 + 1)
print("我有", 3, "支笔")
print("Hello" + " " + "World")`
          },
          {
            title: 'input() 输入',
            content: `input() 用来接收用户从键盘输入的内容，括号里可以写一句提示文字。

注意：input() 读进来的内容是字符串，如果要参与计算，需要用 int() 转成整数。`,
            codeExample: `name = input("你叫什么名字？")
print("你好，" + name)`
          },
          {
            title: '算术运算',
            content: `Python 可以做加减乘除等运算：加 + 、减 - 、乘 * 、除 / 、取余 % 、幂 **。

运算顺序和数学一样：先乘除后加减，括号优先。`,
            codeExample: `a = 7
b = 3
print(a + b)   # 10
print(a - b)   # 4
print(a * b)   # 21
print(a / b)   # 2.333...
print(a % b)   # 1
print(a ** b)  # 343`
          }
        ]
      }
    ]
  },

  cpp: {
    name: 'C++',
    chapters: [
      {
        title: '认识 C++ 与第一个程序',
        lessons: [
          {
            title: '什么是编程与 C++',
            content: `编程，就是告诉计算机一步一步做什么。C++ 是一种非常强大的编程语言，很多软件、游戏和信息学竞赛（如 CIE、CSP）都用它。

C++ 比 Python 更严谨，需要写清楚每个变量的类型，但运行速度更快。`,
            codeExample: ''
          },
          {
            title: '第一个程序：Hello World',
            content: `C++ 程序需要一些固定的「头」和「框架」。先用 #include <iostream> 引入输入输出工具，再用 using namespace std; 简化写法。

main 函数是程序开始执行的地方，cout 用来输出内容，endl 表示换行。`,
            codeExample: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`
          },
          {
            title: '变量与基本数据类型',
            content: `C++ 里的每个变量都要先声明类型再使用。常见类型有：int（整数）、double（小数）、char（字符）、bool（真假）。

给变量赋值用等号 =，变量名不能以数字开头。`,
            codeExample: `#include <iostream>
using namespace std;

int main() {
    int age = 10;
    double height = 1.45;
    char grade = 'A';
    cout << age << " " << height << " " << grade << endl;
    return 0;
}`
          }
        ]
      },
      {
        title: '输入输出与基本运算',
        lessons: [
          {
            title: 'cout 输出',
            content: `cout 是 C++ 的输出工具，用 << 把内容送出去。可以用多个 << 连接不同的内容。

endl 用来换行。`,
            codeExample: `#include <iostream>
using namespace std;

int main() {
    cout << "你好" << endl;
    cout << 1 + 1 << endl;
    cout << "我有 " << 3 << " 支笔" << endl;
    return 0;
}`
          },
          {
            title: 'cin 输入',
            content: `cin 用来接收用户从键盘输入的内容，用 >> 把输入送进变量里。

先声明变量，再用 cin >> 变量名，就能把输入存进去。`,
            codeExample: `#include <iostream>
using namespace std;

int main() {
    int age;
    cout << "你几岁了？" << endl;
    cin >> age;
    cout << "你 " << age << " 岁了" << endl;
    return 0;
}`
          },
          {
            title: '算术运算',
            content: `C++ 支持加 + 、减 - 、乘 * 、除 / 、取余 % 等运算。

两个整数相除 / 会得到整数（舍去小数），要得到小数需要用 double 类型。`,
            codeExample: `#include <iostream>
using namespace std;

int main() {
    int a = 7, b = 3;
    cout << a + b << endl;   // 10
    cout << a - b << endl;   // 4
    cout << a * b << endl;   // 21
    cout << a / b << endl;   // 2（整数除法）
    cout << a % b << endl;   // 1
    return 0;
}`
          }
        ]
      }
    ]
  }
};

// ============ 学科 registry seed ============
// 学科唯一真源是 courses 集合；内置学科也入库并标 builtin（不可删/不可改名由 manageCourses 校验）。
// 仅当缺失时补入（幂等），不会覆盖已有文档。
const BUILTIN_COURSE_SEED = [
  { _id: 'python', name: 'Python', icon: 'i-code', color: '#45B0E0', order: 1, builtin: true },
  { _id: 'cpp', name: 'C++', icon: 'i-chip', color: '#4E6EF2', order: 2, builtin: true }
];

async function seedCoursesRegistry() {
  const seeded = [];
  for (const c of BUILTIN_COURSE_SEED) {
    try {
      await db.collection('courses').doc(c._id).get();
      // 已存在则跳过，不动它
    } catch (e) {
      const { _id, ...data } = c;
      await db.collection('courses').doc(_id).set({ data: { ...data, createdAt: db.serverDate() } });
      seeded.push(c.name);
    }
  }
  return seeded;
}

exports.main = async (event, context) => {
  // 安全开关：必须显式传 confirm: true 才会执行（会清空并重建课程内容）
  if (!event || event.confirm !== true) {
    return {
      success: false,
      message: '这是会清空并重建课程内容的操作。请在云端测试时传入 { "confirm": true } 才会执行。'
    };
  }

  const stats = { chapters: 0, lessons: 0 };

  try {
    // 0. 先把内置学科补进 courses 集合（缺哪门补哪门）
    let seededCourses = [];
    try {
      seededCourses = await seedCoursesRegistry();
    } catch (e) {
      console.warn('seed courses 集合失败（可能集合未创建）', e);
    }

    for (const courseId of Object.keys(COURSES)) {
      const course = COURSES[courseId];

      // 1. 清掉该课程已有的章节（连同其下的知识点一起删，保证幂等）
      const existChapters = await db.collection('chapters')
        .where({ courseId })
        .limit(100)
        .get();

      for (const ch of existChapters.data || []) {
        const existLessons = await db.collection('lessons')
          .where({ chapterId: ch._id })
          .limit(100)
          .get();

        for (const ls of existLessons.data || []) {
          await db.collection('lessons').doc(ls._id).remove();
        }
        await db.collection('chapters').doc(ch._id).remove();
      }

      // 2. 重建章节与知识点
      for (let ci = 0; ci < course.chapters.length; ci++) {
        const ch = course.chapters[ci];
        const chRes = await db.collection('chapters').add({
          data: {
            courseId: courseId,
            title: ch.title,
            order: ci + 1,
            createdAt: db.serverDate()
          }
        });
        stats.chapters++;

        const chapterId = chRes._id;
        for (let li = 0; li < ch.lessons.length; li++) {
          const ls = ch.lessons[li];
          await db.collection('lessons').add({
            data: {
              chapterId: chapterId,
              title: ls.title,
              content: ls.content,
              codeExample: ls.codeExample || '',
              order: li + 1,
              questions: null
            }
          });
          stats.lessons++;
        }
      }
    }

    return {
      success: true,
      message: `已初始化 ${stats.chapters} 个章节、${stats.lessons} 个知识点`
        + (seededCourses.length ? `；courses 集合补入学科：${seededCourses.join('、')}` : ''),
      chapters: stats.chapters,
      lessons: stats.lessons
    };
  } catch (err) {
    console.error('初始化课程内容失败', err);
    return { success: false, message: '初始化失败：' + err.message };
  }
};
