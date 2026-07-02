import { gsap } from '../core/scroll';

/**
 * Desktop works gallery: drag horizontally (mouse / trackpad) to browse.
 * Pointer-drag with release inertia that settles by snapping the nearest
 * poster to viewport-center, horizontal-wheel support, a center-focus effect
 * (the centered poster straightens, scales up and brightens; the others tilt
 * away, shrink and dim), and keyboard access (Tab + ← →).
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
  // 源码 link beneath each poster (only live projects have one) — kept aligned
  // to `posters` by index so it dims with its caption in focus().
  const srcs = posters.map((p) => p.parentElement?.querySelector<HTMLElement>('.p-src') ?? null);
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
  let wheelTimer = 0;

  const minX = () => Math.min(0, viewport.clientWidth - track.scrollWidth);
  const clamp = (v: number) => Math.max(minX(), Math.min(0, v));

  const focus = () => {
    const vc = window.innerWidth / 2;
    let nearest = 0;
    let nd = Infinity;
    // read all rects first, then write all styles: interleaving the two forces
    // a synchronous layout per poster (5 reflows per drag frame)
    const rects = posters.map((p) => p.getBoundingClientRect());
    rects.forEach((r, i) => {
      const pc = r.left + r.width / 2;
      const k = gsap.utils.clamp(-1, 1, ((pc - vc) / window.innerWidth) * 1.7);
      const a = Math.abs(k);
      gsap.set(posters[i], {
        rotateY: -k * 26,
        scale: 1 - a * 0.16,
        filter: `brightness(${(1 - a * 0.5).toFixed(3)})`,
        transformPerspective: 1100,
        transformOrigin: 'center center',
        z: -a * 120,
      });
      if (caps[i]) gsap.set(caps[i], { opacity: 1 - a * 0.75 });
      if (srcs[i]) gsap.set(srcs[i], { opacity: 1 - a * 0.75 });
      if (a < nd) {
        nd = a;
        nearest = i;
      }
    });
    if (counter) {
      counter.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
    return nearest;
  };

  const render = () => {
    gsap.set(track, { x });
    focus();
  };

  // tween the track so poster `i` lands centered; cancels on the next grab
  const proxy = { v: 0 };
  let snapTween: ReturnType<typeof gsap.to> | null = null;
  const snapTo = (i: number) => {
    i = gsap.utils.clamp(0, total - 1, i);
    const r = posters[i].getBoundingClientRect();
    const dest = clamp(x + (window.innerWidth / 2 - (r.left + r.width / 2)));
    snapTween?.kill();
    proxy.v = x;
    snapTween = gsap.to(proxy, {
      v: dest,
      duration: 0.55,
      ease: 'power3.out',
      onUpdate: () => {
        x = proxy.v;
        render();
      },
    });
  };

  const loop = () => {
    if (!dragging) {
      x = clamp(x + vx);
      vx *= 0.9;
      if (Math.abs(vx) < 0.12 || x === clamp(x + vx * 2)) {
        vx = 0;
        raf = 0;
        snapTo(focus()); // settle on the nearest poster, centered
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
    if (e.button !== 0) return; // left button only — let right-click reach the menu
    snapTween?.kill();
    dragging = true;
    moved = 0;
    startPX = e.clientX;
    lastPX = e.clientX;
    startX = x;
    vx = 0;
    viewport.classList.add('grabbing');
    dismissHint();
    kick();
  });

  // Track the drag on `window` rather than calling setPointerCapture on the
  // viewport: capturing the pointer retargets the synthesized `click` to the
  // capturing element, so a poster's <a> never receives the click and its link
  // never opens. Window listeners keep the drag tracking outside the gallery
  // (the reason capture was used) while leaving native link clicks intact.
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startPX;
    moved = Math.max(moved, Math.abs(dx));
    x = clamp(startX + dx);
    vx = e.clientX - lastPX;
    lastPX = e.clientX;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('grabbing');
    kick();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  // horizontal trackpad / shift-wheel pans; vertical wheel scrolls the page.
  // pan freely while the wheel is active, then snap once it goes idle.
  viewport.addEventListener(
    'wheel',
    (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      snapTween?.kill();
      x = clamp(x - dx);
      vx = 0;
      dismissHint();
      render();
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => snapTo(focus()), 150);
    },
    { passive: false },
  );

  // a drag shouldn't trigger any gallery link — the poster itself or the 源码
  // link beneath it. Only suppress pointer clicks (e.detail > 0); keyboard
  // activation (Enter, e.detail === 0) must always follow the link, even right
  // after a drag left `moved` elevated.
  gsap.utils.toArray<HTMLElement>('#gallery a').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.detail > 0 && moved > 6) e.preventDefault();
    }),
  );
  track.addEventListener('dragstart', (e) => e.preventDefault());

  // keyboard: focusing a poster (Tab) centers it; ← → step between posters
  posters.forEach((p, i) => {
    p.addEventListener('focus', () => {
      // the browser auto-scrolls the overflow:hidden viewport to reveal the
      // focused link, bypassing the track transform (counter / center-focus
      // desync) — undo it; snapTo is the only scroller here
      viewport.scrollLeft = 0;
      dismissHint();
      snapTo(i);
    });
    p.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        posters[Math.min(total - 1, i + 1)].focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        posters[Math.max(0, i - 1)].focus();
      }
    });
  });

  window.addEventListener('resize', () => {
    snapTween?.kill();
    x = clamp(x);
    render();
  });

  render();
}
