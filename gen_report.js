const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 6, color: "888888" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellShading = { fill: "4A90E2", type: ShadingType.CLEAR };
const cellShadingLight = { fill: "E8F4FD", type: ShadingType.CLEAR };
const FULL_WIDTH = 9360;

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 240 },
    children: [new TextRun({ text: text, bold: true, size: 36, color: "1F4E79", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 180 },
    children: [new TextRun({ text: text, bold: true, size: 30, color: "2E75B6", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text: text, bold: true, size: 26, color: "333333", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] });
}
function p(text) {
  return new Paragraph({ spacing: { after: 100, line: 360 },
    children: [new TextRun({ text: text, size: 22, font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] });
}
function bold(text) {
  return new Paragraph({ spacing: { after: 100, line: 360 },
    children: [new TextRun({ text: text, size: 22, bold: true, font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] });
}

function createHeaderRow(cells, widths) {
  return new TableRow({ cantSplit: true, children: cells.map((text, idx) => new TableCell({
    borders, width: { size: widths[idx], type: WidthType.DXA }, shading: cellShading,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: text, bold: true, color: "FFFFFF", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" }, size: 22 })] })]
  })) });
}
function createDataRow(cells, widths, alt) {
  return new TableRow({ cantSplit: true, children: cells.map((text, idx) => new TableCell({
    borders, width: { size: widths[idx], type: WidthType.DXA },
    shading: alt ? cellShadingLight : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text: text, size: 22, font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] })]
  })) });
}
function table(rows, widths) {
  const header = createHeaderRow(rows[0], widths);
  const dataRows = rows.slice(1).map((r, i) => createDataRow(r, widths, i % 2 === 1));
  return new Table({ width: { size: FULL_WIDTH, type: WidthType.DXA }, columnWidths: widths, rows: [header, ...dataRows] });
}

const W = [];

// 封面
W.push(new Paragraph({ spacing: { before: 3000 }, children: [] }));
W.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "少儿编程课程小程序", bold: true, size: 72, color: "1F4E79", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] }));
W.push(new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "产品需求与技术设计报告", size: 44, color: "2E75B6", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] }));
W.push(new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "—— Python & C++ 教学在线学习平台 ——", size: 24, color: "666666", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] }));
W.push(new Paragraph({ spacing: { before: 3500 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "版本：V1.0", size: 24, color: "333333", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] }));
W.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "编制日期：2026年6月22日", size: 24, color: "333333", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] }));
W.push(new Paragraph({ children: [new PageBreak()] }));

// 一、项目概述
W.push(h1("一、项目概述"));
W.push(h2("1.1 项目简介"));
W.push(p("本项目是一个面向中年级学生的在线编程学习平台，以微信小程序为载体，提供 Python 和 C++ 两门课程的学习内容。学生可以按章节学习知识点，阅读讲解文字和代码示例，完成练习题并自行核对答案与解析。老师通过管理员账号进行课程内容维护和用户审核管理。"));
W.push(h2("1.2 核心设计理念"));
W.push(table([
  ["设计理念", "说明"],
  ["结构化学习", "采用课程 → 章节 → 知识点三级组织结构，循序渐进"],
  ["轻量化练习", "不做自动判分，仅展示答案和解析，降低学习压力"],
  ["数据驱动", "课程内容全部存储于云端数据库，便于动态维护更新"],
  ["权限隔离", "管理员与普通用户角色分离，权限分级，避免学生误操作"],
  ["快速上手", "基于微信小程序生态，无需安装 App，扫码即用"]
], [2800, 6560]));
W.push(h2("1.3 项目基本信息"));
W.push(table([
  ["项目", "内容"],
  ["项目名称", "少儿编程课程小程序"],
  ["产品形态", "微信小程序 + 微信云开发（CloudBase）"],
  ["前端框架", "微信小程序原生 WXML + WXSS + JavaScript"],
  ["后端服务", "微信云函数（Node.js）"],
  ["数据库", "云开发文档型数据库（类 MongoDB）"],
  ["课程内容", "Python 基础 / C++ 基础"],
  ["页面数量", "9 个核心页面（含 Tab 页、列表页、详情页、管理页）"],
  ["云函数数量", "7 个核心云函数"],
  ["数据库集合数", "5 个（users、chapters、lessons、progress、favorites）"]
], [2800, 6560]));
W.push(new Paragraph({ children: [new PageBreak()] }));

// 二、功能模块详解
W.push(h1("二、功能模块详解"));
W.push(h2("2.1 功能总览"));
W.push(p("本小程序共划分为五大功能模块：用户模块、课程学习模块、学习进度模块、收藏模块、管理员模块。各模块之间相互独立，通过统一的数据层进行交互。"));
W.push(table([
  ["功能模块", "说明", "涉及数据"],
  ["用户模块", "用户注册（需审核）、用户登录、角色区分、退出登录", "users 集合"],
  ["课程学习模块", "课程选择、章节浏览、知识点详情（讲解+代码+题目）、答案查看", "chapters / lessons 集合"],
  ["学习进度模块", "自动记录当前学习位置、按课程展示进度", "progress 集合"],
  ["收藏模块", "收藏/取消收藏知识点、查看收藏列表、从收藏跳转学习", "favorites 集合"],
  ["管理员模块", "审核用户注册、章节和知识点的增删改查", "users / chapters / lessons 集合"]
], [2000, 4360, 3000]));

W.push(h2("2.2 用户模块"));
W.push(bold("功能说明："));
W.push(p("注册：用户填写用户名（≥3字符）和密码（≥6字符）后提交。系统检查用户名是否重复，写入 users 集合，status 标记为 pending（待审核）。"));
W.push(p("登录：输入用户名+密码，系统校验用户存在且密码正确，且 status 为 approved（已通过）。登录成功后，将用户信息写入本地缓存 wx.setStorageSync。"));
W.push(p("角色区分：登录后根据 users.role 字段判断角色。role = admin 为管理员，可以访问管理后台；role = user 为普通学生。"));
W.push(p("退出登录：清除本地 wx.setStorageSync('userInfo') 缓存，跳转至登录页。"));

W.push(h2("2.3 课程学习模块"));
W.push(bold("功能说明："));
W.push(p("课程选择：首页展示 Python 和 C++ 两张课程卡片，点击进入对应章节列表页。"));
W.push(p("章节浏览：展示当前课程的所有章节，每章显示含有的知识点数量，并用位置标记当前学习的章节位置。"));
W.push(p("知识点学习：展示知识点标题、讲解文字（content 字段）、代码示例（codeExample 字段，可复制）、练习题（questions 字段，含选择题和填空题）。"));
W.push(p("答案查看：每道题下方有切换按钮，点击后展开显示正确答案与解析，学生自行核对。"));
W.push(p("进度更新：学生进入知识点详情页时，系统自动调用 updateProgress 云函数，更新 progress 集合中该课程的当前学习位置。"));

W.push(h2("2.4 学习进度模块"));
W.push(bold("功能说明："));
W.push(p("自动记录：以（userId, courseId）为唯一键，每用户每课程有一条进度记录，记录当前章节和知识点 ID。"));
W.push(p("Upsert 逻辑：无记录则新建，有记录则更新。确保每个用户每课程仅保存最新学习位置。"));
W.push(p("展示位置：章节列表页中以高亮标记当前学习章节；学习进度页显示各课程当前学习的知识点标题。"));

W.push(h2("2.5 收藏模块"));
W.push(bold("功能说明："));
W.push(p("添加收藏：在知识点详情页顶部点击收藏按钮，将 userId + lessonId 写入 favorites 集合。"));
W.push(p("取消收藏：再次点击已收藏状态，删除 favorites 中对应记录。"));
W.push(p("收藏状态判断：进入知识点详情页时，调用 isFavorite 进行 count 查询，判断是否已收藏，显示不同的按钮状态。"));
W.push(p("收藏列表：在我的收藏页，调用 getFavorites 云函数，在云端联合查询 favorites + lessons + chapters，返回包含知识点标题、章节标题、所属课程的完整列表，点击可直接跳转学习。"));

W.push(h2("2.6 管理员模块"));
W.push(bold("功能说明："));
W.push(p("权限验证：进入管理后台前，检查 isAdmin() 返回值（需 role = 'admin'），非管理员弹窗提示并返回。"));
W.push(p("用户审核：获取所有 status = 'pending' 的用户，管理员点击通过/拒绝按钮，调用 reviewUser 云函数更新 users.status。"));
W.push(p("章节管理：在指定课程下新增章节（填写标题+排序序号）、编辑已有章节、删除章节（含二次确认）。"));
W.push(p("知识点管理：在指定章节下新增/编辑/删除知识点，填写标题、讲解内容、代码示例、排序序号，以及练习题（JSON 数组格式）。"));
W.push(new Paragraph({ children: [new PageBreak()] }));

// 三、页面设计详解
W.push(h1("三、页面设计详解"));
W.push(h2("3.1 页面总览"));
W.push(p("小程序共包含 9 个页面，其中 2 个为 Tab 栏页面（首页和我的），其余为普通导航页面。页面之间通过 wx.navigateTo 和 wx.switchTab 进行跳转。"));
W.push(table([
  ["页面路径", "页面名称", "主要功能", "角色权限"],
  ["pages/login/login", "登录/注册页", "登录表单、注册表单、模式切换", "所有人"],
  ["pages/index/index", "首页（课程入口）", "欢迎信息、课程卡片（Python / C++）", "已登录用户"],
  ["pages/chapters/chapters", "章节列表页", "章节列表、当前学习标记、知识点展开", "已登录用户"],
  ["pages/lesson/lesson", "知识点详情页", "讲解文字、代码示例、练习题、答案解析、收藏按钮", "已登录用户"],
  ["pages/profile/profile", "个人中心", "用户信息卡、功能菜单（进度/收藏/管理/退出）", "已登录用户"],
  ["pages/progress/progress", "习题页", "习题练习（待开发）", "已登录用户"],
  ["pages/favorites/favorites", "错题页", "错题本（待开发）", "已登录用户"],
  ["pages/study-progress/study-progress", "学习进度页", "各课程当前学习位置", "已登录用户"],
  ["pages/my-favorites/my-favorites", "我的收藏页", "已收藏知识点列表", "已登录用户"],
  ["pages/admin/admin", "管理后台", "用户审核 Tab / 课程管理 Tab", "仅管理员"],
  ["pages/admin-edit/admin-edit", "内容编辑页", "新增/编辑章节 / 新增/编辑知识点 / 知识点列表", "仅管理员"]
], [2400, 2400, 3000, 1560]));

W.push(h2("3.2 Tab 栏配置"));
W.push(table([
  ["配置项", "说明"],
  ["Tab 1", "首页（pages/index/index）：展示课程入口"],
  ["Tab 2", "我的（pages/profile/profile）：用户信息与功能菜单"],
  ["Tab 样式", "蓝色主题（#4A90E2），白色背景，选中/未选中文字颜色切换"]
], [2800, 6560]));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 3.3 各页面详细设计
W.push(h2("3.3 各页面详细设计"));
W.push(h3("页面 1：登录/注册页 (pages/login/)"));
W.push(bold("页面功能："));
W.push(p("顶部为欢迎标题，中部为 Tab 切换的登录/注册模式卡片。登录模式：用户名输入框 + 密码输入框 + 登录按钮。注册模式：用户名输入框 + 密码输入框 + 确认密码输入框 + 注册按钮。登录成功后调用 app.setUserInfo() 保存用户信息到全局和本地缓存，然后 wx.switchTab 跳转首页。页面加载时检查 wx.getStorageSync('userInfo')，如已登录则自动跳转首页。"));
W.push(bold("核心数据："));
W.push(table([
  ["字段", "说明"],
  ["mode", "'login' 或 'register'，控制当前展示的表单模式"],
  ["username", "用户名输入值"],
  ["password", "密码输入值"],
  ["confirmPassword", "确认密码（仅注册模式使用）"],
  ["loading", "提交中状态，禁用按钮防止重复提交"]
], [2800, 6560]));
W.push(bold("调用服务："));
W.push(p("用户登录：云函数 userLogin，校验用户名、密码哈希、status 状态。"));
W.push(p("用户注册：云函数 userRegister，参数校验、查重、写入 users 集合。"));

W.push(h3("页面 2：首页 (pages/index/)"));
W.push(bold("页面功能："));
W.push(p("顶部蓝色渐变色块显示欢迎语和当前用户名。中部展示两张课程卡片（Python / C++），卡片含课程图标、课程名称、简要说明、点击跳转箭头。底部提供学习小贴士，鼓励学生。"));
W.push(bold("页面数据："));
W.push(table([
  ["字段", "说明"],
  ["courses", "从 app.globalData.courses 获取，含 id/name/icon/color 字段"],
  ["userInfo", "从 app.getUserInfo() 获取，用于展示欢迎语"]
], [2800, 6560]));
W.push(bold("页面跳转："));
W.push(p("点击课程卡片 → navigateTo pages/chapters/chapters?courseId=xxx&courseName=xxx"));

W.push(h3("页面 3：章节列表页 (pages/chapters/)"));
W.push(bold("页面功能："));
W.push(p("顶部课程标题卡片，展示课程名称和章节数量。章节列表：每章展示序号徽章、章节标题、知识点数量。若该章为当前学习章，显示当前学习位置标记。点击章节可展开知识点列表（若章节含知识点）。知识点列表中显示标题、简述，点击进入学习页。当前学习的知识点以高亮显示。"));
W.push(bold("核心数据："));
W.push(table([
  ["字段", "说明"],
  ["courseId", "页面参数，标识当前课程（python / cpp）"],
  ["courseName", "课程名称，显示在顶部标题栏"],
  ["chapters", "章节数组，每个章节包含 lessons 子数组"],
  ["currentChapterId", "当前学习章节的 ID，用于高亮标记"],
  ["currentLessonId", "当前学习知识点的 ID"],
  ["loading", "加载状态"]
], [2800, 6560]));
W.push(bold("查询逻辑："));
W.push(p("1. 查询 chapters 集合 where courseId = 当前课程，orderBy order asc → 返回章节列表。"));
W.push(p("2. 对每个章节循环：查询 lessons 集合 where chapterId = 章节 ID → 填充 lessons 子数组，统计 lessonCount 字段。"));
W.push(p("3. 查询 progress 集合 where userId, courseId → 获取当前学习进度 chapterId、lessonId。"));

W.push(h3("页面 4：知识点详情页 (pages/lesson/)"));
W.push(bold("页面功能（核心学习页）："));
W.push(p("顶部操作栏：收藏/取消收藏按钮，切换爱心状态。知识点标题，大字号展示。知识点讲解文字区域，使用较大行间距保证阅读舒适度。代码示例区域，深色背景+浅色代码文字，可一键复制到剪贴板。练习题区域：每道题显示题干，选择题展示 A/B/C/D 选项卡片（可点击选中），填空题展示输入框。每道题的查看答案按钮：点击后展开显示正确答案和解析。"));
W.push(bold("核心数据："));
W.push(table([
  ["字段", "说明"],
  ["chapterId / lessonId / courseId", "页面参数，标识当前知识点"],
  ["lessonData", "完整知识点对象（title, content, codeExample, questions）"],
  ["isFavorite", "布尔值，当前知识点是否已收藏"],
  ["questions", "解析后的题目数组（JSON 字符串解析为 JS 对象数组）"],
  ["showAnswers", "数组，每题是否显示答案的布尔开关"],
  ["userAnswers", "数组，记录用户选择/填写的答案"],
  ["loading", "加载状态"]
], [2800, 6560]));
W.push(bold("数据流向："));
W.push(p("页面加载：getLesson(lessonId) 获取知识点 → JSON.parse(questions) 解析题目。检查收藏状态：favorites.isFavorite(userId, lessonId).count()。更新进度：progress.updateProgress(userId, courseId, chapterId, lessonId) —— 云端 Upsert。用户操作：选择答案更新 userAnswers 数组；点击查看答案切换 showAnswers；点击收藏切换 isFavorite。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

W.push(h3("页面 5：个人中心 (pages/profile/)"));
W.push(bold("页面功能："));
W.push(p("顶部渐变色块：用户头像（占位图标）+ 用户名 + 角色标签（普通学生 / 管理员）。功能菜单列表：学习进度 → 进度页、我的收藏 → 收藏页、内容管理 → 管理后台（仅管理员可见）。底部红色退出登录按钮，点击后弹确认框，确认后清除缓存并跳转登录页。"));
W.push(bold("权限判断逻辑："));
W.push(p("app.isAdmin() 检查 userInfo.role 是否为 'admin'，以决定是否显示内容管理入口。"));

W.push(h3("页面 6：学习进度页 (pages/progress/)"));
W.push(bold("页面功能："));
W.push(p("标题显示：我的学习进度。课程卡片列表，每卡展示课程图标+名称、总知识点数量、当前学习的知识点标题。点击卡片可跳转到对应课程的章节列表页。"));
W.push(bold("查询逻辑："));
W.push(p("对 app.globalData.courses 中的每门课程循环：① 查询 chapters + lessons 统计总知识点数量；② 查询 progress 集合获取当前学习 lessonId；③ 查询 lessons 集合获取知识点标题。"));

W.push(h3("页面 7：我的收藏页 (pages/favorites/)"));
W.push(bold("页面功能："));
W.push(p("展示当前用户所有收藏的知识点，每项显示图标、知识点标题、所属章节名称。点击知识点跳转至知识点详情页，传递 chapterId、lessonId 等参数。"));

W.push(h3("页面 8：管理后台 (pages/admin/)"));
W.push(bold("页面功能（双 Tab 模式）："));
W.push(p("用户审核 Tab：列出所有 status = pending 的待审核用户，展示用户名和注册日期，每人有【通过】和【拒绝】两个操作按钮。操作后弹窗确认，更新 users 集合 status 字段为 approved 或 rejected，刷新列表。"));
W.push(p("课程管理 Tab：顶部课程选择器（Python / C++）切换。列表展示该课程所有章节，每章显示管理知识点 / 编辑 / 删除三个按钮。顶部有新增章节按钮。点击管理知识点进入 admin-edit 页。"));

W.push(h3("页面 9：内容编辑页 (pages/admin-edit/)"));
W.push(bold("页面功能（多用途页面，通过 URL 参数 type 区分三种模式）："));
W.push(p("类型 1：编辑章节（type = chapter）。展示章节标题输入框、排序序号数字输入框、保存按钮。含 id 参数则为编辑已有章节，写入章节数据。不含 id 参数则为新增章节，在 chapters 集合新增一条记录。"));
W.push(p("类型 2：知识点列表（type = lessonlist）。顶部展示章节名，下面展示该章节下所有知识点的列表，每项含标题、顺序号、【编辑】和【删除】两个按钮。右上角有【+ 新增知识点】按钮，跳转至编辑知识点表单。"));
W.push(p("类型 3：编辑知识点（type = lesson）。表单字段：标题（必填）、排序序号（数字）、讲解内容（多行文本输入）、代码示例（深色多行代码编辑框）、练习题（JSON 格式，提供格式说明查看按钮）。保存按钮校验 JSON 格式，正确后写入 lessons 集合。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 四、页面逻辑关系与业务流程
W.push(h1("四、页面逻辑关系与业务流程"));
W.push(h2("4.1 页面导航总图"));
W.push(bold("入口：登录页 login"));
W.push(p("↓ 登录成功 switchTab"));
W.push(bold("Tab 栏（两个 Tab 切换）：首页 index ⇄ 我的 profile"));
W.push(bold("首页 → 课程学习链路："));
W.push(p("首页（index）→ 选择课程 → 章节列表页（chapters?courseId=xxx）→ 点击章节内知识点 → 知识点详情页（lesson?chapterId=xxx&lessonId=xxx&courseId=xxx）"));
W.push(bold("我的 → 功能链路："));
W.push(p("我的（profile）→ 学习进度（progress）/ 我的收藏（favorites）/ 内容管理（admin，仅管理员可见）"));
W.push(bold("管理员链路："));
W.push(p("管理后台（admin）→ 点击编辑/新增章节/管理知识点 → 内容编辑页（admin-edit?type=xxx）"));

W.push(h2("4.2 主要业务流程图"));
W.push(h3("流程 1：用户注册与审核流程"));
W.push(p("学生在登录页切换至注册 Tab → 填写用户名（≥3字符）+ 密码（≥6字符）+ 确认密码 → 前端校验后调用 userRegister 云函数 → 云函数查重 → 将用户写入 users 集合（status: pending, role: user）→ 返回成功。前端弹窗提示注册成功，切换至登录模式 → 学生输入账号密码登录 → 云函数 userLogin 校验密码和 status → 若 pending 提示待审核 → 若 approved 登录成功进入首页。管理员端：管理员账号登录 → 进入个人中心 → 点击内容管理进入 admin 页 → 用户审核 Tab 查看待审核列表 → 点击通过/拒绝按钮 → 二次确认后调用 reviewUser 云函数 → 更新 users.status 为 approved 或 rejected → 刷新列表。"));

W.push(h3("流程 2：课程学习流程"));
W.push(p("学生登录成功进入首页 → 选择 Python 或 C++ 课程卡片 → 跳转章节列表页（chapters）携带 courseId 和 courseName 参数 → 章节列表页查询 chapters 集合加载章节 → 循环查询每章的 lessons 列表 → 查询 progress 集合获取当前学习位置 → 页面渲染章节与知识点列表，当前学习章节标记高亮位置。学生点击某个知识点 → 跳转 lesson 页，携带 chapterId、lessonId、courseId → 页面查询 lessons 集合获取知识点详情 → 解析 questions 字段的 JSON → 查询 favorites 集合检查是否已收藏 → 调用 updateProgress 云函数更新学习进度 → 渲染讲解文字/代码示例/练习题列表。"));

W.push(h3("流程 3：管理员内容维护流程"));
W.push(p("管理员登录 → 个人中心点击【内容管理】入口进入 admin 页 → 默认展示用户审核 Tab，可管理待审核用户。切换到课程管理 Tab → 选择课程（Python / C++）→ 查看章节列表。新增章节 → 跳转 admin-edit?type=chapter 填写标题和序号，保存后写入 chapters 集合。编辑章节 → 跳转 admin-edit?type=chapter&id=xxx 载入数据后修改。删除章节 → 确认弹窗后删除。点击某章的【管理知识点】→ 跳转 admin-edit?type=lessonlist，展示该章节所有知识点列表 → 新增知识点 → 跳转 admin-edit?type=lesson 填写表单 → 保存写入 lessons 集合。编辑知识点 → 加载已有数据后修改保存。删除知识点 → 二次确认后删除。"));

W.push(h3("流程 4：收藏与进度记录流程"));
W.push(p("收藏触发：在知识点详情页（lesson.js），学生点击顶部收藏按钮 → 调用 toggleFavorite 云函数，云函数查询 favorites 集合是否已有该 userId + lessonId 的记录。如有则删除（取消收藏），如无则新增（添加收藏）。页面刷新按钮状态为收藏/未收藏。"));
W.push(p("进度更新触发：学生进入任意知识点详情页时，在页面加载完成后（onLoad）自动调用 updateProgress 云函数，以 userId + courseId 为唯一键，更新 progress 集合中的 chapterId 和 lessonId 字段，同时更新 updatedAt 时间戳。如该用户在该课程尚无进度记录，则新建一条记录。"));

W.push(h2("4.3 数据流向汇总表"));
W.push(table([
  ["操作场景", "数据流向"],
  ["注册", "login 页面 → userRegister 云函数 → users 集合（新增记录，status: pending）"],
  ["登录", "login 页面 → userLogin 云函数 → 查询 users 集合校验用户名、密码、状态 → 写入本地缓存"],
  ["浏览章节", "chapters 页面 → 查询 chapters 集合 → 查询 lessons 集合填充每章知识点 → 查询 progress 集合展示进度"],
  ["学习知识点", "lesson 页面 → 查询 lessons 集合 → 解析题目 JSON → 检查 favorites 收藏状态 → 调用 updateProgress 云函数写入 progress 集合"],
  ["收藏切换", "lesson 页面 → toggleFavorite 云函数 → favorites 集合 upsert（有则删，无则增）"],
  ["查看收藏列表", "favorites 页面 → getFavorites 云函数 → 联合查询 favorites+lessons+chapters 三个集合"],
  ["审核用户", "admin 页面 → getPendingUsers 云函数 → 查询 users(status=pending) → reviewUser 云函数更新 users 集合 status 字段"],
  ["章节新增/修改", "admin-edit 页面 → db.courses.addChapter / updateChapter → chapters 集合写入/更新"],
  ["章节删除", "admin 页面 → db.courses.deleteChapter → chapters 集合删除指定文档（含二次确认）"],
  ["知识点新增/修改", "admin-edit 页面 → db.courses.addLesson / updateLesson → lessons 集合写入/更新"],
  ["知识点删除", "lessonlist 模式 → db.courses.deleteLesson → lessons 集合删除指定文档"]
], [2200, 7160]));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 五、数据库设计
W.push(h1("五、数据库设计详解"));
W.push(h2("5.1 数据库概述"));
W.push(table([
  ["配置项", "说明"],
  ["数据库类型", "微信云开发 CloudBase（文档型数据库，类 MongoDB）"],
  ["集合数量", "5 个：users, chapters, lessons, progress, favorites"],
  ["查询方式", "小程序端 SDK 直接查询 + 云函数混合使用"],
  ["权限设置", "安全规则自定义，每集合分别配置读写权限"],
  ["推荐索引", "users: username；chapters: (courseId, order)；lessons: (chapterId, order)；progress: (userId, courseId)；favorites: (userId, lessonId)"]
], [2800, 6560]));

W.push(h2("5.2 users 集合 — 用户信息表"));
W.push(p("用途：存储所有注册用户的账号信息，含登录凭证、角色权限、审核状态。"));
W.push(table([
  ["字段名", "类型", "必填", "示例值", "说明"],
  ["_id", "string", "系统生成", "user_001_abcdef", "文档唯一标识，由系统自动生成"],
  ["username", "string", "是", "小明同学", "用户名，3-20 字符，唯一，登录凭证"],
  ["password", "string", "是", "哈希值", "密码哈希值，不存明文"],
  ["role", "string", "是", "user / admin", "角色标识，admin 为管理员，可访问管理后台"],
  ["status", "string", "是", "pending / approved / rejected", "审核状态，pending 待审核 / approved 已通过 / rejected 已拒绝"],
  ["createdAt", "date", "是", "2026-06-18T10:30", "注册时间（云函数写入的服务器时间）"],
  ["reviewedAt", "date", "否", "2026-06-19T09:00", "审核时间，管理员通过或拒绝时写入"]
], [1600, 1000, 800, 2000, 3960]));

W.push(bold("安全设计："));
W.push(p("密码不存储明文。使用 simpleHash 函数将密码字符串进行位运算哈希处理后存储。登录时将用户输入的密码进行同样哈希计算，与数据库中的 password 字段比对。建议正式上线前替换为 bcrypt 或其他行业标准加密方式，并加盐处理。"));
W.push(bold("查询场景："));
W.push(p("登录：db.collection('users').where({username: xxx}).get() → 校验密码 + 检查 status。"));
W.push(p("审核：db.collection('users').where({status: 'pending'}).get() → 返回待审核用户列表。"));

W.push(h2("5.3 chapters 集合 — 课程章节表"));
W.push(p("用途：存储 Python 与 C++ 两门课程的章节结构信息。"));
W.push(table([
  ["字段名", "类型", "必填", "示例值", "说明"],
  ["_id", "string", "系统生成", "chapter_001", "章节唯一标识"],
  ["courseId", "string", "是", "python / cpp", "所属课程 ID，与前端课程配置一致"],
  ["title", "string", "是", "第一章 变量与数据类型", "章节标题"],
  ["order", "number", "是", "1", "排序序号，决定章节展示顺序，数字越小越靠前"],
  ["createdAt", "number", "否", "时间戳", "创建时间（可选）"]
], [1600, 1000, 800, 2000, 3960]));
W.push(bold("数据说明："));
W.push(p("order 字段为 1、2、3... 的连续整数，由管理员填写。同一课程下各章节 order 应唯一且连续。chapters 与 lessons 为一对多关系，通过 chapterId 关联。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

W.push(h2("5.4 lessons 集合 — 知识点内容表（核心表）"));
W.push(p("用途：存储每个知识点的完整内容，包括讲解文字、代码示例、练习题。是学习模块的核心数据表。"));
W.push(table([
  ["字段名", "类型", "必填", "示例值", "说明"],
  ["_id", "string", "系统生成", "lesson_001", "知识点唯一标识"],
  ["chapterId", "string", "是", "chapter_001", "所属章节 ID，外键关联 chapters._id"],
  ["title", "string", "是", "1.1 什么是变量", "知识点标题"],
  ["content", "string", "是", "讲解文字内容", "知识点讲解内容（纯文本，支持换行）"],
  ["codeExample", "string", "否", "name = '小明'...", "代码示例，多行字符串，深色代码块展示"],
  ["order", "number", "是", "1", "章节内排序序号"],
  ["questions", "array / string", "否", "题目 JSON 数组", "选择题/填空题，含题干、选项、答案、解析"]
], [1600, 1000, 800, 2000, 3960]));

W.push(bold("questions 字段详细格式："));
W.push(table([
  ["字段", "说明"],
  ["type", "题目类型：choice 选择题 / fill 填空题"],
  ["question", "题目题干文字"],
  ["options", "选择题专用，对象格式，key 为 A/B/C/D，value 为选项内容。填空题无此字段"],
  ["answer", "正确答案，选择题为字母（A/B/C/D），填空题为答案文字"],
  ["explanation", "答案解析文字，向学生说明解题思路"]
], [2800, 6560]));

W.push(h2("5.5 progress 集合 — 学习进度表"));
W.push(p("用途：记录每个用户在每门课程中的学习位置。一用户一课程一条记录（Upsert）。"));
W.push(table([
  ["字段名", "类型", "必填", "示例值", "说明"],
  ["_id", "string", "系统生成", "prog_001", "进度记录唯一标识"],
  ["userId", "string", "是", "user_001_abcdef", "用户 ID，外键关联 users._id"],
  ["courseId", "string", "是", "python", "课程 ID，与 userId 联合构成唯一键"],
  ["chapterId", "string", "是", "chapter_005", "当前学习的章节 ID"],
  ["lessonId", "string", "是", "lesson_015", "当前学习的知识点 ID"],
  ["createdAt", "date", "否", "时间", "首次学习该课程时写入的时间"],
  ["updatedAt", "date", "否", "时间", "最后学习时间，每次打开新知识点时更新"]
], [1600, 1000, 800, 2000, 3960]));
W.push(bold("Upsert 逻辑："));
W.push(p("用户每次进入一个知识点详情页，都会触发一次 updateProgress 云函数调用。云函数查询是否已存在 (userId, courseId) 的记录。如无则新建一条文档；如有则更新其 chapterId、lessonId 和 updatedAt 字段。保证每用户每课程仅保存一条最新进度记录。"));

W.push(h2("5.6 favorites 集合 — 收藏表"));
W.push(p("用途：记录用户收藏的知识点，便于复习查阅。"));
W.push(table([
  ["字段名", "类型", "必填", "示例值", "说明"],
  ["_id", "string", "系统生成", "fav_001", "收藏记录唯一标识"],
  ["userId", "string", "是", "user_001_abcdef", "用户 ID，关联 users._id"],
  ["lessonId", "string", "是", "lesson_005", "收藏的知识点 ID，关联 lessons._id"],
  ["createdAt", "date", "否", "时间", "收藏时间"]
], [1600, 1000, 800, 2000, 3960]));
W.push(bold("切换收藏逻辑（toggleFavorite）："));
W.push(p("云函数接收 userId 和 lessonId，查询 favorites 集合是否存在 (userId, lessonId) 的记录。存在则删除该记录（取消收藏），返回 {isFavorite: false}。不存在则新增一条记录，返回 {isFavorite: true}。"));
W.push(bold("收藏列表查询逻辑（getFavorites）："));
W.push(p("云函数在云端进行多表关联查询：① 查询 favorites 集合获取用户所有收藏 lessonId；② 批量查询 lessons 集合获取章节 ID 和标题；③ 批量查询 chapters 集合获取章节标题。在服务端组装完整数据返回前端。"));

W.push(h2("5.7 数据库表关系图"));
W.push(bold("表关系总览："));
W.push(p("users 表为全局用户基础表，其他所有表通过 userId 与其关联。chapters 表为课程结构顶层表，通过 courseId 区分课程，与 lessons 表是一对多关系（一章节 → 多知识点）。lessons 表为内容核心表，通过 chapterId 外键关联 chapters 表。progress 表为中间表，同时关联 users（userId）和课程（courseId），记录当前学习的 chapterId 和 lessonId。favorites 表为中间表，同时关联 users（userId）和 lessons（lessonId），实现用户对知识点的收藏关系。"));

W.push(h2("5.8 权限设计建议"));
W.push(table([
  ["集合", "权限建议"],
  ["users", "学生仅可读自己的文档；管理员可读列表、修改 status/role；注册时允许匿名新增"],
  ["chapters", "所有用户（含未登录）可读；仅管理员可新增/修改/删除"],
  ["lessons", "所有用户可读；仅管理员可新增/修改/删除"],
  ["progress", "仅创建者本人可读/写（按 userId 过滤）"],
  ["favorites", "仅创建者本人可读/写（按 userId 过滤）"]
], [2800, 6560]));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 六、云函数设计
W.push(h1("六、云函数设计"));
W.push(h2("6.1 云函数总览"));
W.push(p("项目共设计 7 个云函数，分别处理用户注册/登录、审核、进度更新、收藏管理等涉及安全校验或多步操作的复杂逻辑。简单单集合 CRUD 操作（如章节和知识点的增删改查）由小程序端通过 wx.cloud.database() 直接完成。"));
W.push(table([
  ["云函数名称", "功能说明", "调用端"],
  ["userRegister", "用户注册：校验用户名密码、查重、密码哈希后写入 users 集合，默认 status 为 pending", "学生端小程序"],
  ["userLogin", "用户登录：校验用户名存在、密码正确、status 为 approved，返回用户信息", "学生端小程序"],
  ["getPendingUsers", "获取待审核用户列表：查询 status=pending 的用户返回", "管理员端小程序"],
  ["reviewUser", "审核用户：将指定 userId 的 status 更新为 approved 或 rejected", "管理员端小程序"],
  ["updateProgress", "更新学习进度：对 (userId, courseId) 进行 Upsert，不存在则新建，存在则更新", "学生端（静默调用）"],
  ["getFavorites", "获取用户收藏列表：联合查询 favorites + lessons + chapters，返回含标题的完整列表", "学生端"],
  ["toggleFavorite", "切换收藏状态：查询是否已收藏，存在则删除，不存在则新增，返回当前状态", "学生端"]
], [2200, 5160, 2000]));

W.push(h2("6.2 密码加密算法 (simpleHash)"));
W.push(p("在 userRegister 和 userLogin 两个云函数中使用同一套哈希算法处理密码。算法逻辑：对密码字符串的每个字符进行位运算（左移 5 位 - 当前值 + 字符 Unicode 编码），循环累积得到一个整数哈希值，转换为 36 进制字符串，并拼接密码长度后缀。"));
W.push(p("特点：同一密码产生相同哈希（保证可验证）、不可逆（无法反推原密码）、实现简单无外部依赖。"));
W.push(p("安全建议：当前算法安全性有限，正式上线时建议替换为 bcrypt 或 crypto-js 的 SHA-256 等行业标准加密，并增加加盐（salt）处理。"));

W.push(h2("6.3 为什么选择云函数而非直接操作数据库"));
W.push(p("1) 用户注册/登录涉及密码校验和安全处理，应在服务端云函数执行，避免客户端安全漏洞。"));
W.push(p("2) 用户审核需要管理员权限控制，云端可更安全地判断调用者权限（当前简化为前端判断，后续可完善为云端鉴权）。"));
W.push(p("3) updateProgress 需要 Upsert 语义（查后决定新增或更新），放在客户端需要两次网络往返，延迟高且可能产生竞态问题。"));
W.push(p("4) getFavorites 需要跨三个集合做关联查询，并在云端组装复杂数据结构，减少客户端数据处理和网络请求。"));
W.push(p("5) toggleFavorite 同样为查+写的复合操作，放在云端保证操作原子性和数据一致性。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 七、项目文件结构
W.push(h1("七、项目文件结构"));
W.push(h2("7.1 根目录结构"));
W.push(table([
  ["文件/目录", "说明"],
  ["project.config.json", "微信开发者工具项目配置，含 AppID、云开发根目录配置等"],
  ["app.js", "小程序全局入口，onLaunch 中初始化云开发、检查本地登录状态，定义全局方法 checkLogin/getUserInfo/setUserInfo/logout/isAdmin，定义 globalData（用户信息、课程配置）"],
  ["app.json", "小程序全局配置，定义 pages 数组（9 个页面路径）、窗口样式、tabBar 底部导航栏"],
  ["app.wxss", "全局样式，定义通用容器、卡片、按钮、标题、输入框、代码块等，以蓝色 (#4A90E2) 为主色调"],
  ["sitemap.json", "配置小程序页面是否允许被微信搜索索引"]
], [2800, 6560]));

W.push(h2("7.2 utils 目录（工具层）"));
W.push(table([
  ["文件", "说明"],
  ["utils/db.js", "数据库操作统一封装。暴露 users / courses / progress / favorites 四个命名空间，分别对应四个业务领域的所有数据库操作。将云函数调用（如 login、register、updateProgress、toggleFavorite 等）和直接数据库查询（如 getChapters、getLessons 等）统一收口在此文件。所有页面通过 require 调用，避免页面散落数据库操作代码，便于维护。"]
], [2800, 6560]));

W.push(h2("7.3 pages 目录（页面层）"));
W.push(table([
  ["页面目录", "主要职责"],
  ["pages/login/", "登录/注册：表单输入处理、模式切换、云函数调用、错误提示、页面跳转。蓝色渐变主题样式"],
  ["pages/index/", "首页：加载全局课程配置和用户信息，处理课程卡片点击跳转。展示欢迎语和课程选择卡片"],
  ["pages/chapters/", "章节列表：接收 courseId 参数，加载章节列表、知识点列表、学习进度，处理知识点卡片点击跳转"],
  ["pages/lesson/", "知识点详情：核心学习页。加载内容、解析题目 JSON、检查收藏状态、更新学习进度、处理用户答题交互、收藏切换、代码复制"],
  ["pages/profile/", "个人中心：读取用户信息和角色判断，处理各功能菜单跳转，处理退出登录（含二次确认）"],
  ["pages/progress/", "学习进度：循环查询各课程的总知识点数和当前学习位置，展示当前学习的知识点标题"],
  ["pages/favorites/", "我的收藏：调用 getFavorites 云函数获取收藏列表，展示收藏卡片，点击跳转学习"],
  ["pages/admin/", "管理后台：进入页检查管理员权限。双 Tab 切换（用户审核/课程管理）。用户审核：加载待审核用户，处理通过/拒绝按钮。课程管理：切换课程、管理章节和知识点"],
  ["pages/admin-edit/", "内容编辑：多用途页面。根据 URL 参数 type 区分：章节表单（type=chapter）、知识点列表（type=lessonlist）、知识点表单（type=lesson，含标题/讲解/代码/练习题 JSON 输入）"]
], [2800, 6560]));

W.push(h2("7.4 cloudfunctions 目录（云函数层）"));
W.push(p("每个云函数为独立文件夹，结构相同：index.js（主逻辑）+ package.json（声明依赖 wx-server-sdk）+ node_modules（安装的依赖包，部署时上传）。"));
W.push(bold("云函数部署说明："));
W.push(p("① 在微信开发者工具中右键云函数文件夹 → 选择【在终端中打开】→ 执行 npm install 安装依赖；② 右键云函数文件夹 → 选择【上传并部署：云端安装依赖】；③ 在云开发控制台云函数页面确认部署成功并可触发测试。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 八、部署流程清单
W.push(h1("八、部署流程清单"));
W.push(h2("8.1 准备阶段"));
W.push(table([
  ["步骤", "说明"],
  ["1. 注册小程序账号", "访问 mp.weixin.qq.com 完成小程序主体注册"],
  ["2. 获取 AppID", "在小程序管理后台获取（开发管理 → 开发设置）"],
  ["3. 安装开发者工具", "官方下载微信开发者工具并安装"],
  ["4. 打开项目", "导入项目，填入项目路径和 AppID"]
], [2800, 6560]));

W.push(h2("8.2 开通云开发"));
W.push(table([
  ["步骤", "说明"],
  ["1. 开通云开发", "开发者工具左上角点击【云开发】按钮 → 开通，选择基础版（免费套餐足够测试使用）"],
  ["2. 创建环境", "创建云开发环境，记录环境 ID（envId，形如 xxx-1a2b3c）"],
  ["3. 配置环境 ID", "在 app.js 中 wx.cloud.init({env: 'your-env-id'}) 填入环境 ID"]
], [2800, 6560]));

W.push(h2("8.3 创建数据库集合"));
W.push(p("在云开发控制台 → 数据库 → 【+】添加集合，依次创建以下 5 个集合：users、chapters、lessons、progress、favorites。建议每个集合设置适当的权限规则（参考第五章权限设计）。"));

W.push(h2("8.4 创建初始管理员账号"));
W.push(p("方法一：先在小程序内注册一个普通账号，在云开发控制台 users 集合中将该用户的 role 字段改为 'admin'，status 改为 'approved'。方法二：在云开发控制台直接手动在 users 集合中新增一条文档，填写 username、password（需与 simpleHash 的结果一致）、role=admin、status=approved。登录该账号即可进入管理后台。"));

W.push(h2("8.5 部署全部云函数"));
W.push(p("对 7 个云函数（userRegister、userLogin、getPendingUsers、reviewUser、updateProgress、getFavorites、toggleFavorite）依次执行：右键文件夹 → 【在终端中打开】→ npm install 安装依赖 → 右键文件夹 → 【上传并部署：云端安装依赖】。"));

W.push(h2("8.6 添加课程内容"));
W.push(p("使用管理员账号登录小程序 → 进入【我的】→ 点击【内容管理】→ 在【课程管理】Tab 选择 Python → 新增章节 → 进入章节管理知识点 → 新增知识点（填写标题、讲解、代码示例、练习题 JSON）。同样步骤完成 C++ 课程内容添加。"));

W.push(h2("8.7 测试验收"));
W.push(table([
  ["测试项", "测试要点"],
  ["注册流程", "注册一个测试账号，确认返回待审核状态，无法登录"],
  ["审核流程", "用管理员账号进入用户审核 Tab，通过测试账号后尝试登录"],
  ["学习流程", "测试登录 → 选课程 → 浏览章节 → 进入知识点 → 阅读讲解/查看代码/做题/看答案解析"],
  ["进度记录", "切换到不同知识点，查看进度页是否更新当前学习位置"],
  ["收藏功能", "收藏/取消收藏知识点，验证状态切换正确"],
  ["管理员内容维护", "测试新增、编辑、删除章节和知识点，验证数据同步到学生端"],
  ["退出登录", "点击退出登录，确认本地缓存清除并跳转登录页"]
], [2800, 6560]));

W.push(h2("8.8 发布上线（可选）"));
W.push(p("在开发者工具中点击【上传】，填写版本号和项目备注。登录微信公众平台，进入版本管理，将开发版本提交审核，审核通过后点击发布即可上线供用户使用。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 九、关键技术点
W.push(h1("九、关键技术点与设计决策"));
W.push(h2("9.1 登录状态持久化（本地缓存 + 全局状态）"));
W.push(p("设计方案：用户登录成功后，同时维护两份状态。① app.js 的 globalData.userInfo 和 isLoggedIn（内存态，供运行时快速读取）。② wx.setStorageSync('userInfo', ...)（本地缓存，供小程序下次启动时自动恢复登录态）。启动流程：在 app.js 的 onLaunch 中，先初始化云开发，再读取 wx.getStorageSync('userInfo')，如存在有效记录则将 globalData.isLoggedIn 置为 true，并恢复用户信息，用户无需重复登录。退出逻辑：调用 app.logout() 清除 globalData 状态和 wx.removeStorageSync 清除本地缓存，跳转登录页。注意：当前方案在云端修改用户状态（如禁用账号）后，本地不会立即感知。改进方案为首页启动时调用一次云函数查询最新 status 做校验。"));

W.push(h2("9.2 题目数据的嵌入式 JSON 设计"));
W.push(p("设计方案：每道题作为 lessons.questions 数组中的一个对象存储，不独立建表。题目类型区分：choice 选择题含 options 对象（A/B/C/D），fill 填空题无 options。完整 JSON 结构包含 type / question / options（仅 choice）/ answer / explanation 五字段。"));
W.push(p("设计理由：① 每个知识点的题目数量有限（通常 2-5 题），数据量小无需分表。② 查询时可随知识点内容一同获取，无需额外网络请求。③ 修改题目时仅需更新 lessons 文档的 questions 字段，操作简单。编辑体验：在管理员编辑页提供 JSON 输入框，附带【格式说明】查看按钮展示模板，降低老师录入数据门槛。后续可考虑升级为可视化题目编辑器。"));

W.push(h2("9.3 收藏列表的云端联合查询"));
W.push(p("设计方案：在云函数 getFavorites 中做三表关联查询，不在小程序端循环查。流程：① 查询 favorites 集合获取用户所有收藏记录（含 lessonId）；② 提取 lessonId 数组批量查询 lessons 集合获取章节 ID 和标题；③ 提取 chapterId 数组批量查询 chapters 集合获取章节标题。在服务端组装完整数据结构返回，前端直接渲染。"));
W.push(p("设计理由：若改为客户端循环查询，N 个收藏需要 2N+1 次请求，延迟高且易触发云数据库请求频率限制。云端一次云函数调用内完成所有查询，网络开销小、速度快、逻辑集中易维护。"));

W.push(h2("9.4 学习进度的 Upsert 模式"));
W.push(p("设计方案：progress 集合以（userId, courseId）为唯一键，一用户一课程仅保留一条记录。每次用户打开一个知识点页面，触发 updateProgress 云函数。云函数先查是否存在该键的记录。不存在则 add 新增；存在则 update 更新 chapterId、lessonId 和 updatedAt 字段。这一查+写模式称为 Upsert（Update or Insert）。"));
W.push(p("设计理由：无需维护学习历史轨迹，仅需知道用户当前学到哪里。节省存储空间，同时保证进度信息简洁、查询高效。若未来需要学习天数统计等更细粒度指标，可扩展新增 learningRecords 集合做历史记录。"));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 十、可扩展功能建议
W.push(h1("十、后续可扩展功能建议"));
W.push(table([
  ["扩展功能", "详细说明"],
  ["错题本功能", "记录用户在练习题中选错/填错的答案（新增 wrongAnswers 集合），展示错题列表供用户复习。在 lesson 页增加提交答案按钮，对比用户答案与正确答案，记录错题"],
  ["答题统计仪表盘", "统计每章/每课程的正确率，展示学习数据仪表盘（新增 stats 云函数做聚合查询）。可升级为用户个人学习分析报告"],
  ["富文本讲解内容", "当前讲解为纯文本，可升级为 Markdown 或富文本编辑器，支持图片、代码高亮、加粗/斜体/标题等格式。引入 marked.js 等富文本渲染库"],
  ["视频讲解", "在 lessons 集合新增 videoUrl 字段，管理员可上传教学视频文件到云存储，用户在知识点详情页观看视频。适合复杂概念的讲解"],
  ["作业提交与批改", "新增 submissions 集合，用户提交编程作业（代码文件或在线编辑器输入），老师在管理后台查看、批改并打分、给出评语"],
  ["学习排行榜", "按答题正确率、已学习知识点数量、连续学习天数等综合计算积分，生成学员排行榜，增加学习游戏化激励"],
  ["多角色体系", "扩展 users.role 字段：student（学生）/ teacher（授课老师）/ parent（家长）/ admin（管理员），各角色查看不同内容。例如家长可看孩子的学习进度数据"],
  ["学习日历打卡", "新增 checkins 集合，记录用户每日学习日期（类似打卡），激励学习持续性。展示学习热力图或连续学习天数"],
  ["课程证书", "学生完成一门课程的所有章节（可增加完成状态字段）后，生成课程学习证书（PDF 或图片模板），展示在个人成就页。可下载或分享"],
  ["讨论社区", "新增 comments 集合，学生可针对每个知识点提问或讨论，老师或管理员回复。增加学习交互性"],
  ["消息推送", "利用微信小程序订阅消息功能，向用户推送审核通过通知、新章节上线提醒、学习进度提醒等消息"],
  ["多语言/深色模式", "增加国际化语言切换，提供中文/英文版本。增加深色模式样式，适配不同用户喜好和场景"]
], [2800, 6560]));

W.push(new Paragraph({ children: [new PageBreak()] }));

// 十一、附录：练习题 JSON 格式示例
W.push(h1("十一、附录：练习题 JSON 格式完整示例"));
W.push(p("以下为一个知识点的完整 questions 字段示例，供管理员录入时参考："));
W.push(bold("示例 1：选择题"));
W.push(p("{"));
W.push(p("  type: \"choice\","));
W.push(p("  question: \"在 Python 中，以下哪个是正确的变量定义方式？\","));
W.push(p("  options: {"));
W.push(p("    A: \"int x = 10;\","));
W.push(p("    B: \"x = 10\","));
W.push(p("    C: \"var x = 10;\","));
W.push(p("    D: \"x := 10\""));
W.push(p("  },"));
W.push(p("  answer: \"B\","));
W.push(p("  explanation: \"Python 使用动态类型，直接使用 = 赋值即可声明变量，无需指定类型关键字。A 是 C/C++/Java 语法，C 是 JavaScript 语法，D 是 Go 语言语法。\""));
W.push(p("}"));

W.push(bold("示例 2：填空题"));
W.push(p("{"));
W.push(p("  type: \"fill\","));
W.push(p("  question: \"在 Python 中，定义函数需要使用的关键字是____。\","));
W.push(p("  answer: \"def\","));
W.push(p("  explanation: \"def 是 define 的缩写，用于定义函数。例如：def hello(): print('Hello')。注意 def 后接空格、函数名、括号、冒号，函数体缩进 4 个空格。\""));
W.push(p("}"));

W.push(bold("组合示例（含多题的完整数组）："));
W.push(p("["));
W.push(p("  { type: \"choice\", question: \"题目一...\", options: {...}, answer: \"B\", explanation: \"...\" },"));
W.push(p("  { type: \"fill\", question: \"题目二...\", answer: \"答案\", explanation: \"...\" },"));
W.push(p("  { type: \"choice\", question: \"题目三...\", options: {...}, answer: \"A\", explanation: \"...\" }"));
W.push(p("]"));

W.push(new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "—— 报告完 ——", size: 24, color: "999999", font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })] }));

// 生成文档
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Arial", eastAsia: "Microsoft YaHei" }, size: 22 }
      }
    }
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    children: W
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "C:\\Users\\86173\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\6a33a63a218dc4c1e85f186e\\少儿编程课程小程序_详细报告.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("OK: " + outPath);
});
