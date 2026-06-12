const POOL = '!<>-_\\/[]{}—=+*^?#________';

/** Glitch-scramble a text element once (~280ms), restoring original. */
export function scrambleOnce(el: HTMLElement, duration = 280) {
  const original = el.dataset.original ?? el.textContent ?? '';
  el.dataset.original = original;
  if (el.dataset.scrambling) return;
  el.dataset.scrambling = '1';
  const start = performance.now();
  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const settled = Math.floor(original.length * p);
    let out = original.slice(0, settled);
    for (let i = settled; i < original.length; i++) {
      out += original[i] === ' ' ? ' ' : POOL[(Math.random() * POOL.length) | 0];
    }
    el.textContent = out;
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = original;
      delete el.dataset.scrambling;
    }
  };
  requestAnimationFrame(frame);
}

/** Decode-in effect: starts fully scrambled, resolves to target. */
export function decodeIn(el: HTMLElement, target: string, duration = 1000) {
  const start = performance.now();
  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const settled = Math.floor(target.length * p);
    let out = target.slice(0, settled);
    for (let i = settled; i < target.length; i++) {
      out += target[i] === ' ' ? ' ' : POOL[(Math.random() * POOL.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export function bindScrambleHover(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    el.addEventListener('mouseenter', () => scrambleOnce(el));
  });
}
