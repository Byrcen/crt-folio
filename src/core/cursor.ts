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
  // 按下：准星收缩成实心点，给拖拽 / 点击一个反馈
  addEventListener('pointerdown', () => el.classList.add('is-grab'));
  addEventListener('pointerup', () => el.classList.remove('is-grab'));
  addEventListener('pointercancel', () => el.classList.remove('is-grab'));

  // 按时间缓动（τ=120ms），不同刷新率下跟随手感一致
  let last = 0;
  const tick = (now: number) => {
    const dt = last ? Math.min(now - last, 50) : 16.7;
    last = now;
    const k = 1 - Math.exp(-dt / 45);
    if (pointerIn) {
      const nx = x + (tx - x) * k;
      const ny = y + (ty - y) * k;
      vx = nx - x;
      vy = ny - y;
      x = nx;
      y = ny;
    } else {
      // inertial drift after the pointer leaves
      const damp = Math.pow(0.96, dt / 16.7);
      vx *= damp;
      vy *= damp;
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
