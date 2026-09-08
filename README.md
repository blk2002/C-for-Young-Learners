# 📚 少儿编程课程小程序

一个面向中小学生的微信小程序，用于学习 Python 和 C++ 编程课程，覆盖「教、学、练、测」完整闭环。

## 🎯 项目功能

### 学生端功能

- 👤 登录（账号由老师在后台创建发放，无需注册）
- 🔑 修改密码（需验证原密码）
- 📚 浏览课程章节
- 📖 查看知识点详情（文字讲解 + 代码示例）
- ✏️ 做知识点练习题（选择题/填空题），自行核对答案
- 📝 习题功能：章节知识点习题 + 等级考试习题，含完成进度追踪
- ❌ 错题本功能：章节知识点错题 + 等级考试错题，支持逐题移除和批量移除
- 📊 查看学习进度
- ❤️ 收藏喜欢的知识点
- 🎨 个人资料设置（头像、昵称、个性签名）

### 老师端功能

- 👥 学生账号管理：
  - 创建学生账号（真实姓名 + 用户名 + 初始密码 + 有效期天数）
  - 账号续期（按天数续期或直接指定截止日期）
  - 一键重置密码为默认密码（123456）
  - 删除学生账号（级联清理其全部学习数据）
  - 按状态筛选：全部 / 即将到期 / 已过期
- 📚 管理课程章节（新增/编辑/删除）
- 📝 管理知识点（新增/编辑/删除）
- 🔢 为知识点添加练习题
- 📋 习题管理：章节知识点习题（新增/编辑/删除选择题和填空题）
- 🏆 习题管理：等级考试习题（CIE / GESP / CSP-J/S，分级管理）

### 账号有效期机制

- 学生账号由老师创建时指定有效期（如 90 天、180 天，或永久）
- 到期后学生端自动强制退出登录，提示联系老师续期
- 老师账号永久有效；没有设置有效期的老账号也视为永久有效

## 🎨 主题与样式系统

项目使用统一的**设计变量（Design Tokens）**管理视觉样式，主题为「星空靛蓝」。

### 设计变量（定义在 `app.wxss`）

| 变量 | 值 | 用途 |
| ---- | ------ | ---- |
| `--primary` | `#5B67F1` | 主色（按钮、链接、选中态） |
| `--primary-deep` | `#8E5CF6` | 渐变端色（紫色） |
| `--tint` | `#EDEFFF` | 主色淡背景（标签、选中底色） |
| `--ok` / `--ok-tint` | `#22C08A` / `#E5F8F1` | 成功（答题正确） |
| `--danger` / `--danger-tint` | `#FF5C72` / `#FFEDEF` | 危险（答题错误、删除） |
| `--warning` / `--warning-tint` | `#FFA940` / `#FFF4E6` | 警告（提示） |
| `--bg` / `--panel` / `--panel-2` | `#F6F7FB` / `#fff` / `#F1F2F8` | 页面背景 / 卡片 / 次级背景 |
| `--t1` / `--t2` / `--t3` | `#252A3D` / `#5A6072` / `#9AA0B0` | 一/二/三级文字 |
| `--line` | `#E7E9F2` | 分割线、描边 |
| `--r-lg` / `--r-md` | `24rpx` / `20rpx` | 卡片 / 按钮圆角 |

**换主题只需修改 `app.wxss` 中的变量定义**（以及 `app.json` 的导航栏、tabBar 颜色），页面样式全部引用变量。

### 图标系统（`styles/icons.wxss`）

- 全部图标为统一风格的**线性 SVG**（2px 圆角描边），以 base64 内嵌于 `styles/icons.wxss`
- 用法：`<text class="icon i-book"/>`，大小跟随容器 `font-size`（图标为 1em 见方）
- 彩色/渐变背景上使用白色变体：`<text class="icon i-book-w"/>`
- 图标源码在 `tools/gen-icons.js`，**新增或修改图标后运行 `node tools/gen-icons.js` 重新生成**
- tabBar 图标为 PNG（微信要求），位于 `assets/tabbar/`，同为线性风格
- 课程卡片（Python / C++）与考试分类卡（CIE / GESP / CSP）保留品牌色渐变，图标用白色变体

### 样式规范

- 页面样式**不要硬编码颜色**，一律使用 `var(--xxx)` 变量
- 新增语义色时先在 `app.wxss` 定义变量，再在页面引用
- ⚠️ 避免在页面里复用全局类名（如 `.progress-bar`）做其他用途，全局定义会与页面样式冲突

## 📁 项目结构

```
c_young_learn/
├── app.js                    # 小程序入口
├── app.json                  # 小程序全局配置
├── app.wxss                  # 全局样式 + 设计变量定义
├── styles/
│   └── icons.wxss           # 图标库（由 tools/gen-icons.js 生成）
├── assets/
│   └── tabbar/              # tabBar 图标 PNG
├── tools/
│   └── gen-icons.js         # 图标库生成脚本
├── project.config.json       # 项目配置
├── sitemap.json              # 索引配置
├── utils/
│   └── db.js                # 数据库操作工具
├── pages/
│   ├── login/               # 登录页
│   ├── change-password/     # 修改密码页
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
│   ├── admin/               # 管理后台（学生管理/课程管理/习题管理）
│   ├── admin-student-edit/  # 学生账号创建/编辑（续期/重置密码）
│   ├── admin-edit/          # 内容编辑页（章节/知识点）
│   ├── admin-exercises/     # 习题管理-章节列表
│   ├── admin-lessons/       # 习题管理-知识点列表
│   ├── admin-exercise-edit/ # 习题管理-题目编辑
│   ├── admin-exam-type/     # 等级考试类型管理
│   ├── admin-exam-levels/   # 等级考试等级管理
│   └── admin-exam-edit/     # 等级考试题目编辑
└── cloudfunctions/          # 云函数目录
    ├── userLogin/           # 登录（含有效期校验）
    ├── changePassword/      # 修改密码
    ├── adminCreateUser/     # 管理员创建学生账号
    ├── adminListUsers/      # 管理员获取学生列表
    ├── adminUpdateValidity/ # 管理员给学生账号续期
    ├── adminResetPassword/  # 管理员重置学生密码
    ├── adminDeleteUser/     # 管理员删除学生（级联清理数据）
    ├── cleanPendingUsers/   # 一次性清理旧版遗留的待审核账号
    ├── updateProgress/      # 更新学习进度
    ├── getFavorites/        # 获取收藏列表
    ├── toggleFavorite/      # 切换收藏状态
    ├── updateUserProfile/   # 更新用户资料
    ├── chapterQuestions/    # 章节知识点习题
    ├── examQuestions/       # 等级考试习题
    ├── wrongQuestions/      # 错题本 + 练习进度
    ├── initCourses/         # 初始化示例课程内容（一次性）
    └── initQuestions/       # 初始化示例题库（一次性）
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
| users              | 用户信息（含账号、密码、角色、有效期）   |
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

### 第六步：创建老师（管理员）账号

本版本没有注册功能，第一个管理员需要手动在数据库创建。

在云开发控制台 → 数据库 → users → 添加记录：

```
字段：
  username:  admin        (字符串)
  password:  jhjj438      (字符串，这是 admin123 的哈希值)
  nickname:  老师          (字符串)
  role:      admin        (字符串)
  status:    approved     (字符串)
  createdAt: 手动选一个日期
```

保存后即可用 **admin / admin123** 登录，登录后请尽快在「我的 → 修改密码」中改掉。

如需自定义初始密码，可用 Node 计算哈希后填入 `password` 字段：

```bash
node -e "const h=(s)=>{let x=0;for(let i=0;i<s.length;i++){x=(x<<5)-x+s.charCodeAt(i);x&=0x7FFFFFFF}return x.toString(36)+s.length};console.log(h('你的密码'))"
```

### 第七步：上传并部署云函数

1. 在微信开发者工具左侧 **"云函数"** 目录
2. 右键每个云函数 → **"上传并部署：云端安装依赖"**
3. 等待所有云函数部署完成

> 💡 所有云函数只依赖 `wx-server-sdk`，直接用「云端安装依赖」上传即可，无需本地 npm install。

### 第八步：初始化示例内容（可选，推荐）

部署后可执行两个初始化云函数，一键灌入 Python / C++ 两门课的章节、知识点和三套习题（学习页内嵌题、章节习题、等级考试题）：

1. 云开发控制台 → 云函数 → **initCourses** → 云端测试，传参 `{ "confirm": true }` 执行
2. 同样方式执行 **initQuestions**（依赖 initCourses 先执行）

两个函数都是幂等的，可重复执行（会先清掉已有内容再重建）。

### 第九步：测试

1. 点击开发者工具的 **"编译"** 按钮
2. 用 admin / admin123 登录老师账号
3. 在「我的 → 内容管理」创建学生账号（设置姓名、用户名、密码、有效期）
4. 用学生账号登录，浏览课程、做题、收藏、做习题
5. 在习题管理中添加章节习题和等级考试习题
6. 测试学生账号到期后的强制退出效果（可在学生管理中续期恢复）

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
| username    | string | 登录用户名（字母/数字/下划线，至少 3 位）                     |
| password    | string | 经过简单哈希处理的密码                                        |
| name        | string | 真实姓名（管理员创建账号时填写）                              |
| nickname    | string | 昵称（可选）                                                 |
| avatar      | string | 头像云存储路径（可选）                                        |
| signature   | string | 个性签名（可选）                                              |
| role        | string | 角色：'admin' 或 'user'                                       |
| status      | string | 状态：'approved'（新账号由管理员创建，直接生效）              |
| validUntil  | date   | 有效期截止时间（管理员账号和老账号无此字段 = 永久有效）       |
| createdAt   | date   | 创建时间                                                     |
| updatedAt   | date   | 最后更新时间                                                 |

### 学习进度 (progress)

| 字段       | 类型   | 说明             |
| --------- | ------ | ---------------- |
| _id       | string | 系统自动生成的ID |
| userId    | string | 用户ID           |
| courseId  | string | 课程ID           |
| chapterId | string | 当前所在章节ID   |
| lessonId  | string | 当前所在知识点ID |
| updatedAt | date   | 最后更新时间     |

### 收藏 (favorites)

| 字段       | 类型   | 说明             |
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
3. 在「学生管理」标签页：
   - 点击创建学生账号（姓名、用户名、初始密码、有效期天数）
   - 对已有账号：续期、重置密码（重置后为 123456）、删除
   - 按状态筛选：全部 / 即将到期 / 已过期
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
- **学生账号**：按班级/课时售卖时，用有效期天数控制使用期限（如一期课 90 天），到期可在学生管理中续期

## ⚠️ 注意事项

1. **安全**：当前密码加密方式较简单，正式使用时建议使用更安全的加密方式（如 bcrypt）
2. **权限**：管理员操作云函数的权限校验依赖前端传入 operatorId，属软校验；严格方案应绑定微信 openid
3. **数据备份**：定期在云开发控制台导出重要数据
4. **性能**：如果课程内容很多，考虑添加分页或搜索功能
5. **课程扩展**：如需添加更多课程，修改 `app.js` 中的 `courses` 数组，并在数据库中添加对应章节
6. **云函数部署**：新增或修改过的云函数需要重新上传部署
7. **样式**：页面样式避免复用 `app.wxss` 全局类名（如 `.progress-bar`），以免被全局定义覆盖

## 🔧 常见问题

**Q: 登录时提示「学生不存在」**

- A: 账号由老师在后台创建，请先联系老师创建账号

**Q: 学生账号到期了怎么办**

- A: 老师在「内容管理 → 学生管理」中找到该学生，点击续期（按天数续期或指定截止日期）

**Q: 学生忘记密码**

- A: 老师在学生管理中点击「重置密码」，重置后为默认密码 123456，学生登录后再自行修改

**Q: 点击按钮没反应**

- A: 检查是否已正确部署所有云函数，以及云环境 ID 是否配置正确

**Q: 内容保存后不显示**

- A: 检查 courseId 是否匹配（'python' 或 'cpp'），并刷新页面

**Q: 习题保存失败**

- A: 检查 chapterQuestions / examQuestions 集合是否已创建，相关云函数是否已部署

**Q: 头像上传失败**

- A: 检查云存储是否已开通，以及云存储权限是否设置正确

**Q: 等级考试错题页面看不到错题**

- A: 确认已重新部署 wrongQuestions 云函数；之前产生的旧错题可能缺少 examType/level 字段，重新做一次等级考试题目即可正常显示

**Q: 章节习题完成进度不更新**

- A: 确认已创建 exerciseProgress 集合，并确保 wrongQuestions 云函数已重新部署

**Q: 如何创建第二个老师账号**

- A: 云开发控制台 → 数据库 → users 集合 → 参照「部署步骤第六步」添加一条 role 为 'admin' 的记录

**Q: 老版本升级后，历史遗留的待审核账号怎么清理**

- A: 部署 cleanPendingUsers 云函数并云端测试执行一次，会删除所有 status 为 'pending' 的旧账号

## 📄 许可证

本项目仅供学习和教学使用。

---

祝使用愉快！🎉
