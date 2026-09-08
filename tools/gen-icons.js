// 生成 styles/icons.wxss：将线性 SVG 图标编码为 data-uri 背景图
// 用法：node tools/gen-icons.js
// 新增/修改图标后重新运行即可。图标颜色取自主题色板，见 app.wxss 中的变量。
const fs = require('fs');
const path = require('path');

const C = {
  primary: '#5B67F1',
  ok: '#22C08A',
  danger: '#FF5C72',
  warning: '#FFA940',
  gray: '#9AA0B0',
  white: '#FFFFFF',
};

// 线性图标 path 定义（24x24 viewBox，stroke=2 圆角端点，feather 风格）
const line = (inner, color) => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
});
const fill = (inner, color) => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="none">${inner}</svg>`,
});

const P = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  bookOpen: '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  wrong: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  exam: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 5a3.5 3.5 0 0 1 0 7M21.5 20c0-2.7-1.6-4.4-4-5.1"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  upload: '<path d="M12 3v12m0-12-4 4m4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 5H4a1 1 0 0 0-1 1c0 2.5 1.8 4 4 4M17 5h3a1 1 0 0 1 1 1c0 2.5-1.8 4-4 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4"/>',
  chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
};

// 类名 => [path键, 颜色, 是否填充]
const icons = {
  'i-book': line(P.book, C.primary),
  'i-book-open': line(P.bookOpen, C.primary),
  'i-edit': line(P.edit, C.primary),
  'i-exam': line(P.exam, C.primary),
  'i-chart': line(P.chart, C.primary),
  'i-user': line(P.user, C.primary),
  'i-users': line(P.users, C.primary),
  'i-tool': line(P.tool, C.primary),
  'i-shield': line(P.shield, C.primary),
  'i-pin': line(P.pin, C.primary),
  'i-bookmark': line(P.bookmark, C.primary),
  'i-target': line(P.target, C.primary),
  'i-code': line(P.code, C.primary),
  'i-chip': line(P.chip, C.primary),
  'i-arrow-up': line(P.arrowUp, C.primary),
  'i-arrow-down': line(P.arrowDown, C.primary),
  'i-upload': line(P.upload, C.primary),

  'i-code-w': line(P.code, C.white),
  'i-chip-w': line(P.chip, C.white),
  'i-arrow-right-w': line(P.arrowRight, C.white),
  'i-book-w': line(P.book, C.white),
  'i-exam-w': line(P.exam, C.white),

  'i-check': line(P.check, C.ok),
  'i-trophy': line(P.trophy, C.warning),
  'i-bulb': line(P.bulb, C.warning),
  'i-warn': line(P.warn, C.warning),

  'i-wrong': line(P.wrong, C.danger),
  'i-x': line(P.x, C.danger),
  'i-heart-on': fill(P.heart, C.danger),
  'i-heart-off': line(P.heart, C.gray),
  'i-chevron': line(P.chevron, C.gray),
  'i-arrow-right': line(P.arrowRight, C.primary),
  'i-arrow-right-gray': line(P.arrowRight, C.gray),
};

const base = `
/* ========== 图标库（由 tools/gen-icons.js 生成，勿手改） ========== */
/* 用法：<text class="icon i-book"/>，通过 font-size 控制大小 */
/* 彩色/渐变背景上使用白色变体：<text class="icon i-book-w"/> */
.icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  vertical-align: -0.12em;
}
`;

let css = base;
for (const [cls, { svg }] of Object.entries(icons)) {
  const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
  css += `.${cls} { background-image: url("${uri}"); }\n`;
  // 为每个主色图标自动生成白色变体（-w 后缀），用于彩色渐变背景
  if (cls.endsWith('-w')) continue;
  const whiteSvg = svg.replace(/stroke="[^"]*"/g, `stroke="${C.white}"`).replace(/fill="[^"]*"/g, `fill="${C.white}"`);
  const whiteUri = 'data:image/svg+xml;base64,' + Buffer.from(whiteSvg, 'utf8').toString('base64');
  css += `.${cls}-w { background-image: url("${whiteUri}"); }\n`;
}

const out = path.join(__dirname, '..', 'styles', 'icons.wxss');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, css);
console.log('已生成', out, '共', Object.keys(icons).length, '个图标，', (css.length / 1024).toFixed(1) + 'KB');
