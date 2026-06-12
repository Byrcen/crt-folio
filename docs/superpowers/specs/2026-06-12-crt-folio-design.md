# crt-folio 设计文档

日期：2026-06-12
状态：已获用户确认（"先做出来一版我看看吧"）

## 目标

完全复刻 hle.io（The First The Last 出品，FWA/CSSDA SOTD）的动态与交互形式，内容替换为用户（cry）的 **AIPM 求职个人品牌**。与现有 cry-site 项目无关，全新独立站点。

- 语言：英文为主，v2 增加中文切换（右上角 EN/中 胶囊开关）
- 部署目标：Cloudflare Pages（免费静态托管）
- 交互规格依据：`2026-06-12-hle-interaction-spec.md`（由 76s 录屏逐帧分析 + hle.io 源码探测得出）

## 技术选型（方案 A，已确认）

- **Vite + TypeScript 原生**，无 UI 框架——动效控制零阻碍，最接近 1:1 复刻
- **Three.js**：Hero 3D 场景。CRT 电视用**程序化建模**（圆角盒体 + 弧面屏幕 + 旋钮/格栅），不依赖外部 GLB 资产；屏幕用 **CanvasTexture 实时渲染**（优于原站的 mp4 纹理：改文案/切语言即时生效）
- **GSAP + ScrollTrigger**：所有滚动编排（相机 dolly-in scrub、velocity skew、逐行揭示）
- **Lenis**：平滑惯性滚动
- **Howler.js**（v2）：UI 音效
- 字体：**Space Grotesk**（大标题）+ **JetBrains Mono**（等宽 UI），免费替代 PP Supply Sans

## 内容映射

| HLE 原内容 | 本站 |
|---|---|
| "Positioned at the axis of talent and content across film/television/music" | "Positioned at the axis of AI and product across strategy/research/shipping" |
| (1) Develop (2) Submit (3) Creative Review (4) Pitch | (1) Discover (2) Define (3) Build (4) Ship |
| Our projects 电影海报画廊 | Selected Works：项目做成"机密提案文档/电影海报"风格卡片（v1 用排版占位海报） |
| "Helping people get their idea sold" | "Turning AI ideas into shipped products" |
| HL 像素 logo | "CR" 像素字（占位，待用户定缩写） |
| CTA / Netpitch | Get In Touch（邮箱/LinkedIn 待补） |

## v1 范围（本次交付）

首页完整体验：Preloader 打字机 + 进度线 + 揭幕；Hero 3D（程序化 CRT 电视、Day/Night 旋钮、屏幕 canvas 纹理、滚动 dolly-in）；NO SIGNAL canvas 转场；About 区（网格底 + 打字机 + 流程标签 + 像素蛇）；画廊（velocity skew）；宣言区（回声层）；页脚；全局系统（自定义光标、HUD、实时时钟、平滑滚动）。

**v1 不含**：About 子页、声音、中文 i18n、移动端深度适配（仅基本可用降级）。

## 架构

```
src/
  main.ts            入口：编排 preloader → hero → sections
  core/   cursor.ts clock.ts scroll.ts(Lenis+ST) preloader.ts
  three/  stage.ts(场景/灯光/Day-Night) tv.ts(程序化电视) screen.ts(canvas纹理) rig.ts(相机dolly)
  fx/     typewriter.ts scramble.ts nosignal.ts snake.ts skew.ts reveal.ts
  styles/ main.css(主题变量/区块版式)
```

各模块单一职责、通过显式 init/接口通信，可独立替换（如电视改为 GLB 时只动 tv.ts）。

## 错误处理 / 降级

- WebGL 不可用 → Hero 显示静态占位图，其余区块照常
- `prefers-reduced-motion` → 跳过打字机/转场，直接呈现终态（v1 做基础支持）
- 移动端：降低像素比、禁用自定义光标

## 验证方式

视觉/交互项目，以浏览器实测为准：Vite dev server + 逐区块截图核对动效清单（docs spec 第四节 30+ 项）。
