import { gsap, ScrollTrigger, lenis } from '../core/scroll';
import { sound } from '../core/sound';

/**
 * 环形展台：作品区钉住整屏，六张海报（CRT 机壳装裱）站上一个 3D 圆环，
 * 竖向滚动 / 横向拖拽 / 滚轮 / ← → 都驱动环旋转；顶光固定打在正前位，
 * 环从光下转过 —— 转进光锥的被照亮，转到背面的只剩电视机背板的剪影。
 * 入场是开机：钉住后先用半个视口高的滚动把整幅舞台画面从中间一条待机亮线
 * 上下撑开（荧光边 + 过曝回落），画面一开始撑开环就转进光下，全开后才进入转环。
 * 跨过一台放一声刻度音；停手吸附对正时光束回弹 + 旋钮声。进出展台不打雪花，
 * 静电只属于缝隙与导航的换台。
 * 正前作品的说明与源码链接固定显示在台下的说明档（不随环旋转）。
 * 移动端与 reduced-motion 不进展台，走 CSS 竖向堆叠。
 */
/** 开机段占的滚动量（视口高的倍数）：导航直达作品区时要跳过它，落在画面全开处 */
export const THEATER_INTRO = 0.5;

export function initTheater() {
  const viewport = document.getElementById('gallery-pin');
  const track = document.getElementById('gallery');
  const intro = document.getElementById('works-intro');
  if (!viewport || !track) return;

  // 跨过断点（桌面⇄移动 / reduced-motion 切换）时两套形态无法原地互转，
  // 整页重载让各自的初始化路径重新决策 —— 旧拖拽画廊在这里是静默坏掉
  const mqMobile = window.matchMedia('(max-width: 768px)');
  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onFlip = () => {
    // 两套形态无法原地互转，只能重载 —— 但记住读者停在哪一章，
    // 免得转个屏就被扔回 hero
    let here = '';
    document.querySelectorAll<HTMLElement>('#content section[id]').forEach((sec) => {
      if (sec.getBoundingClientRect().top <= innerHeight * 0.5) here = sec.id;
    });
    try {
      if (here) sessionStorage.setItem('crt-resume', here);
    } catch {
      /* 隐私模式下不可用 */
    }
    location.reload();
  };
  mqMobile.addEventListener('change', onFlip);
  mqReduced.addEventListener('change', onFlip);

  if (mqReduced.matches || mqMobile.matches) return; // CSS 负责竖向堆叠回退

  viewport.classList.add('theater');

  // 可见性判定：路由切子页时 #page-home 被 display:none，整棵子树宽度为 0。
  // 不能用 offsetParent —— ScrollTrigger 钉住时元素是 position:fixed，
  // offsetParent 恒为 null，会把放映中的展台一起判死（滚轮失效的根因）
  const visible = () => viewport.offsetWidth > 0;

  const works = gsap.utils.toArray<HTMLElement>('.work');
  const N = works.length;
  const STEPA = 360 / N; // 相邻两台的圆心角
  const PER = 0.6; // 每转一台占 0.6 个视口高的滚动量
  const INTRO = THEATER_INTRO; // 开机段：钉住后先用半个视口高的滚动把画面撑开
  const introFrac = INTRO / ((N - 1) * PER + INTRO); // 开机段占钉住区间的比例

  // ---------- 舞台道具（仅桌面端存在，故由 JS 构建而非写进 HTML） ----------
  const make = (cls: string) => {
    const el = document.createElement('div');
    el.className = cls;
    viewport.appendChild(el);
    return el;
  };
  // 顶光锥：一层在环后（主体），一层在环前（穿过海报前方的薄雾），一起呼吸
  const beams = [make('th-beam'), make('th-beam front')];
  const floor = make('th-floor');
  void floor;
  const pool = make('th-pool');
  // 开机亮线：画面上下两道边缘的荧光，随 clip 边界移动；待机时是中间一条暗线
  const phos = [make('th-phos'), make('th-phos')];
  const badge = make('th-ch mono-label');
  badge.setAttribute('aria-hidden', 'true');
  const ticks = make('th-ticks');
  ticks.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < N; i++) ticks.appendChild(document.createElement('i'));
  // 台下说明档：正前作品的说明 + 源码链接（克隆自 .work，不随环转）
  const dock = make('th-dock');
  // 屏幕阅读器的换台播报
  const live = make('th-live sr-only');
  live.setAttribute('aria-live', 'polite');

  const zone = (dir: -1 | 1) => {
    const b = document.createElement('button');
    b.className = `th-zone ${dir < 0 ? 'prev' : 'next'}`;
    b.setAttribute('aria-label', dir < 0 ? '上一个作品' : '下一个作品');
    b.dataset.hover = '';
    b.innerHTML = `<span>${dir < 0 ? '‹' : '›'}</span>`;
    b.addEventListener('click', (e) => {
      if (e.detail > 0 && moved > 10) return; // 拖过的这一下不算点击
      step(dir);
    });
    viewport.appendChild(b);
  };
  zone(-1);
  zone(1);

  const hint = document.getElementById('drag-hint');

  // ---------- 组环：荧幕玻璃 + 背板 + ON AIR 标 + 压暗遮罩，再按圆心角排上环 ----------
  const posters: (HTMLElement | null)[] = [];
  const shades: HTMLElement[] = [];
  const glasses: HTMLElement[] = [];
  const mirrors: HTMLElement[] = [];
  works.forEach((w, idx) => {
    const glass = document.createElement('i');
    glass.className = 'th-glass';
    glass.setAttribute('aria-hidden', 'true');
    w.querySelector('.poster')?.appendChild(glass);
    glasses.push(glass);
    const back = document.createElement('i');
    back.className = 'th-tvback';
    back.setAttribute('aria-hidden', 'true');
    back.innerHTML = '<i></i>';
    w.appendChild(back);
    // 台面倒影：海报的镜像贴在画框正下方，随环一起转（挂在 .work 的 3D 空间里，
    // 竖直翻转即为平面镜像的正确几何）；亮度由 JS 按受光角驱动
    const mirror = document.createElement('i');
    mirror.className = 'th-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    const ghost = w.querySelector('.poster')!.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('href');
    ghost.removeAttribute('data-hover');
    ghost.removeAttribute('aria-label');
    ghost.setAttribute('tabindex', '-1');
    mirror.appendChild(ghost);
    w.appendChild(mirror);
    mirrors.push(mirror);
    // 广播画框：正前位亮起的 ON AIR 状态标
    const onair = document.createElement('i');
    onair.className = 'th-onair mono-label';
    onair.setAttribute('aria-hidden', 'true');
    onair.textContent = `CH 02·${String(idx + 1).padStart(2, '0')} · ON AIR`;
    w.appendChild(onair);
    // 亮度用遮罩层压暗 —— .work 上不能挂 filter：filter 会把 preserve-3d
    // 压平，电视背板就永远渲染不出来（背面会露出镜像海报）
    const shade = document.createElement('i');
    shade.className = 'th-shade';
    shade.setAttribute('aria-hidden', 'true');
    w.appendChild(shade);
    shades.push(shade);
    posters.push(w.querySelector<HTMLElement>('.poster'));
  });

  let R = 330;
  let needLayout = false;
  const layout = () => {
    const cw = works[0].offsetWidth;
    const ch = works[0].offsetHeight;
    if (!cw) {
      // 子页把首页藏起来时尺寸全为 0 —— 保留上次几何，回到首页首帧重排
      needLayout = true;
      return;
    }
    needLayout = false;
    R = Math.max(340, cw * 1.5); // 大环：侧位顶到画幅边缘，相邻弦长 = R > 卡宽
    works.forEach((w, i) => {
      w.style.marginLeft = `${-cw / 2}px`;
      w.style.marginTop = `${-ch / 2}px`;
      w.style.transform = `rotateY(${i * STEPA}deg) translateZ(${R}px)`;
    });
  };
  layout();
  addEventListener('resize', layout);

  // ---------- 正前位状态 ----------
  let front = -1;

  const dockSwap = (i: number) => {
    const parts: Node[] = [];
    const cap = works[i].querySelector('.cap');
    const src = works[i].querySelector('.p-src');
    if (cap) parts.push(cap.cloneNode(true));
    if (src) parts.push(src.cloneNode(true));
    dock.replaceChildren(...parts);
    gsap.fromTo(dock, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
  };

  const setFront = (i: number) => {
    if (i === front) return;
    front = i;
    if (i === pendingSlot) pendingSlot = -1; // 到位，交还控制权
    badge.textContent = `CH 02·${String(i + 1).padStart(2, '0')}`;
    badge.classList.remove('flick');
    void badge.offsetWidth; // 重启闪现动画
    badge.classList.add('flick');
    (Array.from(ticks.children) as HTMLElement[]).forEach((t, k) => t.classList.toggle('hot', k === i));
    works.forEach((w, k) => w.classList.toggle('is-front', k === i));
    const title = works[i].querySelector('.p-title-zh')?.textContent ?? '';
    live.textContent = `作品 ${i + 1} / ${N} — ${title}`;
    dockSwap(i);
    sound.play('tick'); // 转过一台的刻度声
    if (hint?.isConnected && i !== 0) {
      gsap.to(hint, { opacity: 0, duration: 0.4, onComplete: () => hint.remove() });
    }
  };

  // ---------- 滚动驱动 + 停手吸附 ----------
  let snapT = 0;
  const st = ScrollTrigger.create({
    trigger: viewport,
    start: 'top top',
    end: () => '+=' + Math.round(innerHeight * ((N - 1) * PER + INTRO)),
    pin: true,
    onUpdate: (self) => {
      // 子页把 #page-home 藏起来后触发器区间塌缩到页顶：此时的一切
      // update 都是幻影，吸附还会反复拽子页的滚动（hero 端有同款守卫）
      if (!visible()) {
        clearTimeout(snapT);
        return;
      }
      clearTimeout(snapT);
      if (dragging || self.progress <= 0.001 || self.progress >= 0.999) return;
      if (self.progress < introFrac) {
        // 开机段停手：不停在半开 —— 要么关回待机，要么开到底
        const o = self.progress / introFrac;
        snapT = window.setTimeout(() => {
          lenis.scrollTo(o < 0.35 ? st.start : rotStart(), { duration: 0.6 });
        }, 240);
        return;
      }
      // 棘轮式吸附：顺着滚动方向进位 —— 滚轮轻拨一下也换到下一台，
      // 而不是被"就近吸附"拽回原位（那会让滚轮显得没有反应）
      const dirn = self.direction;
      snapT = window.setTimeout(() => {
        const s = rot() * (N - 1);
        let slot = Math.round(s);
        if (dirn > 0) slot = Math.min(N - 1, Math.ceil(s - 0.12));
        else if (dirn < 0) slot = Math.max(0, Math.floor(s + 0.12));
        const target = rotStart() + slotSpan() * slot;
        if (Math.abs(window.scrollY - target) > 6) lenis.scrollTo(target, { duration: 0.6 });
      }, 240);
    },
  });

  const rotStart = () => st.start + Math.round(innerHeight * INTRO); // 转环段起点（画面全开）
  const slotSpan = () => (st.end - rotStart()) / (N - 1);
  const clampScroll = (y: number) => Math.max(rotStart(), Math.min(st.end, y));
  /** 开机进度 0..1：画面撑开的程度 */
  const open = () => Math.max(0, Math.min(1, st.progress / introFrac));
  /** 转环进度 0..1：扣掉开机段 */
  const rot = () => Math.max(0, Math.min(1, (st.progress - introFrac) / (1 - introFrac)));

  // 展台是否"在场"：可见、且滚动位在钉住区间附近（含首末台的静止点）
  const inTheater = () =>
    visible() &&
    window.scrollY > st.start - innerHeight * 0.5 &&
    window.scrollY < st.end + innerHeight * 0.5;

  // 逻辑目标台位：自己记住"要去哪一台"。不能读 lenis.targetScroll ——
  // 程序化滚动进行中它会被写成当前动画位置，连按方向键会被上一跳吞掉
  let pendingSlot = -1;
  const scrollToSlot = (i: number, dur = 0.7) => {
    const slot = Math.max(0, Math.min(N - 1, i));
    pendingSlot = slot;
    lenis.scrollTo(rotStart() + slotSpan() * slot, { duration: dur });
  };
  const targetSlot = () => (pendingSlot >= 0 ? pendingSlot : Math.max(0, front));
  const step = (d: number) => {
    if (!inTheater()) return;
    const next = targetSlot() + d;
    if (next >= 0 && next < N) scrollToSlot(next);
  };

  // ---------- 每帧渲染：环旋转平滑跟随滚动，光只照正前 ----------
  let rotCur = 0;
  let entra = -74; // 入场时环从侧面转进来
  let entered = false;
  let lockedAt = -1;

  // ---------- 开机式展开 ----------
  // 画面 = 整个钉住视口（招牌、光、环、台面一起）。o=0 待机：只露中间一条暗线；
  // 撑开过程中两道边缘亮起荧光，刚撑开时过曝再回落；全开后撤掉 clip 与滤镜
  const ss = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  let lastOpen = -1;
  const reveal = (o: number, prev: number) => {
    if (o >= 1) {
      viewport.classList.remove('booting');
      viewport.style.clipPath = '';
      viewport.style.filter = '';
      phos.forEach((p) => (p.style.opacity = '0'));
      return;
    }
    if (o > 0.02 && prev <= 0.02) sound.play('poweron'); // 只在从待机拧开时响
    viewport.classList.add('booting');
    const tall = ss(0, 1, o);
    const v = 50 * (1 - tall);
    const edge = tall > 0.001 ? `${v.toFixed(3)}%` : 'calc(50% - 1px)';
    viewport.style.clipPath = `inset(${edge} 0)`;
    // 过曝：刚撑开时画面发白，逐渐回落
    const bloom = 1 + 0.9 * ss(0.02, 0.15, o) * (1 - ss(0.15, 0.9, o));
    viewport.style.filter = bloom > 1.01 ? `brightness(${bloom.toFixed(3)})` : '';
    phos[0].style.top = edge;
    phos[1].style.bottom = edge;
    // 待机时那条线就带着画面的一丝色彩（真 CRT 收成一条线时也这样），别太暗以免像断线
    const glow = (0.45 + 0.55 * ss(0, 0.15, o)) * (1 - ss(0.85, 1, o));
    phos.forEach((p) => (p.style.opacity = glow.toFixed(3)));
  };

  let lastRot = NaN;
  let lastR = NaN;
  const update = () => {
    if (!visible()) return;
    if (needLayout) layout(); // 子页期间被 resize 打坏的几何在这里自愈
    const o = open();
    if (o !== lastOpen) {
      reveal(o, lastOpen);
      lastOpen = o;
    }
    if (!entered && o > 0.2) enter(); // 画面一开始撑开，环就转进光下
    const rotTarget = -rot() * (N - 1) * STEPA + entra;
    rotCur += (rotTarget - rotCur) * 0.14;
    if (Math.abs(rotTarget - rotCur) < 0.01) rotCur = rotTarget;
    if (rotCur === lastRot && R === lastR) return; // 静止帧无事可做
    lastRot = rotCur;
    lastR = R;
    track.style.transform = `translateZ(${-R}px) rotateY(${rotCur}deg)`;

    works.forEach((_, i) => {
      let ang = ((i * STEPA + rotCur) % 360 + 360) % 360;
      if (ang > 180) ang -= 360;
      const lit = Math.max(0, Math.cos((ang * Math.PI) / 180));
      // 光锥只照正前：遮罩随面向角压暗，背面沉入黑暗；景深虚化只作用在
      // 海报面上（blur 量化到 0.6px 台阶，避免每帧重栅格化）
      shades[i].style.opacity = (1 - Math.min(1, 0.24 + 0.82 * Math.pow(lit, 1.6))).toFixed(3);
      // 荧幕玻璃的镜面高光只在灯下才亮；倒影只有受光的那台才映得出来
      glasses[i].style.opacity = (0.35 + 0.65 * lit * lit).toFixed(3);
      mirrors[i].style.opacity = (0.34 * Math.pow(lit, 2.5)).toFixed(3);
      const blur = Math.round((1 - lit) * 4) * 0.6;
      const p = posters[i];
      if (p) p.style.filter = blur > 0 ? `blur(${blur.toFixed(1)}px)` : '';
    });

    // 招牌上的那句说明只在开台时读一遍：首次转环即淡出，只留章节标与标题
    if (intro) intro.style.opacity = Math.max(0, 1 - (rot() * (N - 1)) / 0.5).toFixed(3);

    if (entered) {
      // 台位跟随滚动这个单一事实来源（rotCur 掺着入场偏转和 lerp 滞后）
      const slot = Math.max(0, Math.min(N - 1, Math.round(rot() * (N - 1))));
      if (slot !== front) setFront(slot);
      // 吸附对正的"锁定"反馈：光束回弹 + 旋钮声（不打雪花）
      const s = rot() * (N - 1);
      const atSlot = Math.abs(s - Math.round(s)) < 0.02 || rot() <= 0 || rot() >= 1;
      const settled = Math.abs(rotTarget - rotCur) < 0.4 && entra === 0;
      if (settled && atSlot) {
        if (lockedAt !== front) {
          lockedAt = front;
          sound.play('switch');
          gsap.fromTo(beams, { opacity: 0.5 }, { opacity: 1, duration: 0.6, ease: 'back.out(2.2)' });
          gsap.fromTo(pool, { opacity: 0.4 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        }
      } else if (!settled) {
        lockedAt = -1;
      }
    }
  };
  gsap.ticker.add(update);

  // 入场：环带着第一台从侧面转进光下。由每帧的 update 在画面开始撑开时调用
  //（跳过开机段直接落在钉住区之后的锚点跳转，也会在首帧因 o=1 立即入场）
  gsap.set(beams, { opacity: 0 });
  gsap.set(pool, { opacity: 0 });
  const enter = () => {
    if (entered || !visible()) return;
    entered = true;
    setFront(0);
    gsap.to(beams, { opacity: 1, duration: 0.9, ease: 'power2.out' });
    gsap.to(pool, { opacity: 1, duration: 0.9, ease: 'power2.out' });
    const proxy = { v: entra };
    gsap.to(proxy, {
      v: 0,
      duration: 1.2,
      ease: 'power3.out',
      onUpdate: () => (entra = proxy.v),
      onComplete: () => (entra = 0),
    });
  };

  // ---------- 输入：键盘 / 横向滚轮 / 拖拽 / 点击侧位 ----------
  // ← → 换台；↑ ↓ / PgUp PgDn 在展台内也按台步进（原生 40px 步长会被
  // 吸附拽回去，键盘用户会被卡死在一台上），到首/末台时放行原生滚动离场
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // 浏览器快捷键放行
    if (!inTheater()) return;
    // 钉住区外放行原生滚动：±2px 容差留给 Lenis 的小数滚动位
    // 开机段放行原生滚动（方向键也能拧开画面）
    if (window.scrollY < rotStart() - 2 || window.scrollY > st.end + 2) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if ((e.key === 'ArrowDown' || e.key === 'PageDown') && targetSlot() < N - 1) {
      e.preventDefault();
      step(1);
    } else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && targetSlot() > 0) {
      e.preventDefault();
      step(-1);
    }
  });

  // 横向滚轮（触控板）连续转环；停手后由吸附对正
  viewport.addEventListener(
    'wheel',
    (e) => {
      // 明确的横向意图才接管；竖向与杂散小抖动交给 Lenis
      if (Math.abs(e.deltaX) < 8 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation(); // 不让 Lenis 对同一事件再驱动一次滚动
      if (!inTheater()) return;
      if (window.scrollY < rotStart() || window.scrollY > st.end) return; // 未入转环段不瞬移
      pendingSlot = -1; // 用户接管，放弃排队中的目标
      lenis.scrollTo(clampScroll(window.scrollY + e.deltaX * (slotSpan() / 300)), { immediate: true });
    },
    { passive: false },
  );

  // 横向拖拽直接拨环（映射为滚动位，保持单一事实来源）；拖过的点击不触发链接
  let dragging = false;
  let downX = 0;
  let lastX = 0;
  let moved = 0;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    pendingSlot = -1; // 用户接管
    downX = lastX = e.clientX;
    moved = 0;
    viewport.classList.add('grabbing');
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // 松手事件丢在窗口外时，靠"没有按键按下"兜底
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      endDrag();
      return;
    }
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved = Math.max(moved, Math.abs(e.clientX - downX));
    if (!inTheater() || !dx) return;
    if (window.scrollY < rotStart() || window.scrollY > st.end) return; // 未入转环段不瞬移
    // dx→圆心角→滚动位：右拨环右转，左边那台进光
    const dRot = dx * 0.22;
    lenis.scrollTo(clampScroll(window.scrollY - (dRot / STEPA) * slotSpan()), { immediate: true });
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('grabbing');
    // 松手吸附由 onUpdate 的停手计时器接管
    if (inTheater()) {
      clearTimeout(snapT);
      snapT = window.setTimeout(() => scrollToSlot(front, 0.6), 120);
    }
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  // 捕获阶段统一拦掉"拖拽尾巴"补发的 click：换台区、台下源码链接都在这层内
  viewport.addEventListener(
    'click',
    (e) => {
      if (e.detail > 0 && moved > 10) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  // 点击侧位海报 = 把它转到光下；正前海报才作为链接打开
  works.forEach((w, i) => {
    const a = w.querySelector<HTMLAnchorElement>('a.poster');
    if (!a) return;
    a.addEventListener('click', (e) => {
      if (e.detail > 0 && moved > 10) {
        e.preventDefault();
        return;
      }
      if (e.detail === 0) return; // 键盘 Enter/Space：始终跟随链接
      if (i !== front) {
        e.preventDefault();
        scrollToSlot(i, 0.9);
      }
    });
    // 键盘 Tab 聚焦某台 → 把它转到光下（环上每一台都持续可聚焦）。
    // 浏览器会先自己把焦点元素滚进视口，Lenis 的内部位置未同步 ——
    // 从台外聚焦时先把 Lenis 硬同步到当前位置再动画，避免打架回跳
    a.addEventListener('focus', () => {
      if (i === front || dragging) return;
      if (!entered || !inTheater()) {
        lenis.scrollTo(clampScroll(window.scrollY), { immediate: true, force: true });
      }
      scrollToSlot(i, 0.9);
    });
  });
  track.addEventListener('dragstart', (e) => e.preventDefault());
}
