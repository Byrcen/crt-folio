import './styles/main.css';
import { initScroll, gsap, ScrollTrigger, lenis } from './core/scroll';
import { sound, bindHoverSounds } from './core/sound';
import { initCursor } from './core/cursor';
import { initClock } from './core/clock';
import { initLogo } from './core/logo';
import { runPreloader } from './core/preloader';
import { Stage } from './three/stage';
import { playNoSignal } from './fx/nosignal';
import { domTypeLoop, typeOnce } from './fx/typewriter';
import { bindScrambleHover } from './fx/scramble';
import { initSnake } from './fx/snake';
import { initVelocitySkew } from './fx/skew';
import {
  initLineReveals,
  initPillReveals,
  initSteps,
  initFootBox,
  initWorksTitle,
  initManifestoEcho,
} from './fx/reveal';
import { COPY } from './content';

initScroll();
initCursor();
initClock();
bindScrambleHover();
initLogo(document.getElementById('hud-logo') as HTMLCanvasElement);
initLogo(document.getElementById('foot-logo') as HTMLCanvasElement);

// ---------- 3D stage ----------
let stage: Stage | null = null;
try {
  stage = new Stage(document.getElementById('stage')!);
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

// sound toggle → synthesized WebAudio FX
document.getElementById('sound-toggle')!.addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLElement;
  btn.classList.toggle('on');
  sound.enable(btn.classList.contains('on'));
});
bindHoverSounds();

// ---------- scroll choreography ----------
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
      if (self.progress > 0.01 && self.progress < 0.99) {
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

  // bottom HUD (comment / scroll hint / clock) clears out over the footer
  ScrollTrigger.create({
    trigger: '#footer',
    start: 'top 80%',
    onEnter: () => document.documentElement.setAttribute('data-foot', '1'),
    onLeaveBack: () => document.documentElement.removeAttribute('data-foot'),
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
        aboutLoop.start();
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
      await typeOnce(l1, COPY.manifesto[0], 34);
      echo.textContent = COPY.manifestoEcho;
      await typeOnce(l2, COPY.manifesto[1], 34);
    },
  });
  initManifestoEcho(echo);

  initSnake(document.getElementById('snake') as HTMLCanvasElement);
  initSteps();
  initLineReveals();
  initWorksTitle();
  initVelocitySkew();
  initFootBox();
  initPillReveals();
}

// ---------- "Switch Day 'N' Night" label tracks the TV ----------
function trackSwitchLabel() {
  const label = document.getElementById('switch-label')!;
  const tick = () => {
    if (stage) {
      const p = stage.project(stage.labelAnchor);
      label.style.transform = `translate(${p.x}px, ${p.y}px)`;
      const past = (document.documentElement.dataset.zone ?? 'hero') === 'dark';
      label.style.opacity = p.visible && !past ? '1' : '0';
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- nav: NO SIGNAL "channel change" to anchors ----------
function initNav() {
  document.querySelectorAll<HTMLAnchorElement>('#hud-nav a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href')!);
      if (!target) return;
      sound.play('static');
      void playNoSignal(1100);
      setTimeout(() => lenis.scrollTo(target as HTMLElement, { immediate: true }), 450);
    });
  });
}

// ---------- boot ----------
const ready = Promise.all([document.fonts.ready, new Promise((r) => setTimeout(r, 300))]);
runPreloader(ready).then(() => {
  initScrollFx();
  trackSwitchLabel();
  initNav();
  ScrollTrigger.refresh();
  gsap.set('#hud', { opacity: 1 });
});
