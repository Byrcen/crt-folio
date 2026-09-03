import { ScrollTrigger } from './core/scroll';
import { typeOnce } from './fx/typewriter';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * About subpage: scroll-driven blueprint drawing in the sticky bright panel,
 * per-feature corner highlights, one-shot typewriter / decode entrances.
 * All ScrollTriggers are registered at boot; they recalc on the refresh that
 * the page router performs after un-hiding the section.
 */
export function initAboutPage() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- blueprint: CRT tv anatomy, drawn in reading order as you scroll ---
  const dot = document.getElementById('bp-dot')!;
  const seg = (el: HTMLElement, p: number, a: number, b: number) => {
    el.style.strokeDashoffset = String(100 * (1 - clamp01((p - a) / (b - a))));
  };
  // [id, start, end] — 机身 → 屏幕 → 天线 → 旋钮 → 格栅 → 脚 → 尺寸标注 → 四角引线
  const drawOrder: [HTMLElement, number, number][] = [
    ['bp-body', 0.02, 0.18],
    ['bp-screen', 0.16, 0.3],
    ['bp-ant-l', 0.28, 0.36],
    ['bp-ant-r', 0.32, 0.4],
    ['bp-ant-base', 0.36, 0.42],
    ['bp-knob', 0.4, 0.46],
    ['bp-knob2', 0.44, 0.5],
    ['bp-g1', 0.48, 0.52],
    ['bp-g2', 0.5, 0.54],
    ['bp-g3', 0.52, 0.56],
    ['bp-foot-l', 0.56, 0.6],
    ['bp-foot-r', 0.58, 0.62],
    ['bp-dim-l', 0.64, 0.68],
    ['bp-dim-r', 0.64, 0.68],
    ['bp-dim', 0.66, 0.74],
    ['bp-lead-0', 0.76, 0.82],
    ['bp-lead-1', 0.8, 0.86],
    ['bp-lead-2', 0.84, 0.9],
    ['bp-lead-3', 0.88, 0.94],
  ].map(([id, a, b]) => [document.getElementById(id as string)!, a as number, b as number]);

  ScrollTrigger.create({
    trigger: '#feat',
    // 板子一露头就开始画、走到八成就画完：左板不再空着灰一大段才出现内容
    start: 'top bottom',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const p = Math.min(1, self.progress / 0.8);
      drawOrder.forEach(([el, a, b]) => seg(el, p, a, b));
      dot.style.opacity = p > 0.96 ? '1' : '0';
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
      setTimeout(() => (decode.textContent = '按下那个按钮就行'), 500);
    },
  });
}
