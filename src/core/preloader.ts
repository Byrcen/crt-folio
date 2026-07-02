import gsap from 'gsap';
import { COPY } from '../content';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SEEN_KEY = 'crt-boot-seen';

let skipped = false;

function typeInto(el: HTMLElement, text: string, perChar: number, accent = false): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (skipped) {
        resolve();
        return;
      }
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
 * Return visits get a condensed boot; any click / key skips the theatre
 * (the panel still waits for `ready` — assets must exist before the hero).
 */
export function runPreloader(ready: Promise<unknown>): Promise<void> {
  const panel = document.getElementById('preloader')!;
  const cmd = document.getElementById('cli-cmd')!;
  const out = document.getElementById('cli-out')!;
  const line = document.getElementById('pre-line')!;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    /* storage may be unavailable (private mode) — treat as first visit */
  }
  skipped = false;

  const printFinalState = () => {
    cmd.innerHTML = `/<b>${COPY.cli.cmdName}</b>`;
    out.replaceChildren(
      ...COPY.cli.output.map((text) => {
        const row = document.createElement('div');
        row.textContent = text;
        row.style.opacity = '1';
        return row;
      }),
    );
  };

  const sequence = async () => {
    if (reduced || seen) {
      printFinalState();
      if (seen && !reduced) await wait(450); // one readable beat, not a ceremony
      return;
    }
    await wait(900); // caret blinks alone first
    await typeInto(cmd, COPY.cli.cmdSlash, 140);
    if (skipped) return;
    await wait(420);
    await typeInto(cmd, COPY.cli.cmdName, 150, true);
    if (skipped) return;
    await wait(500);
    // "enter": boot log prints
    for (const text of COPY.cli.output) {
      if (skipped) return;
      const row = document.createElement('div');
      row.textContent = text;
      out.appendChild(row);
      gsap.to(row, { opacity: 1, duration: 0.12 });
      await wait(240);
    }
  };

  const MIN_MS = reduced ? 400 : seen ? 900 : 3400;
  const t0 = performance.now();
  const progress = gsap.to(line, { scaleX: 0.92, duration: MIN_MS / 1000 + 1.5, ease: 'power1.out' });
  const typed = sequence();

  // any input fast-forwards the boot
  let releaseSkip: () => void;
  const skippable = new Promise<void>((r) => (releaseSkip = r));
  const skip = () => {
    if (skipped) return;
    skipped = true;
    printFinalState();
    releaseSkip();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // leave shortcuts alone
    skip();
  };
  panel.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', onKey);

  return new Promise((resolve) => {
    Promise.all([ready, Promise.race([typed, skippable])]).then(() => {
      const remaining = skipped ? 0 : Math.max(0, MIN_MS - (performance.now() - t0));
      setTimeout(() => {
        window.removeEventListener('keydown', onKey);
        try {
          localStorage.setItem(SEEN_KEY, '1');
        } catch {
          /* ignore */
        }
        progress.kill();
        gsap.to(line, { scaleX: 1, duration: 0.25, ease: 'power1.in' });
        gsap.to(panel, {
          yPercent: -100,
          duration: reduced ? 0.3 : 0.9,
          delay: skipped ? 0.1 : 0.35,
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
