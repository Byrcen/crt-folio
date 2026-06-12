import gsap from 'gsap';
import { domTypeLoop } from '../fx/typewriter';
import { COPY } from '../content';

/** Typewriter title + progress hairline, then panel slides up. */
export function runPreloader(ready: Promise<unknown>): Promise<void> {
  const panel = document.getElementById('preloader')!;
  const title = document.getElementById('pre-title')!;
  const line = document.getElementById('pre-line')!;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = domTypeLoop(title, COPY.stem, COPY.words);
  if (reduced) loop.finishNow();
  else loop.start();

  const MIN_MS = reduced ? 400 : 3200;
  const t0 = performance.now();
  const progress = gsap.to(line, { scaleX: 0.92, duration: MIN_MS / 1000 + 1.5, ease: 'power1.out' });

  return new Promise((resolve) => {
    ready.then(() => {
      const wait = Math.max(0, MIN_MS - (performance.now() - t0));
      setTimeout(() => {
        progress.kill();
        gsap.to(line, { scaleX: 1, duration: 0.25, ease: 'power1.in' });
        gsap.to(panel, {
          yPercent: -100,
          duration: reduced ? 0.3 : 0.9,
          delay: 0.3,
          ease: 'expo.inOut',
          onComplete: () => {
            loop.stop();
            panel.remove();
            resolve();
          },
        });
      }, wait);
    });
  });
}
