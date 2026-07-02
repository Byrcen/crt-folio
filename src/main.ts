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
import { initSnake } from './fx/snake';
import { initGalleryDrag } from './fx/skew';
import {
  initLineReveals,
  initPillReveals,
  initSteps,
  initFootBox,
  initWorksTitle,
  initManifestoEcho,
} from './fx/reveal';
import { initAboutPage } from './about';
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
  sound.enable(btn.classList.contains('on'));
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
  currentPage = page;
}

function goTo(page: Page, anchor?: string) {
  sound.play('static');
  void playNoSignal(1100);
  setTimeout(() => {
    showPage(page);
    if (page === 'about') {
      stage?.setPaused(true);
      document.documentElement.dataset.zone = 'dark';
      lenis.scrollTo(0, { immediate: true });
    } else {
      document.documentElement.dataset.zone = anchor ? 'dark' : 'hero';
      stage?.setPaused(!!anchor);
      const target = anchor ? document.querySelector(anchor) : 0;
      lenis.scrollTo((target as HTMLElement) ?? 0, { immediate: true });
    }
    ScrollTrigger.refresh();
  }, 450);
}

function initNav() {
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
      // only snap while genuinely mid-dolly. At p===0/1 the channel change is
      // already settled — scheduling a snap there yanks users (and nav jumps
      // that cross the whole spacer in one step) back to the seam.
      if (p <= 0 || p >= 1) return;
      let target: number | null = null;
      if (p > 0.6) target = self.end; // past the midpoint, diving in → finish it
      else if (p < 0.15) target = self.start; // barely in → ease back to rest
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
    onEnter: () => {
      sound.play('static');
      void playNoSignal(900);
    },
    onLeaveBack: () => {
      sound.play('static');
      void playNoSignal(700);
    },
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

  if (!reduced) initSnake(document.getElementById('snake') as HTMLCanvasElement);
  initSteps();
  initLineReveals();
  initWorksTitle();
  initGalleryDrag();
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
  initScrollFx();
  initAboutPage();
  trackSwitchLabel();
  initNav();
  initEmailCopy();
  ScrollTrigger.refresh();
  gsap.set('#hud', { opacity: 1 });
});
