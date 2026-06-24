# 📚 少儿编程课程小程序

一个面向中小学生的微信小程序，用于学习 Python 和 C++ 编程课程。

## 🎯 项目功能

### 学生端功能

- 👤 学生注册（需老师审核通过）与登录
- 📚 浏览课程章节
- 📖 查看知识点详情（文字讲解 + 代码示例）
- ✏️ 做知识点练习题（选择题/填空题），自行核对答案
- 📝 习题功能：章节知识点习题 + 等级考试习题，含完成进度追踪
- ❌ 错题本功能：章节知识点错题 + 等级考试错题，支持逐题移除和批量移除
- 📊 查看学习进度
- ❤️ 收藏喜欢的知识点
- 🎨 个人资料设置（头像、昵称、个性签名）

### 老师端功能

- 👥 审核学生注册申请（通过/拒绝）
- 📚 管理课程章节（新增/编辑/删除）
- 📝 管理知识点（新增/编辑/删除）
- 🔢 为知识点添加练习题
- 📋 习题管理：章节知识点习题（新增/编辑/删除选择题和填空题）
- 🏆 习题管理：等级考试习题（CIE / GESP / CSP-J/S，分级管理）

## 📁 项目结构

```
c_young_learn/
├── app.js                    # 小程序入口
├── app.json                  # 小程序全局配置
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置
├── sitemap.json              # 索引配置
├── utils/
│   └── db.js                # 数据库操作工具
├── pages/
│   ├── login/               # 登录/注册页
│   ├── index/               # 首页（课程入口）
│   ├── chapters/            # 章节列表页
│   ├── lesson/              # 知识点详情页
│   ├── profile/             # 个人中心页
│   ├── profile-edit/        # 编辑资料页
│   ├── progress/            # 习题页（TabBar）
│   ├── favorites/           # 错题页（TabBar）
│   ├── study-progress/      # 学习进度页
│   ├── my-favorites/        # 我的收藏页
│   ├── chapter-exercises/   # 学生端-章节习题列表（含进度）
│   ├── lesson-exercises/    # 学生端-知识点习题列表（含完成状态）
│   ├── exercise-practice/   # 学生端-习题练习页
│   ├── chapter-wrong/       # 学生端-章节知识点错题章节列表
│   ├── wrong-lesson/        # 学生端-章节知识点错题知识点列表
│   ├── wrong-practice/      # 学生端-错题练习页（章节/考试复用）
│   ├── exam-exercises/      # 学生端-等级考试类型选择
│   ├── exam-levels/         # 学生端-等级考试等级列表
│   ├── exam-practice/       # 学生端-等级考试练习页
│   ├── exam-wrong/          # 学生端-等级考试错题类型选择
│   ├── exam-wrong-levels/   # 学生端-等级考试错题等级列表
│   ├── admin/               # 管理后台（学生审核/课程管理/习题管理）
│   ├── admin-edit/          # 内容编辑页（章节/知识点）
│   ├── admin-exercises/     # 习题管理-章节列表
│   ├── admin-lessons/       # 习题管理-知识点列表
│   ├── admin-exercise-edit/ # 习题管理-题目编辑
│   ├── admin-exam-type/     # 等级考试类型管理
│   ├── admin-exam-levels/   # 等级考试等级管理
│   └── admin-exam-edit/     # 等级考试题目编辑
└── cloudfunctions/          # 云函数目录
    ├── userRegister/        # 学生注册
    ├── userLogin/           # 学生登录
    ├── getPendingUsers/     # 获取待审核学生
    ├── reviewUser/          # 审核学生
    ├── updateProgress/      # 更新学习进度
    ├── getFavorites/        # 获取收藏列表
    ├── toggleFavorite/      # 切换收藏状态
    ├── updateUserProfile/   # 更新用户资料
    ├── chapterQuestions/    # 章节知识点习题
    ├── examQuestions/       # 等级考试习题
    └── wrongQuestions/      # 错题本 + 练习进度
```

## 🚀 部署步骤

### 第一步：准备微信小程序账号

1. 访问 https://mp.weixin.qq.com 注册小程序
2. 记录下你的 **AppID**

### 第二步：开通云开发

1. 在微信开发者工具中打开本项目
2. 点击左上角 **"云开发"** 按钮
3. 点击 **"开通"**，创建一个云环境
4. 记录下 **云环境 ID**

### 第三步：配置项目

1. 请复制 project.config.template.js 并重命名为 project.config.js，填入AppID。
2. 请复制 env.template.js 并重命名为 env.local.js，填入你的云环境ID。

### 第四步：创建数据库集合

在云开发控制台 → 数据库 → 点击 **"+"** 添加以下集合：

| 集合名称           | 说明                                     |
| ------------------ | ---------------------------------------- |
| users              | 用户信息（含账号、密码、角色、审核状态） |
| chapters           | 课程章节                                 |
| lessons            | 知识点内容                               |
| progress           | 学习进度记录                             |
| favorites          | 用户收藏记录                             |
| chapterQuestions   | 章节知识点习题                           |
| examQuestions      | 等级考试习题                             |
| wrongQuestions     | 错题本记录                               |
| exerciseProgress   | 章节知识点习题练习进度                    |

### 第五步：设置数据库权限

对每个集合，点击 **"权限设置"**，选择 **"所有用户可读，仅创建者可读写"** 或根据需要设置自定义权限。

### 第六步：创建老师账号

需要在 `users` 集合中手动添加一条老师记录：

在云开发控制台 → 数据库 → users → 添加记录：

```
字段：
  username:  admin        (字符串)
  password:  admin123     (字符串，先暂时这样写)
  role:      admin        (字符串)
  status:    approved     (字符串)
  createdAt: 手动选一个日期
```

⚠️ **注意**：由于云函数使用简单的哈希算法处理密码，为确保登录成功，建议先注册一个普通学生账号，然后在数据库中将该学生的 `role` 改为 `admin`，`status` 改为 `approved`。

### 第七步：上传并部署云函数

1. 在微信开发者工具左侧 **"云函数"** 目录
2. 右键每个云函数 → 选择 **"在终端中打开"**
3. 执行 `npm install` 安装依赖
4. 右键每个云函数 → **"上传并部署：云端安装依赖"**
5. 等待所有云函数部署完成

### 第八步：测试

1. 点击开发者工具的 **"编译"** 按钮
2. 使用老师账号登录
3. 添加一些课程章节和知识点
4. 在习题管理中添加章节习题和等级考试习题
5. 注册一个普通学生账号测试审核流程
6. 使用学生账号登录，浏览课程、做题、收藏、做习题

## 📝 数据结构说明

### 章节 (chapters)

| 字段      | 类型   | 说明                      |
| --------- | ------ | ------------------------- |
| _id       | string | 系统自动生成的ID          |
| courseId  | string | 课程ID：'python' 或 'cpp' |
| title     | string | 章节标题                  |
| order     | number | 排序序号（数字小的靠前）  |
| createdAt | number | 创建时间戳                |

### 知识点 (lessons)

| 字段        | 类型   | 说明                   |
| ----------- | ------ | ---------------------- |
| _id         | string | 系统自动生成的ID       |
| chapterId   | string | 所属章节的ID           |
| title       | string | 知识点标题             |
| content     | string | 文字讲解内容           |
| codeExample | string | 代码示例               |
| order       | number | 排序序号               |
| questions   | array  | 练习题数组（JSON格式） |

### 练习题 (questions 字段格式)

题目使用 JSON 数组格式存储，支持选择题和填空题：

```json
[
  {
    "type": "choice",
    "question": "Python 是什么类型的编程语言？",
    "options": {
      "A": "编译型",
      "B": "解释型",
      "C": "机器语言",
      "D": "汇编语言"
    },
    "answer": "B",
    "explanation": "Python 是解释型语言，代码在运行时逐行解释执行。"
  },
  {
    "type": "fill",
    "question": "在 Python 中，使用____关键字来定义函数。",
    "answer": "def",
    "explanation": "def 是 define 的缩写，用于定义函数。"
  }
]
```

### 用户 (users)

| 字段        | 类型   | 说明                                                         |
| ----------- | ------ | ------------------------------------------------------------ |
| _id         | string | 系统自动生成的ID                                             |
| username    | string | 登录用户名（学生姓名）                                       |
| password    | string | 经过简单哈希处理的密码                                       |
| nickname    | string | 昵称（可选）                                                 |
| avatar      | string | 头像云存储路径（可选）                                       |
| signature   | string | 个性签名（可选）                                             |
| role        | string | 角色：'admin' 或 'user'                                      |
| status      | string | 审核状态：'pending'(待审核) / 'approved'(已通过) / 'rejected'(已拒绝) |
| createdAt   | date   | 创建时间                                                     |
| updatedAt   | date   | 最后更新时间                                                 |

### 学习进度 (progress)

| 字段      | 类型   | 说明             |
| --------- | ------ | ---------------- |
| _id       | string | 系统自动生成的ID |
| userId    | string | 用户ID           |
| courseId  | string | 课程ID           |
| chapterId | string | 当前所在章节ID   |
| lessonId  | string | 当前所在知识点ID |
| updatedAt | date   | 最后更新时间     |

### 收藏 (favorites)

| 字段      | 类型   | 说明             |
| --------- | ------ | ---------------- |
| _id       | string | 系统自动生成的ID |
| userId    | string | 用户ID           |
| lessonId  | string | 收藏的知识点ID   |
| createdAt | date   | 收藏时间         |

### 章节知识点习题 (chapterQuestions)

| 字段       | 类型   | 说明                     |
| ---------- | ------ | ------------------------ |
| _id        | string | 系统自动生成的ID         |
| courseId   | string | 课程ID                   |
| chapterId  | string | 章节ID                   |
| lessonId   | string | 知识点ID                 |
| questions  | array  | 题目数组（选择题/填空题）|
| updatedAt  | date   | 最后更新时间             |

### 等级考试习题 (examQuestions)

| 字段       | 类型   | 说明                     |
| ---------- | ------ | ------------------------ |
| _id        | string | 系统自动生成的ID         |
| courseId   | string | 课程ID                   |
| examType   | string | 考试类型：CIE / GESP / CSP-JS |
| level      | string | 等级名称（一级~十级、CSP-J/S入门/提高等） |
| questions  | array  | 题目数组（选择题/填空题）|
| updatedAt  | date   | 最后更新时间             |

### 错题本 (wrongQuestions)

| 字段        | 类型    | 说明                                     |
| ----------- | ------- | ---------------------------------------- |
| _id         | string  | 系统自动生成的ID                          |
| userId      | string  | 用户ID                                    |
| courseId    | string  | 课程ID                                    |
| chapterId   | string  | 章节ID（章节错题时有值）                  |
| lessonId    | string  | 知识点ID（章节错题时有值）                |
| examType    | string  | 考试类型（考试错题时有值）                |
| level       | string  | 等级名称（考试错题时有值）                |
| questionKey | string  | 题目唯一标识（JSON序列化的题目关键字段）  |
| question    | object  | 题目详情（含type/question/options/answer等）|
| wrongCount  | number  | 做错次数                                    |
| firstWrongAt| date    | 首次做错时间                                |
| lastWrongAt | date    | 最近做错时间                                |
| mastered    | boolean | 是否已掌握（true则移出错题本）              |
| createdAt   | date    | 创建时间                                    |
| updatedAt   | date    | 最后更新时间                                |

### 练习进度 (exerciseProgress)

用于追踪学生章节知识点习题的完成情况，每个学生每知识点仅保留一条记录（Upsert模式，保留历史最佳成绩）。

| 字段          | 类型   | 说明                     |
| ------------- | ------ | ------------------------ |
| _id           | string | 系统自动生成的ID          |
| userId        | string | 用户ID                    |
| courseId      | string | 课程ID                    |
| chapterId     | string | 章节ID                    |
| lessonId      | string | 知识点ID                  |
| totalQuestions| number | 该知识点习题总数          |
| correctCount  | number | 最佳正确题数              |
| attemptCount  | number | 练习次数                  |
| lastAttemptAt | date   | 最近练习时间              |
| createdAt     | date   | 创建时间                  |
| updatedAt     | date   | 最后更新时间              |

## 💡 使用说明

### 老师操作流程

1. 登录老师账号
2. 进入「我的」页面 → 点击「内容管理」
3. 审核新注册学生（在「学生审核」标签页）
4. 在「课程管理」标签页，选择课程 → 添加章节 → 在章节中添加知识点
5. 在「习题管理」标签页，选择课程：
   - 章节知识点习题：按章节 → 知识点层级管理题目
   - 等级考试习题：按考试类型（CIE/GESP/CSP-J/S）→ 等级层级管理题目

### 学生做题流程

#### 章节知识点习题（习题 Tab → 章节知识点习题卡片）

```
章节列表（显示题目总数和已完成题数/进度条）
  └── 知识点列表（显示题目数 + 完成状态：未开始/练习中/已完成）
        └── 习题练习页 → 提交后自动保存进度和错题
```

#### 等级考试习题（习题 Tab → 等级考试习题卡片）

```
考试类型选择（CIE / GESP / CSP-J/S）
  └── 等级列表（显示各等级题目数）
        └── 等级考试练习页 → 提交后自动保存错题
```

#### 错题本（错题 Tab）

```
错题入口
  ├── 章节知识点错题
  │     └── 有错题的章节列表
  │           └── 有错题的知识点列表
  │                 └── 错题练习页（逐题练习，支持单独移除和全部移除）
  └── 等级考试错题
        └── 有错题的考试类型（CIE / GESP / CSP-J/S）
              └── 有错题的等级列表
                    └── 错题练习页（逐题练习，支持单独移除和全部移除）
```

### 等级考试说明

| 课程   | CIE 等级 | GESP 等级 | CSP-J/S |
|--------|----------|-----------|---------|
| Python | 1-6级    | 1-8级     | -       |
| C++    | 1-10级   | 1-8级     | 入门级/提高级 |

### 添加内容建议

- **章节**：按课程结构组织，如 Python 可分为：「变量与数据类型」「控制流」「函数」「列表与字典」「文件操作」等
- **知识点**：每个章节下包含多个小知识点，每个知识点包含讲解、代码示例和练习题
- **题目**：每 2-3 个知识点添加 1-2 道练习题
- **习题**：知识点习题作为课后作业，等级考试习题用于备考练习

## ⚠️ 注意事项

1. **安全**：当前密码加密方式较简单，正式使用时建议使用更安全的加密方式（如 bcrypt）
2. **权限**：确保在云开发控制台为云函数配置正确的执行权限
3. **数据备份**：定期在云开发控制台导出重要数据
4. **性能**：如果课程内容很多，考虑添加分页或搜索功能
5. **课程扩展**：如需添加更多课程，修改 `app.js` 中的 `courses` 数组，并在数据库中添加对应章节
6. **云函数部署**：新增或修改过的云函数（updateUserProfile、chapterQuestions、examQuestions、wrongQuestions）需要重新上传部署

## 🔧 常见问题

**Q: 登录时提示「学生不存在」**

- A: 确认 users 集合中有该学生记录，且用户名与输入完全一致

**Q: 点击按钮没反应**

- A: 检查是否已正确部署所有云函数，以及云环境 ID 是否配置正确

**Q: 内容保存后不显示**

- A: 检查 courseId 是否匹配（'python' 或 'cpp'），并刷新页面

**Q: 如何将某个学生改为老师**

- A: 在云开发控制台 → 数据库 → users 集合 → 找到该学生的记录 → 将 role 字段改为 'admin'

**Q: 习题保存失败**

- A: 检查 chapterQuestions / examQuestions 集合是否已创建，相关云函数是否已部署

**Q: 头像上传失败**

- A: 检查云存储是否已开通，以及云存储权限是否设置正确

**Q: 等级考试错题页面看不到错题**

- A: 确认已重新部署 wrongQuestions 云函数；之前产生的旧错题可能缺少 examType/level 字段，重新做一次等级考试题目即可正常显示

**Q: 章节习题完成进度不更新**

- A: 确认已创建 exerciseProgress 集合，并确保 wrongQuestions 云函数已重新部署

## 📄 许可证

本项目仅供学习和教学使用。

---

祝使用愉快！🎉
