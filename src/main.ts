import './styles/main.css';
import { initScroll, gsap, ScrollTrigger, lenis } from './core/scroll';
import { sound, bindHoverSounds } from './core/sound';
import { initCursor } from './core/cursor';
import { initClock } from './core/clock';
import { initLogo } from './core/logo';
import { runPreloader } from './core/preloader';
import { playNoSignal } from './fx/nosignal';
import { domTypeLoop, typeOnce } from './fx/typewriter';
import { bindScrambleHover } from './fx/scramble';
import { initTheater } from './fx/theater';
import {
  initLineReveals,
  initPillReveals,
  initSteps,
  initFootBox,
  initWorksTitle,
  initManifestoEcho,
} from './fx/reveal';
import { initAboutPage } from './about';
import { initBroadcastLayer } from './fx/channel';
import { renderGallery } from './gallery';
import { COPY } from './content';
import type { Stage } from './three/stage';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// the boot sequence always starts from the hero; a mid-page restore would sit
// inside the dolly with stale trigger state (and fire NO SIGNAL on load)
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

renderGallery(); // build posters before cursor/sound bind [data-hover]
initScroll();
// CLI 开场期间锁住滚动：此时滚页会把 hero 推进整段跳过，等面板抬起时
// 缝隙编排（NO SIGNAL / 分区翻转 / 打字机）会一次性空烧
lenis.stop();
initCursor();
initClock();
bindScrambleHover();
initLogo(document.getElementById('hud-logo') as HTMLCanvasElement);
initLogo(document.getElementById('foot-logo') as HTMLCanvasElement);
initLogo(document.getElementById('ap-logo') as HTMLCanvasElement);

// ---------- 3D stage (lazy chunk; the CLI preloader masks the load) ----------
let stage: Stage | null = null;
const stageReady = (async () => {
  try {
    const { Stage: StageCls } = await import('./three/stage');
    stage = new StageCls(document.getElementById('stage')!);
    stage.onKnobClick(() => {
      stage!.toggleTheme();
      sound.play('switch');
    });
    if (import.meta.env.DEV) {
      (window as unknown as { __stage: Stage }).__stage = stage;
      (window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger;
      (window as unknown as { __noise: typeof playNoSignal }).__noise = playNoSignal;
      (window as unknown as { __gsap: typeof gsap }).__gsap = gsap;
    }
  } catch (err) {
    console.warn('WebGL unavailable, hero degraded', err);
    document.getElementById('stage')!.style.background =
      'radial-gradient(80% 60% at 50% 40%, #adadad, #777)';
  }
})();

// sound toggle → synthesized WebAudio FX
document.getElementById('sound-toggle')!.addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLElement;
  btn.classList.toggle('on');
  const on = btn.classList.contains('on');
  btn.setAttribute('aria-pressed', String(on));
  sound.enable(on);
});
bindHoverSounds();

// ---------- page router: home ⇄ about via NO SIGNAL channel change ----------
type Page = 'home' | 'about';
let currentPage: Page = 'home';

function showPage(page: Page) {
  const home = document.getElementById('page-home')!;
  const about = document.getElementById('page-about')!;
  const onHome = page === 'home';
  home.style.display = onHome ? '' : 'none';
  about.hidden = onHome;
  document.getElementById('stage')!.style.display = onHome ? '' : 'none';
  document.getElementById('hero-overlay')!.style.display = onHome ? '' : 'none';
  // 刻度尺由 #content 的滚动驱动，子页上只会剩一条不动的死刻度
  const ruler = document.getElementById('freq-ruler');
  if (ruler) ruler.style.display = onHome ? '' : 'none';
  currentPage = page;
}

// 被隐藏那一页的触发器必须先停用再 refresh：display:none 的子树量出来
// 全是 0，紧接着的 refresh() 会让它们集体误触发 onEnter —— 首页的
// steps / 段落揭示 / 打字机会被隔空烧掉，data-foot 会锁死，3D 舞台也会
// 被幻影 onLeaveBack 重新唤醒，在子页上满帧空转
const stDisabled = new WeakSet<ScrollTrigger>();
function syncTriggers(page: Page) {
  const home = document.getElementById('page-home')!;
  const about = document.getElementById('page-about')!;
  ScrollTrigger.getAll().forEach((t) => {
    const el = t.trigger as Element | undefined;
    if (!el) return;
    const inHome = home.contains(el);
    const inAbout = about.contains(el);
    if (!inHome && !inAbout) return; // 与页面无关的触发器不动
    const want = page === 'home' ? inHome : inAbout;
    const off = stDisabled.has(t);
    if (want && off) {
      stDisabled.delete(t);
      t.enable();
    } else if (!want && !off) {
      stDisabled.add(t);
      t.disable(false);
    }
  });
}

// 子页动画在 [hidden] 状态下建立会立刻烧完 —— 首次真正进入时才初始化
let aboutInited = false;

function goTo(page: Page, anchor?: string, fromPop = false) {
  // 接管后退键：不改 URL（本站无深链语义），只补一条历史记录，
  // 否则在「关于我」子页按后退会直接离开本站
  if (!fromPop) history.pushState({ page, anchor }, '', location.href);
  void playNoSignal(1100); // 静电声由 playNoSignal 自己发，避免重复
  setTimeout(() => {
    showPage(page);
    syncTriggers(page);
    if (page === 'about' && !aboutInited) {
      aboutInited = true;
      initAboutPage();
    }
    const dark = page === 'about' || !!anchor;
    document.documentElement.dataset.zone = dark ? 'dark' : 'hero';
    stage?.setPaused(dark);
    // 离开首页时清掉页脚态，否则底部 HUD 在子页上整排隐形
    if (page === 'about') document.documentElement.removeAttribute('data-foot');
    // 先量后跳：refresh / lenis 尺寸缓存更新之前，锚点会落到旧坐标上
    ScrollTrigger.refresh();
    lenis.resize();
    const target = page === 'home' && anchor ? document.querySelector(anchor) : null;
    lenis.scrollTo((target as HTMLElement) ?? 0, { immediate: true, force: true });
  }, 450);
}

function initNav() {
  history.replaceState({ page: 'home' as Page }, '', location.href);
  addEventListener('popstate', (e) => {
    const st = e.state as { page?: Page; anchor?: string } | null;
    goTo(st?.page ?? 'home', st?.anchor, true);
  });
  document.querySelectorAll<HTMLAnchorElement>('#hud-nav a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href')!;
      // “关于我” opens the dedicated subpage; the rest are home anchors
      if (href === '#about') goTo('about');
      else goTo('home', href);
    });
  });
  // logo → back to the hero (canvas isn't a native button — mirror Enter/Space)
  const logo = document.getElementById('hud-logo')!;
  logo.addEventListener('click', () => goTo('home'));
  logo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goTo('home');
    }
  });
}

// ---------- scroll choreography (home) ----------
function initScrollFx() {
  const heroHeadline = document.getElementById('hero-headline')!;

  // hero dolly-in + gentle end-snap: resting mid-zoom is allowed, but once
  // you've clearly leaned toward an end the dolly finishes the "channel
  // change" on its own. A small flick no longer flings you across the spacer,
  // and any further scroll input interrupts the snap.
  let snapTimer = 0;
  ScrollTrigger.create({
    trigger: '#hero-spacer',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      stage?.setProgress(self.progress);
      heroHeadline.style.opacity = String(Math.max(0, 1 - self.progress / 0.32));
      clearTimeout(snapTimer);
      if (currentPage !== 'home') return;
      const p = self.progress;
      // only snap while genuinely mid-dolly. At p===0 the channel change is
      // already settled — scheduling a snap there yanks users (and nav jumps
      // that cross the whole spacer in one step) back to the seam.
      if (p <= 0) return;
      let target: number | null = null;
      if (self.direction < 0) {
        // 往回退：只要离开了中段自由区就吸回电视静止位。缝隙附近（p 接近 1）
        // 尤其不能停 —— 那一帧是推进到底后的屏幕内部（底图 + 放大准星），
        // 不该被当成一页看到
        if (p < 0.15 || p > 0.6) target = self.start;
      } else if (p > 0.6) {
        // 往下推进过半：不停在缝隙，直接滑进 CH 01（NO SIGNAL 在途中触发）。
        // self.end 是 spacer 底贴视口底，再加一个视口高即内容区顶贴视口顶
        target = self.end + innerHeight;
      }
      if (target === null) return; // 0.15–0.6 is a free rest zone
      snapTimer = window.setTimeout(() => {
        lenis.scrollTo(target!, { duration: 1.1, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
      }, 320);
    },
  });

  // NO SIGNAL at the 3D → DOM seam (both directions)
  ScrollTrigger.create({
    trigger: '#content',
    start: 'top bottom',
    onEnter: () => void playNoSignal(900),
    onLeaveBack: () => void playNoSignal(700),
  });

  // HUD goes light over dark content; stage pauses when covered
  ScrollTrigger.create({
    trigger: '#content',
    start: 'top 60%',
    onEnter: () => (document.documentElement.dataset.zone = 'dark'),
    onLeaveBack: () => (document.documentElement.dataset.zone = 'hero'),
  });
  ScrollTrigger.create({
    trigger: '#content',
    start: 'top top',
    onEnter: () => stage?.setPaused(true),
    onLeaveBack: () => stage?.setPaused(false),
  });

  // bottom HUD (comment / scroll hint / clock) clears out over the footer
  ScrollTrigger.create({
    trigger: '#footer',
    start: 'top 80%',
    onEnter: () => document.documentElement.setAttribute('data-foot', '1'),
    onLeaveBack: () => document.documentElement.removeAttribute('data-foot'),
  });

  // about headline typewriter (starts on first entry, then loops)
  const aboutLoop = domTypeLoop(
    document.getElementById('about-title')!,
    COPY.aboutStem,
    COPY.words,
    { typeMs: 58 },
  );
  let aboutStarted = false;
  ScrollTrigger.create({
    trigger: '#about',
    start: 'top 70%',
    onEnter: () => {
      if (!aboutStarted) {
        aboutStarted = true;
        if (reduced) aboutLoop.finishNow();
        else aboutLoop.start();
      }
    },
  });

  // manifesto typewriter + echo
  const l1 = document.querySelector<HTMLElement>('#mani-title .l1')!;
  const l2 = document.querySelector<HTMLElement>('#mani-title .l2')!;
  const echo = document.getElementById('mani-echo')!;
  let maniStarted = false;
  ScrollTrigger.create({
    trigger: '#manifesto',
    start: 'top 65%',
    onEnter: async () => {
      if (maniStarted) return;
      maniStarted = true;
      if (reduced) {
        l1.textContent = COPY.manifesto[0];
        l2.textContent = COPY.manifesto[1];
        echo.textContent = COPY.manifestoEcho;
        return;
      }
      await typeOnce(l1, COPY.manifesto[0], 34);
      echo.textContent = COPY.manifestoEcho;
      await typeOnce(l2, COPY.manifesto[1], 34);
    },
  });
  initManifestoEcho(echo);

  initSteps();
  initLineReveals();
  initWorksTitle();
  initTheater();
  initFootBox();
  initPillReveals();
}

// ---------- "切换 日 / 夜" label tracks the TV ----------
function trackSwitchLabel() {
  const label = document.getElementById('switch-label')!;
  // the 3D knob is a tiny touch target (hopeless on phones) — the label
  // itself toggles too, for taps and keyboards alike
  const toggle = () => {
    stage?.toggleTheme();
    sound.play('switch');
  };
  label.addEventListener('click', toggle);
  label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
  const tick = () => {
    if (stage && currentPage === 'home') {
      const p = stage.project(stage.labelAnchor);
      label.style.transform = `translate(${p.x}px, ${p.y}px)`;
      const past = (document.documentElement.dataset.zone ?? 'hero') === 'dark';
      const visible = p.visible && !past;
      label.style.opacity = visible ? '1' : '0';
      // it's clickable now — a faded-out label must not leave a ghost hit area
      label.style.pointerEvents = visible ? 'auto' : 'none';
      // opacity:0 依然可聚焦 —— 隐形的 tab 停靠点按回车会静默切换主题
      label.style.visibility = visible ? '' : 'hidden';
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- email copy (mailto is a dead end on clientless desktops) ----------
function initEmailCopy() {
  document.querySelectorAll<HTMLButtonElement>('.email-copy').forEach((btn) => {
    const original = btn.textContent!;
    const email = btn.dataset.email!;
    let timer = 0;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      btn.textContent = '已复制 ✓';
      clearTimeout(timer);
      timer = window.setTimeout(() => (btn.textContent = original), 1600);
    });
  });
}

// ---------- boot ----------
const ready = Promise.all([document.fonts.ready, stageReady, new Promise((r) => setTimeout(r, 300))]);
runPreloader(ready).then(() => {
  // 解锁并归零：lenis.stop() 拦不住键盘与拖动滚动条，且 lenis 会把
  // 内部 targetScroll 动画回旧值 —— 必须用 immediate 重置它自己的目标
  lenis.start();
  lenis.scrollTo(0, { immediate: true, force: true });
  // the CLI "enter" turns the set on: power-on sweep + headline tunes in
  stage?.powerOnScreen();
  sound.play('poweron');
  document.getElementById('hero-headline')!.classList.add('hh-in');
  stage?.onScreenClick(() => sound.play('zap'));
  initScrollFx();
  initBroadcastLayer();
  trackSwitchLabel();
  initNav();
  initEmailCopy();
  ScrollTrigger.refresh();
  gsap.set('#hud', { opacity: 1 });
  // 断点切换导致的重载：回到读者原先所在的章节，而不是被扔回 hero
  try {
    const resume = sessionStorage.getItem('crt-resume');
    if (resume) {
      sessionStorage.removeItem('crt-resume');
      const sec = document.getElementById(resume);
      if (sec) {
        document.documentElement.dataset.zone = 'dark';
        stage?.setPaused(true);
        lenis.scrollTo(sec, { immediate: true, force: true });
      }
    }
  } catch {
    /* 隐私模式下不可用 */
  }
});
