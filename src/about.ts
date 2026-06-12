import { ScrollTrigger } from './core/scroll';
import { typeOnce } from './fx/typewriter';
import { decodeIn } from './fx/scramble';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * About subpage: scroll-driven blueprint drawing in the sticky bright panel,
 * per-feature corner highlights, one-shot typewriter / decode entrances.
 * All ScrollTriggers are registered at boot; they recalc on the refresh that
 * the page router performs after un-hiding the section.
 */
export function initAboutPage() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- blueprint rays (generated, deterministic) ---
  const svg = document.getElementById('blueprint')!;
  const NS = 'http://www.w3.org/2000/svg';
  const RAYS = 24;
  const rays: SVGLineElement[] = [];
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2 + 0.13;
    const len = 112 + ((i * 37) % 68);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', '200');
    l.setAttribute('y1', '200');
    l.setAttribute('x2', (200 + Math.cos(a) * len).toFixed(1));
    l.setAttribute('y2', (200 + Math.sin(a) * len).toFixed(1));
    l.setAttribute('class', 'bp-ray');
    svg.appendChild(l);
    rays.push(l);
  }

  const square = document.getElementById('bp-square')!;
  const crossH = document.getElementById('bp-cross-h')!;
  const crossV = document.getElementById('bp-cross-v')!;
  const dot = document.getElementById('bp-dot')!;
  const seg = (el: HTMLElement, p: number, a: number, b: number) => {
    el.style.strokeDashoffset = String(100 * (1 - clamp01((p - a) / (b - a))));
  };

  ScrollTrigger.create({
    trigger: '#feat',
    start: 'top 70%',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const p = self.progress;
      seg(square, p, 0.02, 0.2);
      seg(crossH, p, 0.22, 0.32);
      seg(crossV, p, 0.3, 0.4);
      dot.style.opacity = p > 0.42 ? '1' : '0';
      // rays accumulate in discrete batches
      rays.forEach((r, i) => {
        r.style.opacity = p > 0.46 + (i / RAYS) * 0.5 ? '1' : '0';
      });
    },
  });

  // --- corner labels track the feature being read ---
  const corners = document.querySelectorAll<HTMLElement>('.feat-corner');
  document.querySelectorAll<HTMLElement>('.feat-item').forEach((item) => {
    const idx = item.dataset.i;
    ScrollTrigger.create({
      trigger: item,
      start: 'top 60%',
      end: 'bottom 40%',
      onToggle: (self) => {
        if (self.isActive) corners.forEach((c) => c.classList.toggle('on', c.dataset.i === idx));
      },
    });
  });

  // --- one-shot entrances ---
  const title = document.getElementById('ap-title')!;
  const ctaTitle = document.getElementById('ap-cta-title')!;
  const decode = document.getElementById('ap-decode')!;
  let heroDone = false;
  let ctaDone = false;

  ScrollTrigger.create({
    trigger: '.ap-hero',
    start: 'top 80%',
    onEnter: () => {
      if (heroDone) return;
      heroDone = true;
      if (reduced) title.textContent = '关于 cry';
      else void typeOnce(title, '关于 cry', 90);
    },
  });

  ScrollTrigger.create({
    trigger: '.ap-cta',
    start: 'top 70%',
    onEnter: () => {
      if (ctaDone) return;
      ctaDone = true;
      if (reduced) {
        ctaTitle.textContent = '如果你想一起做点什么';
        decode.textContent = '按下那个按钮就行';
        return;
      }
      void typeOnce(ctaTitle, '如果你想一起做点什么', 55);
      setTimeout(() => decodeIn(decode, '按下那个按钮就行', 900), 500);
    },
  });
}
