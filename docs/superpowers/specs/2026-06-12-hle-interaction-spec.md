# HLE.io 交互与动效复刻规格说明

> 依据：76 秒录屏的 9 段逐帧观察报告（已去重合并）+ 技术调研。
> 已确认技术栈：Nuxt 2 + Vue、Three.js（Draco GLB 电视模型 `/models/tv1.glb` + 屏幕视频纹理 `/models/tv_square.mp4`）、GSAP + ScrollTrigger、Swiper、Lottie、Howler.js（UI 音效）、Strapi CMS（api.hle.io）、字体 PP Supply Sans（Pangram Pangram）。
> 注意：录屏中 godly.website 包装层 UI（Index/Info 胶囊、Subscribe + 按钮、闪电图标）**不属于** HLE 站点，不复刻。录屏中原生箭头光标可见是 iframe 嵌套所致，独立复刻时应 `cursor: none`。

---

# 一、站点结构总览

## 首页（hle.io，按滚动顺序）

| # | 区块 | 内容与核心动效一句话 |
|---|------|---------------------|
| 0 | Preloader 预加载层 | 纯黑全屏，左上超大打字机标题"Positioned at the axis of talent and content across film/television/music"循环 + 底边 1px 进度细线，加载完毕后整层向上滑出揭幕 |
| 1 | Hero 3D 场景 | 灰色摄影棚场景，CRT 电视居中立于贯穿全宽的台面上，屏幕实时播放第二区块的微缩镜像（render-to-texture）；点击电视旋钮切换 Day/Night 主题 |
| 2 | Hero→About 镜头转场 | 向下滚动驱动 3D 相机向电视屏幕 dolly-in（放大约 6–8 倍），越过阈值触发全屏"NO SIGNAL"静噪，落入平面 DOM 的 About 区 |
| 3 | About / 定位区（"屏幕内部"） | 深灰点阵网格底，左上三行打字机大标题（尾词轮换），右侧对角阶梯排布编号流程标签 (1)Develop–(4)Pitch，青色像素蛇/精灵在网格上游走 |
| 4 | Our projects 画廊区 | 超大描边标题 + 横排四张 3D 倾斜的电影提案海报卡片，倾斜角随滚动速度变化（velocity skew） |
| 5 | 主张区（Manifesto） | 两行居中巨型标题"Helping people get their idea sold"打字机入场，叠加旋转约 -15~-20° 的暗灰"回声"错位层（随滚动联动） |
| 6 | 首页页脚 | 巨大细描边圆形（圆心亮点）、细线矩形框内三行使命宣言、"Get In Touch"胶囊按钮分步显现、法务链接 + HL 标志 + 署名 |

## About 子页（/about，点击导航"About us"经 NO SIGNAL 路由转场进入）

| # | 区块 | 内容与核心动效一句话 |
|---|------|---------------------|
| A1 | About Hero | 黑底居中超大标题"About HLE company"打字机入场，中轴贯穿一条细垂直发丝线（"axis"母题），副标题段落逐词灰→白揭示 |
| A2 | 使命段落 | "HLE creates opportunities…"灰色等宽小字逐行淡入，滚过页头时被顶部渐隐遮罩裁切 |
| A3 | Features 50/50 分屏 | 左半 sticky 亮灰"发光屏"面板内滚动驱动的蓝图线稿绘制动画（方形+十字+中心点+放射线），右半 Feature #1–#4 文案逐行揭示，四角"Feature"角标随当前项高亮 |
| A4 | CTA / 页脚 | 竖线引出"Create Idea"标签，巨型打字机标题"If you want to send your idea"，分隔线内嵌乱码解码小字"Just push the button"，"Netpitch"胶囊按钮分步入场 |

---

# 二、全局系统（贯穿元素）

## 2.1 自定义光标（双层结构）

- **页面级准星**：细线十字准星（reticle），由上下左右四段短粗线/虚线组成、中心留空（带中心小点），整体约 30px。以 lerp 缓动跟随指针：快速甩动时落后约 30–40px / 100–300ms，停下后 0.5–1s 追平；指针离开窗口后沿最后运动方向继续惯性滑行数秒。建议 `requestAnimationFrame` + `lerp(0.1~0.15)`。
- **CRT 屏内大准星**：悬停 3D 电视屏幕时，屏幕内容层额外渲染一个由四根粗白条组成、中心留空的大号十字准星，跟随更迟缓（lerp 约 0.05–0.1）；指针移出屏幕后继续漂移 1s 以上才淡出。可在屏幕纹理 canvas 层直接绘制。
- **主题感知配色**：Day 模式准星偏深灰/黑，Night 模式为白色（推测 `mix-blend-mode: difference` 或主题变量）。
- 路由转场（NO SIGNAL 静噪）期间自定义光标消失，转场结束恢复。Preloader 期间不激活。
- 复刻独立站点时隐藏原生指针（`cursor: none`），仅显示准星。

## 2.2 平滑滚动

- 全站 Lenis/Locomotive 手感的惯性平滑滚动（实际由 GSAP ScrollTrigger 体系驱动）：滚轮分段触发，快速启动 + 指数缓出长尾减速，单次轻拨位移约 200–300px、历时 0.6–0.8s；大幅滚动减速尾巴持续 1.5–2s。
- 滚动同时驱动：Hero 相机 dolly-in（scrub）、文字逐行揭示、蓝图线稿绘制进度、海报倾斜角、标题回声层位移。

## 2.3 Day / Night 主题切换

- 触发器：Hero 电视面板左下角的圆形黑色旋钮（由手绘弧线箭头 + 等宽标签"Switch Day 'N' Night"标注引导）。悬停无 pointer 手型变化。
- 点击后整个 3D 场景做约 0.6–0.7s 的全局颜色/光照渐变（ease-in-out）：点击后约 0.05–0.1s 桌体前立面率先变暗，随后墙面在 0.3–0.5s 内持续压暗，约 0.65s 稳定。不同朝向的面变暗速率不同——说明是 3D 光照/材质颜色 lerp，而非整页滤镜。
- Night 态：墙面深炭灰近黑（#1e1e1e–#2c2c2c），电视上方光晕保留并成为主光源（聚光灯效果）；UI 文字同步从深字浅底反转为浅字深底；自定义光标变白。
- 建议实现：Three.js 灯光/材质颜色补间（GSAP，~650ms ease-in-out）+ 全局 CSS 变量过渡同步。

## 2.4 Sound 开关

- 右上角"Sound"等宽标签 + 深色胶囊形 toggle（内有圆形旋钮，左=关 / 右=开）。点击切换全站 UI 音效（Howler.js）。录屏中未被点击，开/关初始态两段观察不一致（多数帧为旋钮偏左=关），建议默认关闭、点击后滑块带短促位移动画。

## 2.5 固定页头（四角 HUD 布局，position: fixed，滚动/缩放期间全程不动）

- **左上**：纵向导航三项"About us / Contacts / FAQ"，每项前缀小圆形 bullet，等宽小字。**悬停触发字符 scramble 故障动效**：字母瞬时错位/重叠/扭曲（如"Abou^t-as"状），约 100–200ms 一轮反复抖动。真实 `<a>` 链接（/about 等）。
- **顶部居中**：HL 像素连体字标（H 与 L 共笔、积木/点阵风）。**常驻 glitch 循环**（时间驱动，周期约 0.5–1s，离散帧切换无补间）：在完整"HL"字形 ⇄ 稀疏像素点阵 ⇄ 随机乱码字符 ⇄ 半组装字形之间跳变，间或闪现一帧"反色 + 横向切片错位 + 黑色扫描横条"。建议用 Lottie 或逐帧 sprite + 随机 text-scramble。
- **右上**：等宽实时时钟"01 : 33 pm"（冒号两侧带空格），按真实分钟跳变更新（录屏中观察到 01 : 33 → 01 : 34）。
- 在内页/深色区块中，页头 logo 偶以 CRT 闪烁感（非平滑淡入）出现。

## 2.6 固定底栏（Hero 态）

三栏等宽小字：左"// Positioned at the axis of talent and content across film"（两行折行）；中"Scroll Down ■"（实心小方块，疑似闪烁）；右实时时钟。Hero 相机缩放期间与四角 UI 一起保持不动。

## 2.7 Preloader（每次加载均执行）

1. 背景两步变化：（浏览器空白后）中灰 #6a6a6a → 0.5s 内压暗至近黑 #0a0a0a–#111。
2. 左上先出现一根孤立的白色实心竖条光标（约 10px 宽 × 大写字高，~0.5s 闪烁）。
3. 打字机逐字打出超大白色标题"Positioned at the axis of talent and content across film"，左对齐自动换行成 2–3 行；速度约 15–20 字符/秒，线性逐字、带轻微随机抖动（6–12 字符/0.5s）；竖条光标始终缀在末字符后。
4. **尾词轮换循环**：整句完成停留 1–2s → 仅退格删除尾词（更快，约 30–50ms/字符，10 字符 ≤0.5s 删完）→ 停约 0.2s → 打出下一词。词序循环：**film → television → music → film…**。句干始终保留。
5. 同步：视口底边（距底约 20–38px）一条 1px 灰白进度细线从左向右近线性增长（资源加载进度驱动），约 7s 走满。
6. **揭幕转场**：进度满后黑色面板整体 translateY 向上滑出 100vh，总时长约 0.8–1s，强 ease-in 起步、爆发式收尾（建议 power3.inOut / expo.inOut, 0.9s）；面板上滑时标题随之被裁切，无淡出；下层 Hero 已是最终静态，无额外元素入场动画。

## 2.8 NO SIGNAL 路由/区块转场

用于两处：① Hero 相机推进越过阈值时（3D→DOM 图层切换，约 0.5–1s）；② 点击导航的 SPA 路由跳转（约 1.2–1.3s）。质感像预渲染静噪视频或 canvas/shader 叠加层，硬切 + 爆闪、无缓动曲线。路由版完整时序：

1. 整屏切黑，距顶约 20% 出现一条暗藏青色水平故障带；
2. 故障带跳至视口顶端（牛仔布纹理感蓝色横带）；
3. 一条白青色亮带滚到视口底部（CRT 垂直失锁滚屏）；
4. 几乎整屏白蓝爆闪（细密人字纹/扫描线）；
5. 全屏蓝灰电视雪花静噪 + 上下两处粗糙做旧高窄大写"NO SIGNAL"（约 38% 与 80% 高度，间有故障重影），上方文字处横穿一条更亮静噪带（缓慢漂移），噪点逐帧随机（~0.3s）；
6. 噪点变暗变疏 → 几乎全黑 → 露出新页面。

转场前后页面骨架（导航、logo、时钟位置）完全连续，强化"换台"而非"跳页"的隐喻。

## 2.9 其它贯穿装饰

- 视口四周一圈极低对比度的大圆角矩形描边（CRT 荧幕外框母题），首页深色区与页脚背景均隐约可见。
- 顶部约 1/4 与 3/4 宽度处恒有两颗小白点（registration dots，区块切换后仍存在）；标题两端、区块角落散布小白点/十字校准标记。
- 全页极淡胶片颗粒/噪点叠加。
- 页脚（首页与子页共用底排）：左"Privacy policy"/"Terms of use"，中 HL 像素标志（故障风），右"Created by"（暗灰）+"The First The Last"（亮白）。

---

# 三、逐区块规格

## 3.0 Preloader

见 2.7（属全局系统，每次加载执行）。版式：标题距左/上边距约 32–44px（约视口 3–4% / 8%），字号约视口宽 7–8%/行（1440 设计稿约 80–90px），行高极紧约 1.05，占视口宽约 70–75%。

## 3.1 Hero 3D 场景

**版式/内容**
- 全屏 Three.js 场景：中性灰墙面（Day 约 #8a8a8a–#a5a5a5，带自上而下渐变与四角 vignette），约 65% 视口高度处一条贯穿全宽的浅灰台面（搁板，台沿亮灰、前立面略深一档）。
- CRT 电视（GLB 模型 tv1.glb，奶白/米白塑料壳）居中立于台面，约占视口宽 12%；电视正上方柔和径向光晕（Day 为淡亮斑，Night 为主光源）；台面上柔和接触阴影（光源左上方，影偏右）。
- 电视细节：圆角玻璃屏占机身上 2/3、深色内凹带弧形遮罩；面板左侧三个斜置拨杆开关（上有极小标签字）；左下角圆形黑色旋钮（= Day/Night 开关）+ 小圆点指示灯；右侧竖条纹散热格栅 + 条码贴纸；机身左下垂一根细电源线出画。
- 手绘风细弧线箭头（~1px 灰线，末端开放式小箭头）从电视左下旋钮弯向台面下方，指向等宽标签"Switch Day 'N' Night"。
- 四角 HUD（见 2.5/2.6）。

**屏中屏（核心结构）**
- 电视屏幕 = 视频纹理 `/models/tv_square.mp4` 播放区，内容为 About 区的微缩镜像/终端 UI：墨绿近黑底 + 淡青细网格（坐标纸/扫描线），白色小号像素字打字机标题（与 Preloader 同一文案系统、独立循环，"axis"一词带反色高亮底色），数行微缩日志小字、四角 HUD 小标签。
- 青绿色（teal ~#4ad7c0）像素图形持续变化：约每 0.4–0.5s 在预设形状集合中切换（闪电、阶梯箭头、L 折线、问号曲线、电视机图标、双上箭头 ↑↑、横向进度条等），位置在屏内小范围漂移；图形与当前轮换词有对应关系（television→像素电视机图标等）；间或一个大号青色像素箭头携高亮条从左到右扫过底部日志行（选中/划线强调）。
- 屏幕整体带轻微闪烁/噪点抖动。

**交互**
- 点击电视旋钮 → Day/Night 切换（见 2.3）。
- 悬停屏幕 → 屏内大十字准星（见 2.1）。
- 微视差：场景明暗与"Switch Day 'N' Night"标签随光标有数像素的水平漂移（低置信度，建议 ±3–5px 鼠标视差）。

**滚动行为（Hero → About 转场）**
- 向下滚动不平移页面，而是映射为 3D 相机向 CRT 屏幕 dolly-in（scrub 可逆）：约 4s 内电视从视口 12% 宽放大到屏面充满视口（6–8 倍）；增量先小后大（前 2s 每帧 +2–5%，后 1.5s 每帧 +30%+），滚动进度映射 + lerp(~0.1) 平滑的加速手感。固定 UI 全程不动；"Switch Day 'N' Night"标注锚定电视底座随缩放移出视口。
- 贴近屏幕时屏内内容已可读（即将进入的 About 区全部元素）；越过缩放阈值瞬间触发 NO SIGNAL 静噪（0.5–1s，疑似带 snap 接管），结束后落入真实 DOM 的 About 区。

## 3.2 About / 定位区（"屏幕内部"第一屏）

**版式/内容**
- 全视口平面布局，极深灰底（≈#0d0d0d）铺细密点阵/方格网格（约 12–28px 间距 1px 暗点/线，色约 #1e1e1e），越往下网格越淡。
- 左上：三行超大打字机标题（占宽约 45%），同一"句干 + 尾词轮换"循环（进入区块后从头重打一遍：约 15–18 字符/秒逐字入场，完成后进入轮换循环，光标 ~1Hz 闪烁）。
- 右侧沿对角阶梯散点分布编号流程标签：**(1) Develop**（标题右上）→ **(2) Submit** → **(3) Creative Review**（右中）→ **(4) Pitch**（右下角）。入场时按序瞬时浮现（延迟逐个 fade/pop，32.0–33.5s 内完成）。注：编号写法两段观察分别记作 `(1)` 与 `[1]`，以更高清帧的 `(1)` 圆括号为准。
- 标题下方左下：等宽宣言段落"HLE creates opportunities…align creator with buyer."；其下更暗的辅助行"1 place / to pitch your ideas to creatives and producers"。
- 右下角暗灰"Scroll Down"提示。区块顶部镜像页面导航与时钟。

**动效**
- 青色像素蛇/精灵（时间驱动，常驻）：cyan 像素折线沿背景网格逐格爬行，匀速直角转弯，约每 0.5s 移动一大步并变形（阶梯形/竖条/L 形/方块/S 折线/双上箭头），游走于各角落，疑似串联 (1)–(4) 标签的装饰路径；f_072–074 观察到其恰在光标旁变形，可设计"光标邻近时变形/跟随"交互兜底。f_074 中呈青→蓝纵向渐变竖条+阶梯组合。
- 视口底缘以极低对比度暗灰大字预埋下一区块标题"Our projects"顶部。

## 3.3 Our projects 画廊区

- 顶部挤一段等宽介绍文字："Positioned at the axis of talent and content across film, television, music and beyond. HLE creates opportunities…industry's mandates"。
- 超大标题"Our projects"，外有 1px 细灰描边矩形框；入场时首字母 O 先暗后亮（逐字提亮/CRT 闪烁式 reveal，约 0.5s）。
- 横排四张提案海报卡片（建议 Swiper/横排布局）：① 黑白照片 + 黑底机密文档海报（女子仰卧照、大号 HL、小字 BRANDON LASSEN & REIS MIND / EXECUTIVE PRODUCERS / LONIS-LASSEN ENTERTAINMENT LLC，右下"Proprietary and Confidential"）；② "$VILLE"白底海报（黑色大标题、握手特写、WRITTEN BY / EXECUTIVE PRODUCERS 署名行）；③ 深色"DreamScreen"海报（人影对发光屏幕、手写体片名、WRITTEN BY）；④ 白色打字机排版剧本页。每张下方有暗色小字幕注。
- **速度倾斜动效**：每张卡片带不同方向的 3D 透视倾斜（rotateY/rotateZ，梯形变形）；滚动速度越快倾斜越强，减速时回正（缓出，停止后约 1s 回弹），但静止后各自保留 ±5–8° 随机倾斜，呈散落卡片感。建议 ScrollTrigger `getVelocity()` → skew/rotate 映射。
- 静置时海报有极轻微横向漂移（鼠标视差或 idle 漂浮）；未观察到 hover 放大/变色。

## 3.4 主张区（Manifesto）

- 两行居中巨型标题"Helping people get / their idea sold"；进入视口后从左到右打字机显出（约 24 字符/秒）。
- **回声/故障层**：第二行上叠一份暗灰复制片段（如"ir idea s"），逆时针旋转约 15–20°、向右下偏移，带模糊/重影质感；偏移量随滚动位置缓慢变化（滚动联动）。标题向上滚出视口时整体淡出变暗。
- 标题左侧贴一个竖向小标签：像素 HL 标志 + 一行竖排微缩文字；标题两端各一个小白点装饰。
- 标题下方展开一个巨大的 1px 细描边圆形（直径约视口高 60%，圆心略高于视口中心、带小亮点，雷达/CRT 屏感），随滚动占据画面中部。

## 3.5 首页页脚

- 大圆下方压一个细描边矩形框：框顶上方小"↓"箭头字形，框内三行居中等宽宣言"Entertainment company helping people get their / idea sold to networks and production companies / through our contacts in NYC and LA"。入场：由暗灰渐亮并轻微上移（约 0.5–1s 缓出，滚动触发）。
- "Get In Touch"居中胶囊按钮（1px 白描边、全圆角、透明底、等宽标签）：**分步 reveal**——先出现描边轮廓（文字几乎不可见），约 0.5s 后标签文字淡入。
- 底排：左"Privacy policy""Terms of use"，中 HL 像素标志，右"Created by The First The Last"（Created by 较暗、署名较亮）。

## 3.6 About 子页

**A1 首屏**
- 进入方式：点击导航"About us" → NO SIGNAL 路由转场（见 2.8）→ 黑场入场。
- 超大白色标题"About HLE company"两行居中打字机打出（约 22–25 字符/秒，匀速，无光标符号）。
- 页面中轴一条贯穿的细垂直发丝线（"axis"母题）。左下等宽栏目标签"About Us"。
- 副标题段落"Positioned at the axis of talent and content across film, television, music and beyond."逐词/逐行打出，新词先呈中灰（≈#777）再于 300–400ms 内增亮到白（打字 + 淡入混合）。其下淡入极小"Scroll Down"提示 + 小圆点（随内容滚动，非固定）。

**A2 使命段落**
- 三行灰色等宽小字"HLE creates opportunities…"逐行淡入（最后一行最暗，scroll-triggered stagger）。
- 内容上滚进入页头区域时被垂直渐变遮罩裁切淡出（避免与固定导航打架）。

**A3 Features 50/50 分屏**
- 精确以视口中线为界：左半 sticky 亮灰发光面板（中心约 #a8a8a8，强烈 CRT 式圆角暗角晕影压到近黑，含细微颗粒与小黑点斑做旧）；右半近黑，纵向滚过 Feature #1–#4 四段文案（小号等宽标签 + 段落）。顶中 HL monogram 恰骑在明暗分界线上、左右反色。两面板顶部各一颗小白点。
- **蓝图线稿绘制（滚动驱动，非时间动画）**：左面板顺序为 空白 → 细线正方形轮廓 → 内部十字中分线 + 中心实心黑点 → 从中心向四面八方放射的细直线随滚动逐批累积（约 12 → 24+ 条，延伸越过方形边界，星爆/消失点构图）。疑似 SVG stroke-dashoffset 描边画线，进度与滚动位置绑定。
- 方形四角外侧各有小号"Feature"角标，高亮项随右列当前阅读的 Feature 序号即时切换（激活变亮白，其余暗灰）。
- 右列段落进入视口时末尾数行先呈 ~40% 灰，约 0.4–0.6s 内逐行升至全白，行间 stagger 约 0.05–0.1s（入场触发一次）。
- 早于分屏就位时，左面板中央先浮现一个细黑描边空心正方形线框（约视口宽 25%，描边绘制/淡入，约 0.5s）。

**A4 CTA / 页脚**
- 一条 1px 细竖线从区块顶垂下，连接小号等宽标签"Create Idea"。
- 巨型两行标题"If you want to send your idea"打字机逐字打出（约 15–20 字符/秒，总时长 ~1.7s，入场触发一次）。
- 标题右下方一条贯穿整版的 1px 水平分隔线，线中嵌小字"Just push the button"（文字两侧线断开），以**字符乱码解码（scramble/decode）**出现，与标题打字基本同期，约 1s 完成。
- "Netpitch"胶囊描边按钮分步入场：标题完成后 ~0.5s 先渐显空胶囊描边（~0.3s），再 ~0.5s 后内部暗灰文字"Netpitch"渐显。按钮纤细（约 86×25 CSS px），与巨型标题形成极端大小对比。
- 底排同首页页脚；背景埋低对比度巨大圆角矩形描边（CRT 荧幕轮廓）。

---

# 四、动效清单

| 动效名 | 触发 | 行为描述 | 复刻技术建议 |
|---|---|---|---|
| Preloader 打字机 + 尾词轮换 | 页面加载（每次） | 句干恒定，尾词 film→television→music 循环；打字 15–20 字符/秒（轻微随机），删除 30–50ms/字符，词间停 1–2s；实心竖条光标 ~1Hz 闪烁 | JS 定时器/GSAP TextPlugin 自写 typewriter 类，全站复用 |
| Preloader 进度线 | 资源加载进度 | 底边 1px 灰白线从左向右近线性增长至全宽 | 资源 loader 进度映射 scaleX |
| 揭幕上滑转场 | 进度满 | 黑面板 translateY -100vh，~0.9s，慢起爆发收尾 | GSAP `power3.inOut`/`expo.inOut` |
| Hero 相机 dolly-in | 滚动（scrub） | 相机推向电视屏幕，6–8 倍放大，进度映射 + lerp(~0.1) 平滑，可逆 | ScrollTrigger scrub + Three.js camera 沿路径插值；pin Hero 区 |
| NO SIGNAL 静噪转场 | 缩放阈值 / 路由点击 | 黑场→藏青故障带跳变→白青亮带垂直滚屏→白蓝爆闪→雪花噪点 + 双"NO SIGNAL"做旧大字→消散；0.5–1.3s 硬切爆闪无缓动 | 预渲染噪声视频或 canvas/WebGL 噪声 shader 全屏叠加层 |
| Day/Night 主题切换 | 点击电视旋钮 | 3D 场景光照/材质 0.6–0.7s 渐变（不同面速率不同），UI 颜色同步反转，光标变色 | GSAP 补间 Three.js 灯光/材质色 + CSS 变量 transition ~650ms ease-in-out |
| 屏中屏镜像 | 常驻 | 电视屏播放 About 区微缩版（打字机 + 像素图形 + 日志） | 官方实现为 mp4 视频纹理（tv_square.mp4）；像素级复刻可直接复用视频纹理，进阶用 render-to-texture |
| 青色像素精灵/蛇 | 常驻（时间驱动） | 像素图形每 ~0.4–0.5s 在预设形状集合切换并沿网格逐格漂移；偶有高亮条扫过文字 | Lottie 或 canvas 逐帧 sprite 集合 + 步进位移；离散切换、无补间 |
| HL logo glitch | 常驻循环（~0.5–1s 周期） | 完整字形⇄像素点阵⇄乱码⇄反色切片错位，离散帧切换 | 逐帧 sprite/Lottie + 随机 text-scramble |
| 导航 hover scramble | 悬停导航链接 | 字母瞬时错位/重叠扭曲，100–200ms 一轮反复抖动 | 自写 char-scramble（随机字符池逐位还原） |
| 自定义双层光标 | 指针移动 | 页面级小十字准星 lerp(0.1–0.15) 跟随；CRT 屏内大粗白十字 lerp(0.05–0.1)，离开后惯性漂移 ≥1s | rAF + lerp；屏内层绘制在屏幕 canvas/纹理上；mix-blend-mode 适配主题 |
| 平滑惯性滚动 | 滚轮 | lerp 惯性 + 指数缓出，单拨 200–300px / 0.6–0.8s | Lenis 或 GSAP ScrollSmoother（原站无 Lenis，自实现 lerp 滚动） |
| 海报速度倾斜 | 滚动速度 | 卡片 rotateY/rotateZ 随滚动速度增强，停止后 ~1s 回弹至各自 ±5–8° 静置随机角 | ScrollTrigger `getVelocity()` → gsap.quickTo skew/rotate |
| "Our projects" 逐字提亮 | 入场 | 首字母先暗后亮，~0.5s CRT 闪烁式 reveal | 逐字 span + stagger 透明度/亮度 |
| Manifesto 回声层 | 滚动联动 | 标题复制片段旋转 -15~-20° 偏右下，偏移随滚动变化；滚出时淡出 | ScrollTrigger scrub 映射复制层 transform |
| 段落逐行灰→白揭示 | 进入视口（滚动触发） | 行先 ~40% 灰，0.4–0.6s 升全白，行 stagger 0.05–0.1s；新词 300–400ms 增亮 | SplitText 按行/词 + ScrollTrigger stagger |
| 顶部渐隐遮罩 | 滚动 | 内容滚入页头区域时被垂直渐变裁切淡出 | CSS mask-image 线性渐变固定层 |
| 蓝图线稿绘制 | 滚动进度绑定 | 方形→十字→中心点→放射线逐批累积（12→24+ 条） | SVG stroke-dashoffset + ScrollTrigger scrub；sticky 左面板 |
| Feature 角标高亮 | 滚动到对应段 | 四角"Feature"标注随当前项即时亮白切换 | ScrollTrigger onToggle 切 class |
| 按钮分步 reveal | 滚动入场 | 先描边轮廓后文字，间隔 ~0.5s（Get In Touch / Netpitch 同款） | GSAP timeline：边框 opacity → 延迟 → 文字 opacity |
| "Just push the button" 解码 | 入场 | 随机字符逐位解析为正文，~1s | char-scramble decode |
| 编号菜单顺序入场 | 区块进入 | (1)→(4) 按序瞬时浮现（延迟逐个 fade/pop） | stagger 延迟 fade |
| 实时时钟 | 每分钟 | "01 : 33 pm" 格式跳变更新 | setInterval + 本地时间格式化 |
| UI 音效 | Sound 开启后各交互 | （录屏无声，未观察具体触发点） | Howler.js，hover/click/切换音效 |

---

# 五、设计语言

## 5.1 配色

**Day 模式（Hero 3D 场景）**
- 墙面中性灰垂直渐变 ≈#8a8a8a→#6f6f6f（不同段观察 #8a8a8a–#c5c5c5，取中性灰 ~#9a9a9a 基准），四角轻微 vignette，电视后上方径向光晕亮至 ≈#b0b0b0
- 台面顶面 ≈#9a9a9a、前立面 ≈#7c7c7c；电视机身奶白/米白
- UI 文字深炭色 ≈#2f2f2f–#3a3a3a

**Night 模式**
- 墙面深炭灰近黑 ≈#1e1e1e–#2c2c2c；光晕保留为暖灰聚光主光源；UI 文字反转为浅灰

**深色内容区（屏幕内部 / 内页，两主题共用）**
- 底色近黑 ≈#0a0a0a–#141414；主文字米白/暖白 ≈#e8e8e8–#f2f2f2；次级中灰 ≈#8a8a8a；辅助暗灰 ≈#4a4a4a–#555；网格线 ≈#1e1e1e；进度线/描边 1px 灰白或 ≈#2a2a2a hairline

**强调色（全站唯一彩色）**
- 青/薄荷绿 teal ≈#3ECFCF–#4ED8C7（观察值散布 #2EE6C8–#5fe0c8，取 ~#3fd8c0），仅用于 CRT 屏内像素图形与文字高亮，偶见青→蓝渐变

**转场色**
- NO SIGNAL：深藏蓝/黑底 + 蓝白噪点 + 白青爆闪

## 5.2 字体层级（PP Supply Sans 家族，等宽气质）

| 层级 | 用途 | 规格 |
|---|---|---|
| Display | Preloader/区块巨标题 | 超大号（1440 稿约 80–140px），左对齐或居中，行高 ~1.05，方正几何、圆角方体质感 |
| 中标题/副段 | About 副标题段落 | 约 36–44px |
| 正文段落 | 宣言/Feature 文案 | 等宽，约 14–16px |
| UI 标签 | 导航/时钟/标签/按钮 | 等宽小号 10–13px，字距略宽 |
| 像素/位图 | CRT 屏内、HL logo | 点阵像素字体，低分辨率 8-bit 风 |
| NO SIGNAL | 转场大字 | 做旧/侵蚀风格高窄大写 |

终端/代码符号体系：`//` 注释前缀、`■` 实心方块、`(1)` 括号编号、`01 : 33 pm` 带空格冒号、`↓` 字形箭头、导航前缀圆点 bullet、`+` 十字校准标记。

## 5.3 质感

- 1px 细线描边语言贯穿：标题外框、大圆、矩形框、胶囊按钮、分隔线、竖线、蓝图线稿——"技术蓝图/工程制图"美学。
- 点阵/方格网格底纹（CRT 像素隐喻）；全页极淡胶片颗粒；CRT 屏扫描线 + 网格 + 噪点抖动；亮面板 CRT 式圆角暗角晕影（中心亮四角黑）。
- 手绘风注释弧线箭头（说明书/图纸气质）。
- 海报做旧：黑白摄影、扫描纸张、打字机剧本排版、机密文档套话。

## 5.4 布局网格

- 四角环绕 + 居中主体：信息全部贴边（左上导航 / 顶中 logo / 右上开关或时钟 / 左下注释 / 底中提示 / 右下时钟），中央留给主体，留白极充分。
- Hero 对称居中构图，台面线在 ~65% 视口高。
- About 区：左对齐大标题 + 右侧对角散点标签的编辑感错位网格。
- Features：精确 50/50 明暗分屏，分界线在视口正中，左 sticky 右滚动。
- 主张区与页脚完全中轴对称（竖线—标签—巨标题—横分隔线—居中按钮）。
- 信息层级以"亮度分级"而非字号分级：暗灰→白的揭示既是动效也是阅读引导。

---

# 六、完整文案清单（英文原文，按区块）

## Preloader / 全站打字机
- Positioned at the axis of talent and content across film
- Positioned at the axis of talent and content across television
- Positioned at the axis of talent and content across music
- （尾词轮换序列：film → television → music → 循环）

## 全局固定 UI
- About us
- Contacts
- FAQ
- HL（像素 logo）
- Sound
- Switch Day 'N' Night
- // Positioned at the axis of talent and content across film
- Scroll Down ■
- 01 : 33 pm（实时时钟示例）

## 转场
- NO SIGNAL（出现两处）

## About / 定位区（首页第二屏）
- (1) Develop
- (2) Submit
- (3) Creative Review
- (4) Pitch
- HLE creates opportunities for the storytellers, trendsetters, and creatives of all types who are looking to get their message amplified. By helping shape original media that appeals to the industry's mandates and long-term visions, HLE is able to align creator with buyer.
- 1 place
- to pitch your ideas to creatives and producers
- Scroll Down

## Our projects 画廊区
- Our projects
- Positioned at the axis of talent and content across film, television, music and beyond. HLE creates opportunities for the storytellers, trendsetters, and creatives of all types who are looking to get their message amplified. By helping shape original media that appeals to the industry's mandates
- $VILLE
- WRITTEN BY
- EXECUTIVE PRODUCERS
- DreamScreen
- BRANDON LASSEN & REIS MIND
- LONIS-LASSEN ENTERTAINMENT LLC
- Proprietary and Confidential

## 主张区
- Helping people get their idea sold

## 首页页脚
- Entertainment company helping people get their idea sold to networks and production companies through our contacts in NYC and LA
- Get In Touch
- Privacy policy
- Terms of use
- Created by The First The Last

## About 子页
- About Us（栏目标签）
- About HLE company
- Positioned at the axis of talent and content across film, television, music and beyond.
- Scroll Down
- HLE creates opportunities for the storytellers, trendsetters, and creatives of all types who are looking to get their message amplified. By helping shape original media that appeals to the industry's mandates and long-term visions, HLE is able to align creator with buyer
- Feature #1
- HLE has worked to collaborate with our partners as they look to build their careers and brands across multiple disciplines and platforms of the entertainment arena.
- Feature #2
- For our clients wanting to make a break into the industry, we advocate on their behalf within the marketplace and look for buyers that are most likely to be receptive to their content, and in turn the content is more likely to be produced at a high level.
- Feature #3
- We tap our internal and external interconnecting network of entertainment experts, relationships, and access while analyzing industry needs to help our clients achieve their goals.
- Feature #4
- HLE remains committed to pursuing undiscovered talent and pairing them with our industry partners to ultimately produce content that's unique and full of life.
- Feature（左侧线稿四角标注 ×4）

## About 子页 CTA / 页脚
- Create Idea
- If you want to send your idea
- Just push the button
- Netpitch
- Privacy policy / Terms of use / Created by / The First The Last

## 无法辨读（需在原站核实）
- CRT 屏内底部 3–4 行微缩终端日志（带短横线列表符）、屏幕四角 HUD 小标签
- 电视拨杆开关上方极小标签字
- Our projects 介绍段结尾（"…industry's mandates" 后可能截断）
