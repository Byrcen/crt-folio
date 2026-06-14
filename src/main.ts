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
import { initGalleryPan } from './fx/skew';
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
  // logo → back to the hero
  document.getElementById('hud-logo')!.addEventListener('click', () => goTo('home'));
}

// ---------- scroll choreography (home) ----------
function initScrollFx() {
  // hero dolly-in + directional snap: stopping mid-zoom commits the
  // "channel change" in the direction you were scrolling
  let snapTimer = 0;
  ScrollTrigger.create({
    trigger: '#hero-spacer',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      stage?.setProgress(self.progress);
      clearTimeout(snapTimer);
      if (currentPage === 'home' && self.progress > 0.01 && self.progress < 0.99) {
        const target = self.direction > 0 ? self.end : self.start;
        snapTimer = window.setTimeout(() => {
          lenis.scrollTo(target, { duration: 1.1, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
        }, 220);
      }
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
  initGalleryPan();
  initFootBox();
  initPillReveals();
}

// ---------- "切换 日 / 夜" label tracks the TV ----------
function trackSwitchLabel() {
  const label = document.getElementById('switch-label')!;
  const tick = () => {
    if (stage && currentPage === 'home') {
      const p = stage.project(stage.labelAnchor);
      label.style.transform = `translate(${p.x}px, ${p.y}px)`;
      const past = (document.documentElement.dataset.zone ?? 'hero') === 'dark';
      label.style.opacity = p.visible && !past ? '1' : '0';
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- boot ----------
const ready = Promise.all([document.fonts.ready, stageReady, new Promise((r) => setTimeout(r, 300))]);
runPreloader(ready).then(() => {
  initScrollFx();
  initAboutPage();
  trackSwitchLabel();
  initNav();
  ScrollTrigger.refresh();
  gsap.set('#hud', { opacity: 1 });
});
