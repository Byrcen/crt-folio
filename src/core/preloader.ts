import gsap from 'gsap';
import { COPY } from '../content';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function typeInto(el: HTMLElement, text: string, perChar: number, accent = false): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      i++;
      const t = text.slice(0, i);
      if (accent) {
        const node = document.createElement('b');
        node.textContent = t;
        el.replaceChildren(el.dataset.prefix ?? '', node);
      } else {
        el.dataset.prefix = t;
        el.textContent = t;
      }
      if (i >= text.length) {
        resolve();
        return;
      }
      setTimeout(tick, perChar * (0.7 + Math.random() * 0.6));
    };
    setTimeout(tick, perChar);
  });
}

/**
 * CLI boot: blinking caret → type "/" → type "cry" → enter →
 * boot log lines + progress hairline → panel slides up.
 */
export function runPreloader(ready: Promise<unknown>): Promise<void> {
  const panel = document.getElementById('preloader')!;
  const cmd = document.getElementById('cli-cmd')!;
  const out = document.getElementById('cli-out')!;
  const line = document.getElementById('pre-line')!;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sequence = async () => {
    if (reduced) {
      cmd.innerHTML = `/<b>${COPY.cli.cmdName}</b>`;
      return;
    }
    await wait(900); // caret blinks alone first
    await typeInto(cmd, COPY.cli.cmdSlash, 140);
    await wait(420);
    await typeInto(cmd, COPY.cli.cmdName, 150, true);
    await wait(500);
    // "enter": boot log prints
    for (const text of COPY.cli.output) {
      const row = document.createElement('div');
      row.textContent = text;
      out.appendChild(row);
      gsap.to(row, { opacity: 1, duration: 0.12 });
      await wait(240);
    }
  };

  const MIN_MS = reduced ? 400 : 3400;
  const t0 = performance.now();
  const progress = gsap.to(line, { scaleX: 0.92, duration: MIN_MS / 1000 + 1.5, ease: 'power1.out' });
  const typed = sequence();

  return new Promise((resolve) => {
    Promise.all([ready, typed]).then(() => {
      const remaining = Math.max(0, MIN_MS - (performance.now() - t0));
      setTimeout(() => {
        progress.kill();
        gsap.to(line, { scaleX: 1, duration: 0.25, ease: 'power1.in' });
        gsap.to(panel, {
          yPercent: -100,
          duration: reduced ? 0.3 : 0.9,
          delay: 0.35,
          ease: 'expo.inOut',
          onComplete: () => {
            panel.remove();
            resolve();
          },
        });
      }, remaining);
    });
  });
}
