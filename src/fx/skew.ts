import { gsap } from '../core/scroll';

/**
 * Desktop works gallery: drag horizontally (mouse / trackpad) to browse.
 * Pointer-drag with release inertia, horizontal-wheel support, and a
 * center-focus effect (the poster nearest viewport-center straightens,
 * scales up and brightens; the others tilt away, shrink and dim).
 * Mobile / reduced-motion fall back to the CSS vertical stack.
 */
export function initGalleryDrag() {
  const viewport = document.getElementById('gallery-pin');
  const track = document.getElementById('gallery');
  const counter = document.getElementById('works-counter');
  const hint = document.getElementById('drag-hint');
  if (!viewport || !track) return;

  const posters = gsap.utils.toArray<HTMLElement>('.poster');
  const caps = gsap.utils.toArray<HTMLElement>('.work .cap');
  const total = posters.length;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (reduced || isMobile) return; // CSS handles the stacked layout

  let x = 0;
  let vx = 0;
  let dragging = false;
  let startPX = 0;
  let startX = 0;
  let lastPX = 0;
  let moved = 0;
  let raf = 0;

  const minX = () => Math.min(0, viewport.clientWidth - track.scrollWidth);
  const clamp = (v: number) => Math.max(minX(), Math.min(0, v));

  const focus = () => {
    const vc = window.innerWidth / 2;
    let nearest = 0;
    let nd = Infinity;
    posters.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const pc = r.left + r.width / 2;
      const k = gsap.utils.clamp(-1, 1, ((pc - vc) / window.innerWidth) * 1.7);
      const a = Math.abs(k);
      gsap.set(p, {
        rotateY: -k * 26,
        scale: 1 - a * 0.16,
        filter: `brightness(${(1 - a * 0.5).toFixed(3)})`,
        transformPerspective: 1100,
        transformOrigin: 'center center',
        z: -a * 120,
      });
      if (caps[i]) gsap.set(caps[i], { opacity: 1 - a * 0.75 });
      if (a < nd) {
        nd = a;
        nearest = i;
      }
    });
    if (counter) {
      counter.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
  };

  const render = () => {
    gsap.set(track, { x });
    focus();
  };

  const loop = () => {
    if (!dragging) {
      x = clamp(x + vx);
      vx *= 0.9;
      if (Math.abs(vx) < 0.12 || x === clamp(x + vx * 2)) {
        vx = 0;
        render();
        raf = 0;
        return;
      }
    }
    render();
    raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const dismissHint = () => {
    if (hint) gsap.to(hint, { opacity: 0, duration: 0.4, onComplete: () => hint.remove() });
  };

  viewport.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    startPX = e.clientX;
    lastPX = e.clientX;
    startX = x;
    vx = 0;
    viewport.classList.add('grabbing');
    try {
      viewport.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / already-released pointer */
    }
    dismissHint();
    kick();
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startPX;
    moved = Math.max(moved, Math.abs(dx));
    x = clamp(startX + dx);
    vx = e.clientX - lastPX;
    lastPX = e.clientX;
  });

  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('grabbing');
    try {
      viewport.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    kick();
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  // horizontal trackpad / shift-wheel pans; vertical wheel scrolls the page
  viewport.addEventListener(
    'wheel',
    (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      x = clamp(x - dx);
      vx = 0;
      dismissHint();
      kick();
    },
    { passive: false },
  );

  // a drag shouldn't trigger the poster's link
  posters.forEach((p) =>
    p.addEventListener('click', (e) => {
      if (moved > 6) e.preventDefault();
    }),
  );
  track.addEventListener('dragstart', (e) => e.preventDefault());

  window.addEventListener('resize', () => {
    x = clamp(x);
    render();
  });

  render();
}
