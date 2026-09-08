# 课程内容工作台

给少儿编程老师的网页版课程维护工具：在电脑上建立学科章节、知识点速记与三类题目（学习题 / 章节题 / 考试题），支持 AI 辅助生成与手动编辑，一键同步到微信小程序云数据库。

## 适合谁

- 使用微信小程序云开发（云数据库）承载课程与题库的老师
- 想批量维护课程内容、不想在手机端逐题手填的老师
- 想免费（不依赖付费云端 API）、可复刻分享给其他老师的人

## 工作原理

- 网页托管在微信云开发「静态网站托管」，得到正式网址，天然满足 Web 安全域名
- 素材格式转换用本机 Ollama 本地模型（免费、离线），网上找素材用免费网页 AI（豆包/Kimi）先整理成模板文本
- 网页匿名登录调用两个云函数：`importContent` 写入、`getCourseTree` 读取，均带管理密码校验

## 一次性部署（约 40 分钟，只做一次）

1. 安装 Ollama：ollama.com 下载 Windows 版，安装路径选 `D:\ollama`
2. 模型存 D 盘（不占 C 盘）：命令行运行 `setx OLLAMA_MODELS "D:\ollama\models"`
3. 拉取模型：命令行运行 `ollama pull qwen3:4b`（约 2.5GB）
4. 每次使用前双击工具包内 `启动本地模型.bat`，模型常驻后台
5. 微信开发者工具 → 云开发控制台 → 静态网站托管 → 开通
6. 把 `index.html` + `css/` + `js/` 上传到托管根目录，收藏得到的网址
7. 云开发控制台 → 环境 → 登录授权 → 启用「匿名登录」
8. 开发者工具里右键 `importContent`、`getCourseTree` → 上传并部署（云端安装依赖）
9. 云开发控制台 → 云函数 → `importContent` → 配置 → 环境变量，添加 `ADMIN_PASSWORD=<你的管理密码>`（`getCourseTree` 同样配置）
10. 打开网址，两盏连接灯变绿即就绪

## 日常使用

- 流程 A 新建课程结构：点「帮助」→ 复制「给网页 AI 的指令」→ 和教程一起发给豆包/Kimi 得素材 → 回工作台粘贴或拖入 Word/TXT → 「开始 AI 整理」→ 逐点校对三段速记 → 「同步结构与内容」
- 流程 B 补单个知识点：左侧选中知识点 → 粘贴素材 → 选「填空模式」→ AI 填入当前知识点
- 流程 C 导入题目：切「② 题目」页签 → 粘贴题目素材 / 基于知识点现编 / 手动加题 → 逐题校对（标红必改）→ 「同步题目」
- 流程 D 纯手动维护：点「从云端拉取」→ 树上增删改、编辑内容、手动加题 → 两步同步

## 常见问题

见工具内「帮助」面板的「常见问题」，或 `docs/` 目录。

## 自定义指南

- 云环境 ID：改 `js/cloud.js` 里的 `ENV` 常量
- 默认本地模型：改 `js/ollama.js`、`js/ai-flow.js` 里的 `qwen3:4b`
- 新学科：需在小程序 `app.js` 的 `globalData.courses` 加一行配置；工作台新建非 python/cpp 学科时会提示

## 目录结构

```
content-workbench/
├─ index.html            # 工作台单文件页面入口
├─ 启动本地模型.bat       # 设跨域参数 + 后台启动 Ollama（模型存 D 盘）
├─ README.md
├─ css/style.css
├─ js/                   # 前端模块（state/parser/validate/ollama/cloud/ai-flow/tree-ui/content-ui/quiz-ui/sync/help/app）
├─ tests/                # node --test 单元测试
└─ docs/                 # 素材模板.md、网页AI指令.md
cloudfunctions/
├─ importContent/        # 写入云函数（结构/题目，密码鉴权+幂等）
└─ getCourseTree/        # 读取云函数（反向构建课程树）
```
