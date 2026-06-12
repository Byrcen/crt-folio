/** Custom reticle cursor with lerp follow + inertial drift. */
export function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) return;

  const el = document.getElementById('cursor')!;
  document.body.classList.add('no-native-cursor');

  let tx = innerWidth / 2;
  let ty = innerHeight / 2;
  let x = tx;
  let y = ty;
  let vx = 0;
  let vy = 0;
  let pointerIn = true;

  addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    pointerIn = true;
  });
  document.documentElement.addEventListener('mouseleave', () => (pointerIn = false));

  const LERP = 0.13;
  const tick = () => {
    if (pointerIn) {
      const nx = x + (tx - x) * LERP;
      const ny = y + (ty - y) * LERP;
      vx = nx - x;
      vy = ny - y;
      x = nx;
      y = ny;
    } else {
      // inertial drift after the pointer leaves
      vx *= 0.96;
      vy *= 0.96;
      x += vx;
      y += vy;
    }
    el.style.translate = `${x}px ${y}px`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // hover growth
  document.querySelectorAll<HTMLElement>('[data-hover]').forEach((t) => {
    t.addEventListener('mouseenter', () => el.classList.add('is-hover'));
    t.addEventListener('mouseleave', () => el.classList.remove('is-hover'));
  });
}

export function setCursorHidden(hidden: boolean) {
  document.body.classList.toggle('cursor-hidden', hidden);
}
