# 视觉打磨实施计划（Hero 场景升级 + 广播层 + 完成度修复）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/superpowers/specs/2026-08-19-visual-polish-design.md` 完成全站视觉打磨：hero 3D 场景升级（尺寸+27%、道具、光影、屏幕叙事）、全站广播层装饰、三张海报重绘、蓝图重画、五项完成度修复；文案全部保持现状。

**Architecture:** 纯前端 Vite+TS 站点，无测试框架。验证方式 = `npm run build`（tsc+vite）通过 + headless Chrome 截图目检（脚本在 scratchpad：`capture.mjs` 全站 19 机位、`tvsize.mjs` hero 机位）。3D 改动集中在 `src/three/`，装饰层集中在 `index.html` + `main.css` + 新文件 `src/fx/channel.ts`，道具新文件 `src/three/props.ts`。

**Tech Stack:** Three.js 0.170（RoundedBoxGeometry addon 已在用）、GSAP ScrollTrigger、Lenis、WebAudio 合成音效、CanvasTexture 程序化纹理。

## Global Constraints

- 不引入任何图片/音频/3D 外部资产——一切程序化生成（规格铁律）
- 所有文案不动（现状即占位符）；`content.ts` 仅允许两处非文案改动：aboutStem 插入 `\n` 断行符、corners 的 `CH 03`→`CH 00`
- 每项新动效必须有 `prefers-reduced-motion` 直达稳定态的分支
- 移动端（≤768px）不回归：频段刻度尺隐藏、粒子减半或关闭、hero 构图成立
- WebGL 降级 try/catch 分支不回归（stage 加载失败时页面仍可用）
- 相机定档：`startPos.z = 8.3`（可在 8.0–8.6 微调）
- 提交信息用中文、与仓库既有风格一致；每个 Task 一个 commit

---

### Task 1: D 组 CSS 修复（pill 类迁移 + HUD 遮蔽 + 日间对比度）

**Files:**
- Modify: `src/styles/main.css:833-845`（#cta 块）、`main.css:1131-1132`（.pill 占位块）、`main.css:11`（--hud day）、`main.css:1028-1040`（#top-fade）

**Interfaces:**
- Produces: 类级 `.pill` 完整胶囊样式（后续任务不再依赖 #cta 的视觉属性）

- [ ] **Step 1: pill 样式迁移**。删除 `main.css:1131-1132` 的 `.pill { position: relative; opacity: 0; }`，把 `#cta` 的视觉属性合并进类级规则（`#cta` 只留 margin）：

```css
.pill {
  position: relative;
  display: block;
  width: fit-content;
  padding: 12px 26px;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  color: var(--ink);
  text-decoration: none;
  font-family: var(--font-m);
  font-size: 12px;
  letter-spacing: 0.08em;
  opacity: 0;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.pill:hover,
.pill:focus-visible {
  border-color: #fff;
  box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.09);
}
.pill span { opacity: 0; }
#cta { margin: 7vh auto 20px; }
```

- [ ] **Step 2: HUD 遮蔽带加强**（修"works intro 与导航叠字"，对全部 dark 区生效）。`#top-fade` 改为：

```css
#top-fade {
  height: 15vh;
  background: linear-gradient(to bottom, rgba(10, 10, 10, 0.98) 32%, rgba(10, 10, 10, 0));
}
```
（其余属性不变，只改这两行。）

- [ ] **Step 3: 日间 HUD 对比度**。`main.css:11` `--hud: #2f2f2f` → `--hud: #1f1f1f`（logo/nav/headline 同步变深，夜间与 dark 区 token 不动）。

- [ ] **Step 4: 验证**。`npm run build` 通过；headless 截图子页 CTA（复用 capture.mjs 的 12–14 机位）确认「联系我」为胶囊按钮非蓝链接；works 区滚动机位确认 intro 文字过 HUD 时被遮蔽带压住。

- [ ] **Step 5: Commit**：`修复：胶囊按钮类级化（子页蓝链接）、HUD 遮蔽带、日间 HUD 对比度`

---

### Task 2: D2 「交汇点」断词修复

**Files:**
- Modify: `src/content.ts:6`（aboutStem）、`src/styles/main.css:301-305`（#about-title）、`main.css` 移动端媒体查询

**Interfaces:**
- Consumes: `domTypeLoop`（typewriter.ts，onUpdate 走 textContent，无需改 JS——`\n` 靠 CSS pre-line 渲染）

- [ ] **Step 1**: `content.ts` aboutStem 改为 `'站在 AI 与产品的交汇点，\n深耕'`（screen.stem 是另一字符串，不动）。
- [ ] **Step 2**: CSS `#about-title { white-space: pre-line; }`（加进现有 301 行规则）；移动端媒体查询里加 `#about-title { font-size: clamp(26px, 7.2vw, 40px); }` 保证第一行 12 个全角字符在 390px 宽放得下。
- [ ] **Step 3: 验证**。桌面+移动截图：第一行结尾是"交汇点，"，"交汇点"三字永在同一行；打字过程中断点不跳（打两次截图对比）。
- [ ] **Step 4: Commit**：`修复：about 标题按词组断行，「交汇点」不再跨行`

---

### Task 3: D5 NO SIGNAL 后台冻结修复

**Files:**
- Modify: `src/fx/nosignal.ts:27-118`

- [ ] **Step 1**: 在 `playNoSignal` 的 Promise 内注册 `visibilitychange`，恢复可见时若仍在播则把 elapsed 快进到头（下一帧 rAF 恢复即完成清理），并在完成分支移除监听：

```ts
return new Promise((resolve) => {
  const onVis = () => {
    if (document.visibilityState === 'visible') elapsed = durationMs; // 快进：下一帧走 p>=1 清理
  };
  document.addEventListener('visibilitychange', onVis);
  const frame = (now: number) => {
    ...
    if (p >= 1) {
      document.removeEventListener('visibilitychange', onVis);
      cv.style.display = 'none';
      playing = false;
      resolve();
      return;
    }
    ...
  };
  requestAnimationFrame(frame);
});
```

- [ ] **Step 2: 验证**。build 通过；headless 里触发换台后立即 `page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))` 模拟不可靠，改为目检代码路径 + 手动：开发面板里切走再切回，页面不再被黑画布盖住（本会话早前实测过冻结现象，修后用同一手法复测）。
- [ ] **Step 3: Commit**：`修复：NO SIGNAL 在后台标签页冻结成黑屏遮罩`

---

### Task 4: 广播层（频道角标 + 频段刻度尺 + 扫描线 + 空白支撑）

**Files:**
- Modify: `index.html`（各 section 角标 + 支撑元素 + #freq-ruler）
- Create: `src/fx/channel.ts`
- Modify: `src/styles/main.css`（角标/刻度尺/扫描线/水印/信号条样式）、`src/main.ts`（initBroadcastLayer 接线）

**Interfaces:**
- Produces: `initBroadcastLayer(): void`（main.ts 在 initScrollFx 后调用一次；子页角标静态显示，不依赖 ScrollTrigger）

- [ ] **Step 1: HTML**。五处角标（aria-hidden，纯装饰）：

```html
<!-- #about 开头 --><span class="ch-badge mono-label" aria-hidden="true">CH 01 · 关于</span>
<!-- #works works-head 内 --><span class="ch-badge mono-label" aria-hidden="true">CH 02 · 精选作品</span>
<!-- #manifesto --><span class="ch-badge mono-label" aria-hidden="true">CH 03 · 宣言</span>
<!-- #footer --><span class="ch-badge mono-label" aria-hidden="true">CH 04 · 联系</span>
<!-- #page-about .ap-hero --><span class="ch-badge mono-label" aria-hidden="true">CH 05 · 关于 cry</span>
```

支撑元素：about 末尾加 `<div id="sig-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><span class="mono-label">SIG 87%</span></div>`；manifesto 开头加 `<span id="mani-watermark" aria-hidden="true">CH 03</span>`；ap-hero 轴线旁加 `<span class="ap-coord mono-label" aria-hidden="true">Y · 000 — 交汇点</span>`。body 末尾（#top-fade 前）加 `<div id="freq-ruler" aria-hidden="true"></div>`。

- [ ] **Step 2: CSS**（要点，全部新增块）：

```css
.ch-badge { position: absolute; top: 5vh; left: 3.5vw; color: var(--ink-dim); letter-spacing: 0.22em; opacity: 0; }
#footer .ch-badge { top: 2vh; }
.ch-badge.on { animation: ch-flick 0.5s steps(2) both; }
@keyframes ch-flick { 0% { opacity: 0; } 30% { opacity: 1; } 45% { opacity: 0.25; } 60% { opacity: 1; } 75% { opacity: 0.4; } 100% { opacity: 1; } }
#content { background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 4px), var(--bg-dark); }
#freq-ruler { position: fixed; right: 12px; top: 50%; transform: translateY(-50%); z-index: 5; display: flex; flex-direction: column; gap: 7px; opacity: 0; transition: opacity 0.5s ease; pointer-events: none; }
html[data-zone='dark'] #freq-ruler { opacity: 1; }
#freq-ruler i { width: 7px; height: 1px; background: var(--ink-dim); opacity: 0.4; margin-left: auto; transition: width 0.2s ease, opacity 0.2s ease, background 0.2s ease; }
#freq-ruler i.hot { width: 14px; opacity: 1; background: var(--teal); }
#sig-meter { position: absolute; right: 4vw; bottom: 12vh; display: flex; align-items: flex-end; gap: 3px; color: var(--ink-dim); }
#sig-meter i { width: 5px; background: var(--ink-dim); opacity: 0.7; }
#sig-meter i:nth-child(1) { height: 4px; } #sig-meter i:nth-child(2) { height: 7px; } #sig-meter i:nth-child(3) { height: 10px; } #sig-meter i:nth-child(4) { height: 13px; background: var(--teal); } #sig-meter i:nth-child(5) { height: 16px; background: var(--teal); }
#sig-meter .mono-label { margin-left: 8px; }
#mani-watermark { position: absolute; left: 50%; top: 8vh; transform: translateX(-50%); font-family: var(--font-d); font-weight: 600; font-size: 24vw; line-height: 1; color: #101010; pointer-events: none; user-select: none; }
.ap-coord { position: absolute; left: calc(50% + 12px); top: 18vh; color: var(--ink-dim); opacity: 0.6; writing-mode: vertical-rl; letter-spacing: 0.3em; }
@media (max-width: 768px) { #freq-ruler, #sig-meter, .ap-coord { display: none; } #mani-watermark { font-size: 40vw; } }
@media (prefers-reduced-motion: reduce) { .ch-badge, .ch-badge.on { animation: none; opacity: 1; } }
```

注意 manifesto 现有内容要压在水印上（`#mani-tag/#mani-title/#big-circle` 均已是定位元素，必要时补 `position: relative; z-index: 1`）。

- [ ] **Step 3: channel.ts**：

```ts
import { ScrollTrigger } from '../core/scroll';

/** 广播层：角标进区闪现 + 右缘频段刻度尺随滚动点亮。 */
export function initBroadcastLayer() {
  document.querySelectorAll<HTMLElement>('#content .ch-badge').forEach((b) => {
    ScrollTrigger.create({ trigger: b.parentElement, start: 'top 75%', onEnter: () => b.classList.add('on') });
  });
  // 子页角标：无滚动依赖，直接常亮
  document.querySelector('#page-about .ch-badge')?.classList.add('on');

  const ruler = document.getElementById('freq-ruler');
  if (!ruler) return;
  const N = 28;
  for (let i = 0; i < N; i++) ruler.appendChild(document.createElement('i'));
  const ticks = Array.from(ruler.children) as HTMLElement[];
  ScrollTrigger.create({
    trigger: '#content',
    start: 'top bottom',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const hot = Math.round(self.progress * (N - 1));
      ticks.forEach((t, i) => t.classList.toggle('hot', i === hot));
    },
  });
}
```

- [ ] **Step 4**: `main.ts` import 并在 `initScrollFx()` 之后调用 `initBroadcastLayer()`。
- [ ] **Step 5: 验证**。build；截图 about/works/manifesto/footer/子页各一张：角标就位、水印在文字层下、信号条在 about 右下、刻度尺随滚动点亮且 hero 区不可见；移动端截图确认刻度尺/信号条隐藏。
- [ ] **Step 6: Commit**：`广播层：频道角标、频段刻度尺、扫描线底纹与空白支撑元素`

---

### Task 5: 三张海报重绘 + 海报通电 hover

**Files:**
- Modify: `src/gallery.ts`（decor() 的 fire/peaky/beads 分支 + 过期注释）、`src/styles/main.css`（.p-fire/.p-peaky/.p-beads 区块 + .poster hover）

- [ ] **Step 1: gallery.ts**。修 `renderGallery` 注释（four→six）。decor() 三个分支替换：

```ts
case 'beads':
  return beadGrid(); // beadGrid 内改为 CSS 变量传色：<i style="--bead:${color}"></i>，off 珠保持 <i class="off"></i>
case 'fire': {
  // 13 列像素三头龙徽记：1=龙身/头
  const DRAGON = [
    '..#.......#..',
    '.###..#..###.',
    '..#..###..#..',
    '.....###.....',
    '..#######..',  // 实现时按 13 列补齐/调形，先立骨架再按截图调
    '.#########.',
    '...##.##...',
    '..##...##..',
  ];
  const cells = DRAGON.map((row) => `<i data-row>${[...row].map((ch) => `<b${ch === '#' ? ' class="on"' : ''}></b>`).join('')}</i>`).join('');
  return `<div class="p-dragon" aria-hidden="true">${cells}</div>`;
}
case 'peaky':
  return `<div class="p-photos" aria-hidden="true"><i></i><i></i><i></i><span class="p-string"></span></div><div class="p-stamp">机密</div>`;
```

（beadGrid 同步改：`cells += `<i style="--bead:${color}"></i>``。）

- [ ] **Step 2: CSS 重绘**。要点：

```css
/* beads：off 珠隐形化 + 珠面高光 */
.p-beads .p-beadgrid i { background: radial-gradient(circle at 32% 30%, rgba(255,255,255,0.85), rgba(255,255,255,0) 46%), var(--bead); box-shadow: inset 0 -2px 3px rgba(0,0,0,0.18); }
.p-beads .p-beadgrid i.off { background: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05); }

/* fire：像素龙 + 更强火焰底 */
.p-fire .p-dragon { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 2px; }
.p-fire .p-dragon i { display: flex; gap: 2px; }
.p-fire .p-dragon b { width: clamp(7px, 0.9vw, 13px); aspect-ratio: 1; }
.p-fire .p-dragon b.on { background: linear-gradient(180deg, #ffb35a, #e8632a); box-shadow: 0 0 8px rgba(255, 106, 40, 0.45); }
.p-fire::after { height: 55%; background: radial-gradient(90% 110% at 50% 120%, rgba(255, 106, 40, 0.5) 0%, rgba(176, 31, 31, 0.25) 45%, transparent 75%); }

/* peaky：牛皮纸档案 */
.p-peaky { background: linear-gradient(180deg, #cabb98 0%, #b7a67f 100%); border-color: #98876184; color: #2c2519; }
.p-peaky .p-top { color: #6f5f3f; } .p-peaky .p-no { color: #6f5f3f; }
.p-peaky .p-title-zh { color: #241d10; } .p-peaky .p-en { color: #6f5f3f; }
.p-peaky .p-stamp { top: 15%; right: 10%; transform: rotate(-14deg); font-size: 16px; border-width: 3px; opacity: 0.9; }
.p-peaky .p-photos { position: absolute; top: 30%; left: 14%; right: 14%; height: 30%; }
.p-peaky .p-photos i { position: absolute; width: 34%; aspect-ratio: 0.8; border: 2px solid #241d10; background: #efe6cf; box-shadow: 2px 3px 0 rgba(36, 29, 16, 0.35); }
.p-peaky .p-photos i:nth-child(1) { left: 0; top: 0; transform: rotate(-5deg); }
.p-peaky .p-photos i:nth-child(2) { left: 33%; top: 26%; transform: rotate(3deg); }
.p-peaky .p-photos i:nth-child(3) { right: 0; top: 4%; transform: rotate(-2deg); }
.p-peaky .p-string { position: absolute; left: 8%; top: 34%; width: 84%; height: 1.5px; background: #a8352c; transform: rotate(6deg); box-shadow: 0 22px 0 -1px #a8352c; }
.p-peaky .p-redact 相关旧规则删除;

/* 通电 hover（reduced-motion 关闭） */
.poster::before { content: ''; position: absolute; inset: 0; z-index: 4; pointer-events: none; opacity: 0; background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.38) 50%, transparent); background-size: 100% 16%; background-repeat: no-repeat; background-position: 0 -20%; }
.poster:hover::before { animation: p-power 0.55s ease-out; }
@keyframes p-power { 0% { opacity: 1; background-position: 0 -20%; } 100% { opacity: 0; background-position: 0 130%; } }
@media (prefers-reduced-motion: reduce) { .poster:hover::before { animation: none; } }
```

- [ ] **Step 3: 验证**。截图 works 三张海报聚焦态（capture.mjs 08/09 机位 + 拼豆/血与火聚焦）：爱心剪影清晰、龙形可辨且不儿戏（不行就在此步迭代 DRAGON 位图，直到成立）、峭壁档案未聚焦变暗后仍可辨轮廓。
- [ ] **Step 4: Commit**：`海报重绘：血与火像素龙、浴血黑帮档案质感、拼豆爱心立形；海报通电 hover`

---

### Task 6: 子页蓝图重画（CRT 电视解剖线稿）

**Files:**
- Modify: `index.html:170-180`（#blueprint SVG 整体替换）、`src/about.ts:16-57`（rays 生成删除 + seg 进度表重排）、`src/styles/main.css:948-966`（#blueprint 选择器扩展）

**Interfaces:**
- Consumes: 现有 seg() 机制（stroke-dashoffset 0-100 by progress 区间）

- [ ] **Step 1: SVG 替换**（元素带 id，全部 `pathLength="100"`；坐标为初稿，截图后校）：

```html
<svg id="blueprint" viewBox="0 0 400 400">
  <line id="bp-ant-l" x1="200" y1="112" x2="152" y2="48" pathLength="100" />
  <line id="bp-ant-r" x1="200" y1="112" x2="250" y2="52" pathLength="100" />
  <circle id="bp-ant-base" cx="200" cy="112" r="7" pathLength="100" />
  <rect id="bp-body" x="86" y="112" width="228" height="170" rx="12" pathLength="100" />
  <rect id="bp-screen" x="104" y="130" width="142" height="120" rx="7" pathLength="100" />
  <circle id="bp-knob" cx="284" cy="152" r="11" pathLength="100" />
  <circle id="bp-knob2" cx="284" cy="184" r="7" pathLength="100" />
  <line id="bp-g1" x1="262" y1="216" x2="306" y2="216" pathLength="100" />
  <line id="bp-g2" x1="262" y1="226" x2="306" y2="226" pathLength="100" />
  <line id="bp-g3" x1="262" y1="236" x2="306" y2="236" pathLength="100" />
  <line id="bp-foot-l" x1="118" y1="282" x2="118" y2="298" pathLength="100" />
  <line id="bp-foot-r" x1="282" y1="282" x2="282" y2="298" pathLength="100" />
  <!-- 尺寸标注：机身宽 -->
  <line id="bp-dim" x1="86" y1="322" x2="314" y2="322" pathLength="100" />
  <line id="bp-dim-l" x1="86" y1="314" x2="86" y2="330" pathLength="100" />
  <line id="bp-dim-r" x1="314" y1="314" x2="314" y2="330" pathLength="100" />
  <!-- 四角引线（指向 feat-corner 标签方向） -->
  <line class="bp-lead" id="bp-lead-0" x1="104" y1="130" x2="52" y2="78" pathLength="100" />
  <line class="bp-lead" id="bp-lead-1" x1="250" y1="52" x2="348" y2="70" pathLength="100" />
  <line class="bp-lead" id="bp-lead-2" x1="118" y1="298" x2="54" y2="330" pathLength="100" />
  <line class="bp-lead" id="bp-lead-3" x1="284" y1="184" x2="348" y2="330" pathLength="100" />
  <circle id="bp-dot" cx="175" cy="190" r="4" />
</svg>
```

- [ ] **Step 2: about.ts**。删除 24 条 rays 生成（16-32 行）；seg 进度表重排（onUpdate 内）：

```ts
const el = (id: string) => document.getElementById(id)!;
const order: [string, number, number][] = [
  ['bp-body', 0.02, 0.18], ['bp-screen', 0.16, 0.3],
  ['bp-ant-l', 0.28, 0.36], ['bp-ant-r', 0.32, 0.4], ['bp-ant-base', 0.36, 0.42],
  ['bp-knob', 0.4, 0.46], ['bp-knob2', 0.44, 0.5],
  ['bp-g1', 0.48, 0.52], ['bp-g2', 0.5, 0.54], ['bp-g3', 0.52, 0.56],
  ['bp-foot-l', 0.56, 0.6], ['bp-foot-r', 0.58, 0.62],
  ['bp-dim-l', 0.64, 0.68], ['bp-dim-r', 0.64, 0.68], ['bp-dim', 0.66, 0.74],
  ['bp-lead-0', 0.76, 0.82], ['bp-lead-1', 0.8, 0.86], ['bp-lead-2', 0.84, 0.9], ['bp-lead-3', 0.88, 0.94],
];
// onUpdate: order.forEach(([id, a, b]) => seg(el(id), p, a, b)); dot.opacity = p > 0.96
```

- [ ] **Step 3: CSS**。`#blueprint rect, #blueprint line` 选择器扩为 `#blueprint rect, #blueprint line, #blueprint circle, #blueprint path`（circle 也吃 dasharray/dashoffset 初始隐藏）；`.bp-lead { stroke-dasharray: 100; opacity: 0.55; }`；删除 `.bp-ray` 规则。
- [ ] **Step 4: 验证**。子页 feat 区三个滚动进度截图（30%/60%/95%）：线稿按序绘制、读得出"这是台电视"、引线大致指向四角标签。坐标不对就在此步调。
- [ ] **Step 5: Commit**：`子页蓝图重画为 CRT 电视解剖线稿（滚动绘制顺序重排）`

---

### Task 7: A1 相机定档 + headline 对位 + 电视建模细节

**Files:**
- Modify: `src/three/stage.ts:66`（startPos）、`src/three/tv.ts`（天线/音量旋钮/刻度环/侧面凹槽线）、`src/styles/main.css:142-170`（#hero-headline top）

**Interfaces:**
- Produces: tv.ts 新增部件均挂进现有 `group`，不改 `Tv` 接口；`knob` 仍是唯一可点旋钮

- [ ] **Step 1**: stage.ts `startPos = new THREE.Vector3(0, 0.16, 8.3)`。
- [ ] **Step 2**: main.css `#hero-headline { top: 15vh; }`，`.hh-tag { margin-bottom: 12px; }`；移动端 `top: 11vh`。
- [ ] **Step 3: tv.ts 建模**（buildTv 内追加）：

```ts
// V 形天线（机顶后部）
const antMat = accentMat;
for (const dir of [-1, 1]) {
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.6, 8), antMat);
  ant.position.set(dir * 0.16, 0.46 + 0.26, -0.18);
  ant.rotation.z = dir * -0.55;
  group.add(ant);
}
const antBase = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), darkMat);
antBase.position.set(0, 0.455, -0.18);
group.add(antBase);

// 音量旋钮（小一号，不可点）+ 主旋钮刻度环
const knob2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.026, 20), accentMat);
knob2.rotation.x = Math.PI / 2;
knob2.position.set(0.42, -0.17, 0.47);
group.add(knob2);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  const tick = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.008), darkMat);
  tick.position.set(0.42 + Math.cos(a) * 0.068, -0.27 + Math.sin(a) * 0.068, 0.465);
  tick.rotation.z = a;
  group.add(tick);
}

// 侧面装饰凹槽线（两侧各 2 条，暗色细条）
for (const sx of [-1, 1]) {
  for (const dz of [-0.18, 0.12]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.7, 0.02), darkMat);
    groove.position.set(sx * 0.581, -0.02, dz);
    group.add(groove);
  }
}
```

- [ ] **Step 4: 验证**。`node tvsize.mjs` 改为只拍当前参数（或直接 capture 02/03 机位）：电视 +27% 且 headline 不压电视、天线/双旋钮/刻度环可见、夜间同样成立；`labelAnchor` 投影的「切换 日/夜」标签位置仍合理（不合理就微调 stage.ts labelAnchor y）。移动端 hero 一张。
- [ ] **Step 5: Commit**：`hero：相机定档 +27%，电视添加天线/音量旋钮/刻度环/侧面凹槽，headline 对位`

---

### Task 8: A2 柜面道具

**Files:**
- Create: `src/three/props.ts`
- Modify: `src/three/stage.ts`（挂载 + THEMES 增补 + setTheme lerp）

**Interfaces:**
- Produces: `buildProps(): { group: THREE.Group; mats: Record<'plastic'|'label'|'pot'|'leaf', THREE.MeshStandardMaterial> }`；stage 的 THEMES 增加 `props: { plastic, label, pot, leaf }` 两套色

- [ ] **Step 1: props.ts**：

```ts
import * as THREE from 'three';

/** 柜面道具：录像带堆 ×3、遥控器、小盆栽。低多边形，色随日/夜主题 lerp。 */
export function buildProps() {
  const group = new THREE.Group();
  const mats = {
    plastic: new THREE.MeshStandardMaterial({ color: 0x2b2823, roughness: 0.8 }),
    label: new THREE.MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4a6b45, roughness: 0.85 }),
  };
  const Y = -0.54; // 柜面
  // 录像带堆（左）
  const tapes = [
    { x: -1.05, y: Y + 0.04, r: 0.06 },
    { x: -1.02, y: Y + 0.12, r: -0.09 },
    { x: -1.07, y: Y + 0.2, r: 0.03 },
  ];
  for (const t of tapes) {
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.24), mats.plastic);
    tape.position.set(t.x, t.y, 0.05);
    tape.rotation.y = t.r;
    tape.castShadow = true;
    group.add(tape);
    const label = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.005), mats.label);
    label.position.set(t.x, t.y, 0.05 + 0.123);
    label.rotation.y = t.r;
    group.add(label);
  }
  // 遥控器（右前，斜放）
  const remote = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.26), mats.plastic);
  remote.position.set(0.95, Y + 0.014, 0.28);
  remote.rotation.y = 0.5;
  remote.castShadow = true;
  group.add(remote);
  for (let i = 0; i < 6; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), mats.label);
    btn.position.set(0.95 + ((i % 2) - 0.5) * 0.04, Y + 0.032, 0.22 + Math.floor(i / 2) * 0.05);
    group.add(btn);
  }
  // 盆栽（右远）
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 10), mats.pot);
  pot.position.set(1.45, Y + 0.07, -0.1);
  pot.castShadow = true;
  group.add(pot);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07 - i * 0.015, 0.22, 7), mats.leaf);
    leaf.position.set(1.45 + (i - 1) * 0.05, Y + 0.24 + i * 0.05, -0.1 + (i % 2) * 0.04);
    leaf.rotation.z = (i - 1) * 0.28;
    group.add(leaf);
  }
  return { group, mats };
}
```

- [ ] **Step 2: stage.ts**。THEMES 两套增加 `props` 色（day 用上面初始色；night：plastic 0x1a1a1a、label 0x555048、pot 0x4a3626、leaf 0x2c3d2a）；构造器 `this.props = buildProps(); this.scene.add(this.props.group);`；setTheme 里对四个 mats lerpColor。
- [ ] **Step 3: 验证**。日/夜两张 hero 截图：道具就位不抢戏、不穿模、影子正常、夜间颜色随主题;移动端 hero 道具不出画框裁切怪异（出了就把盆栽 x 收进来）。
- [ ] **Step 4: Commit**：`hero：柜面道具（录像带堆/遥控器/盆栽），色随日夜主题`

---

### Task 9: A3 光影（窗光 / 夜辉光 / 尘埃 / 假反射）

**Files:**
- Modify: `src/three/stage.ts`（新增光源/粒子/镜像 + THEMES + setTheme + tick）
- Modify: `src/three/tv.ts`（所有材质 `side: THREE.DoubleSide`，镜像翻转需要）

**Interfaces:**
- Produces: stage 内部私有成员 `windowLight/glow/dust/mirror`，THEMES 增 `window/glow/dust` 强度字段

- [ ] **Step 1: 窗光（日间）**。canvas 画窗格图案作 spotlight.map：

```ts
function windowGobo(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#fff';
  for (const [x, y] of [[28, 28], [140, 28], [28, 140], [140, 140]]) c.fillRect(x, y, 88, 88);
  return new THREE.CanvasTexture(cv);
}
// 构造器：
this.windowLight = new THREE.SpotLight(0xffe6bd, THEMES.day.window, 24, Math.PI / 5.2, 0.32, 1.3);
this.windowLight.position.set(-5.2, 3.4, 4.6);
this.windowLight.target.position.set(1.1, -0.5, -1.3);
this.windowLight.map = windowGobo();
this.windowLight.castShadow = true;
this.scene.add(this.windowLight, this.windowLight.target);
```

THEMES：day.window = 2.4，night.window = 0。

- [ ] **Step 2: 夜辉光**。`this.glow = new THREE.PointLight(0x3fd8c0, 0, 2.6, 1.8)` 位置 (-0.13, 0.1, 0.95)；THEMES day.glow=0 / night.glow=1.2；setTheme lerp 到 `this.glowBase`（新增成员），tick 里 `this.glow.intensity = this.glowBase * (0.93 + 0.07 * Math.sin(t * 0.0113) * Math.sin(t * 0.0047))`（reduced-motion 时不乘扰动）。
- [ ] **Step 3: 尘埃**。构造器建 `THREE.Points`：120 粒（`innerWidth < 768` 时 60），BufferGeometry 随机分布 x∈[-1,1] y∈[-0.5,2.4] z∈[-0.5,1.1]，PointsMaterial `{ size: 0.016, color: 0xfff2d8, transparent: true, opacity: 0, depthWrite: false }`；THEMES day.dust=0 / night.dust=0.32，setTheme lerp material.opacity；tick 里每粒 y 匀速下漂 0.0005 wrap（reduced-motion 静止）。
- [ ] **Step 4: 假反射**。tv.ts 所有 MeshStandardMaterial/MeshBasicMaterial 加 `side: THREE.DoubleSide`；stage 构造器：

```ts
this.mirror = this.tv.group.clone(true);
this.mirror.scale.y = -1;
this.mirror.position.y = 2 * -0.54; // 关于柜面 y=-0.54 镜像
this.scene.add(this.mirror);
// 渐变遮罩（柜面色→透明），盖在镜像上方
const fadeCv = document.createElement('canvas');
fadeCv.width = 4; fadeCv.height = 128;
const fc = fadeCv.getContext('2d')!;
const g = fc.createLinearGradient(0, 0, 0, 128);
g.addColorStop(0, 'rgba(0,0,0,0.55)');
g.addColorStop(0.7, 'rgba(0,0,0,0.95)');
g.addColorStop(1, 'rgba(0,0,0,1)');
fc.fillStyle = g; fc.fillRect(0, 0, 4, 128);
this.mirrorFade = new THREE.Mesh(
  new THREE.PlaneGeometry(3.4, 1.6),
  new THREE.MeshBasicMaterial({ color: THEMES.day.shelfTop, alphaMap: new THREE.CanvasTexture(fadeCv), transparent: true, depthWrite: false }),
);
this.mirrorFade.position.set(0, -0.54 - 0.8, 0.755); // 竖直面片贴在柜面前沿上方？——不对：镜像在柜面"下方"只在柜面顶面可见
```

**注意**：镜像电视只透过"柜面顶面"可见，正确做法是把 mirrorFade 做成**水平面片**平躺在柜面顶（y=-0.5395，rotation.x=-PI/2，尺寸 3.4×1.6），材质 color=shelfTop、透明 alphaMap 从 TV 脚下向外变实。setTheme 里 lerp mirrorFade 材质 color 同 shelfTopMat。镜像组不投影不接影（traverse 关 castShadow）。

- [ ] **Step 5: 验证**。四张截图：日 hero（窗光斑在墙+柜面、有窗格形状、电视投影自然）、夜 hero（辉光映亮机身周围、尘埃在光柱里、不过曝）、日/夜柜面均有微反射且渐隐自然。帧率目检：dev 面板滚动无卡顿（或 tick 内 console.time 抽查 < 4ms）。
- [ ] **Step 6: Commit**：`hero 光影：日间窗光斑、夜间屏幕辉光与尘埃、柜面假反射`

---

### Task 10: A4+A5 屏幕叙事（开机 / 节目条 / 测试卡 / 失稳 / 彩蛋）+ 声音 + headline 调入

**Files:**
- Modify: `src/three/screen.ts`（重构为离屏 buf 合成 + 四模式）、`src/three/stage.ts`（progress 透传 + screen 点击）、`src/core/sound.ts`（poweron/zap）、`src/main.ts`（开机时序 + headline 类 + 屏幕点击音）、`src/content.ts:27`（CH 03→CH 00）、`src/styles/main.css`（hh-tune 动画）

**Interfaces:**
- Produces: `ScreenFX.powerOn(): void`、`ScreenFX.setProgress(p: number): void`、`ScreenFX.egg(): void`；`Stage.powerOnScreen(): void`、`Stage.onScreenClick(fn: () => void): void`；`sound.play` 联合类型加 `'poweron' | 'zap'`

- [ ] **Step 1: content.ts**。corners `'CH 03'` → `'CH 00'`。
- [ ] **Step 2: screen.ts 重构**。update() 改为：全部内容先画进离屏 `buf`（同尺寸 canvas），再按状态合成到主 canvas：

```ts
private buf = document.createElement('canvas');   // 构造器里同尺寸 + scale(res,res)
private mode: 'live' | 'boot' = 'live';
private bootT0 = 0;
private progress = 0;
private eggFlash = 0;
private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

powerOn() {
  if (this.reduced) return;            // reduced：保持稳定画面
  this.mode = 'boot';
  this.bootT0 = 0;                     // 首帧盖时间戳
  this.loop.stop(); this.text = '';
  this.loop = new TypeLoop({ stem: COPY.screen.stem, words: COPY.screen.words, typeMs: 64, onUpdate: (t) => (this.text = t) });
  this.loop.start();
}
setProgress(p: number) { this.progress = p; }
egg() {
  this.eggFlash = 1;
  this.glyphIdx = (this.glyphIdx + 1) % GLYPHS.length;
  this.lastGlyphSwap = performance.now() + 1200; // 冻结新图标一拍
}
```

合成顺序（主 canvas）：
1. 终端画面照旧画进 buf（headline/logs/corners/glyph/crosshair 原逻辑搬进 drawLive(bc)）；
2. **节目条**：buf 底部 y=H-56 处 20px 深色带 + teal 跑马灯文本 `正在播出：作品集 · CH 00 ── ` `x = W - ((now * 0.06) % (textW + W))`；
3. **测试卡**：`const tc = smoothstep(0.62, 0.78, this.progress)`，tc>0 时另画 drawTestcard(bc2) 进第二离屏（或直接主画布 globalAlpha 混合）：同心圆 3 环 + 底部 6 色条带 + 十字线 + 左上大号 `CH 00` + 中心 5×6 像素 CRY logo（复用 logo.ts 的 C/R/Y 位图常量思路，本地重写 20 行）；
4. **v-hold 失稳**：`k = reduced ? 0 : smoothstep(0.25, 0.75, progress) * (1 - tc)`，主画布 `roll = (now * 0.22 * k) % H`，两次 drawImage(buf, 0, roll) / (0, roll - H)；k>0.4 时随机水平撕裂：取 1-2 条高 6px 的带 drawImage 横移 ±12px；
5. **开机**：mode==='boot' 时按 `bt = now - bootT0`：0–260ms 全黑 + 中心水平亮线（宽度 easeOut 展开）；260–520ms 亮线纵向展开为全屏白→常规画面 alpha 淡入；>650ms `mode='live'`；
6. **彩蛋闪**：eggFlash>0 时叠 `eggFlash*0.8` 透明度的随机噪点（复用 nosignal 的 ImageData 噪点写法，仅 1/4 分辨率块），每帧 `eggFlash *= 0.8`，<0.05 归零；
7. 扫描线+闪烁保持在最后（原逻辑）。

- [ ] **Step 3: stage.ts**。`tick()` 内加 `this.screenFX.setProgress(this.progress)`；`raycast()` 命中 screen 时已有 setPointer——click 监听里 `if (hit === 'screen') { this.screenFX.egg(); this.onScreen?.(); }`；新增 `onScreenClick(fn)` 存 `this.onScreen`；新增 `powerOnScreen() { this.screenFX.powerOn(); }`。
- [ ] **Step 4: sound.ts**。union 加 `'poweron' | 'zap'`：

```ts
case 'poweron': // CRT 上电：消磁闷响 + 显像管升压扫频 + 静电噼啪
  this.blip(t, 88, 0.42, 0.13, 'sine');
  this.sweep(t + 0.06, 300, 1300, 0.5, 0.045);
  this.noise(t + 0.02, 0.22, 0.035, 3200);
  break;
case 'zap': // 点击屏幕彩蛋：短促静电
  this.noise(t, 0.09, 0.06, 1900);
  this.blip(t, 1300, 0.04, 0.035, 'square');
  break;
```

- [ ] **Step 5: main.ts**。`runPreloader(ready).then()` 开头加：

```ts
stage?.powerOnScreen();
sound.play('poweron');
document.getElementById('hero-headline')!.classList.add('hh-in');
stage?.onScreenClick(() => sound.play('zap'));
```

- [ ] **Step 6: CSS headline 调入**：

```css
.hh-in .hh-title { animation: hh-tune 0.7s steps(7) both; }
@keyframes hh-tune {
  0% { opacity: 0; text-shadow: -7px 0 rgba(255, 40, 80, 0.6), 7px 0 rgba(40, 210, 255, 0.6); transform: skewX(-5deg); }
  45% { opacity: 1; text-shadow: -3px 0 rgba(255, 40, 80, 0.4), 3px 0 rgba(40, 210, 255, 0.4); }
  100% { opacity: 1; text-shadow: none; transform: none; }
}
@media (prefers-reduced-motion: reduce) { .hh-in .hh-title { animation: none; } }
```

- [ ] **Step 7: 验证**。headless 时序截图：t=preloader 结束 +150ms（亮线展开中）、+400ms（纵向展开）、+1.5s（稳定 live + 节目条跑马灯）；dolly p≈0.5（失稳可见）、p≈0.75（测试卡渐入）、p=1（测试卡完整清晰）；点击屏幕 evaluate 触发 egg 后截图（噪点闪 + 图标换）；reduced-motion 模拟（`page.emulateMediaFeatures`）确认直达稳定画面无 boot/失稳。build 通过。
- [ ] **Step 8: Commit**：`屏幕叙事：CRT 开机、节目条、测试卡、推进失稳、点击彩蛋；开机/静电合成音；headline 信号调入`

---

### Task 11: 全站回归 + 移动端 + reduced-motion + 推送

**Files:**
- 只改回归中发现的问题；无新功能

- [ ] **Step 1**: `npm run build` 通过。
- [ ] **Step 2**: 跑全套 `capture.mjs`（19 机位）+ `tvsize.mjs` 现参数，逐张目检对照规格验收清单（尺寸档、测试卡、海报、蓝图、胶囊按钮、角标、刻度尺、断词、遮蔽带）。
- [ ] **Step 3**: `page.emulateMediaFeatures([{name:'prefers-reduced-motion', value:'reduce'}])` 重拍 hero/about/子页三张：无动画路径内容完整。
- [ ] **Step 4**: 移动端五机位重拍：无破损、刻度尺/信号条隐藏、hero 构图成立。
- [ ] **Step 5**: 发现问题就地修复并归入 `修复：视觉回归问题（回归验证轮）` commit；无问题跳过。
- [ ] **Step 6**: `git remote -v` 确认 origin 后 `git push origin main`（Vercel 自动部署）；`git log origin/main..main` 确认无残留。

---

## Self-Review 记录

- 规格覆盖：A1(T7)、A2(T8)、A3(T9)、A4+A5(T10)、B1/B2/B3/B6(T4)、B4+C 海报(T5)、B5(T6)、C pill hover(T1)、D1-D5(T1/T2/T3/T1/T3)——D4 logo 对比度在 T1 Step 3。无遗漏。
- 类型/命名一致性：`powerOnScreen/onScreenClick/setProgress/egg/powerOn` 前后一致；THEMES 新字段 `window/glow/dust/props` 在 T8/T9 各自引入且不冲突。
- 占位符扫描：像素龙 DRAGON 位图与蓝图 SVG 坐标标注为"初稿+截图迭代"，迭代步骤就是验收步骤本身，非悬空 TODO。
