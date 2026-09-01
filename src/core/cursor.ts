/** Custom reticle cursor with lerp follow + inertial drift. */
export function initCursor() {
  const el = document.getElementById('cursor')!;
  // 与 CSS 用同一条媒体查询：innerWidth < 768 会在 768 整点上留下
  // "原生光标已隐藏、准星又被 CSS 关掉"的无光标空档
  if (window.matchMedia('(pointer: coarse), (max-width: 768px)').matches) {
    el.style.display = 'none';
    return;
  }
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

  // hover growth — 文档级委托：晚建元素（放映厅换台区、说明档克隆链接）
  // 无需重新绑定也能生效
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest?.('[data-hover]');
    if (t && !t.contains(e.relatedTarget as Node)) el.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (e) => {
    const t = (e.target as Element).closest?.('[data-hover]');
    if (t && !t.contains(e.relatedTarget as Node)) el.classList.remove('is-hover');
  });
}

export function setCursorHidden(hidden: boolean) {
  document.body.classList.toggle('cursor-hidden', hidden);
}
