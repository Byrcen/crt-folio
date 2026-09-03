/** Pixel "CRY" monogram with a constant glitch loop (discrete frame swaps). */
const C = ['.####', '#....', '#....', '#....', '#....', '.####'];
const R = ['####.', '#...#', '####.', '#.#..', '#..#.', '#...#'];
const Y = ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..'];

export function initLogo(canvas: HTMLCanvasElement, opts: { still?: boolean } = {}) {
  const ctx = canvas.getContext('2d')!;
  const cell = 4;
  const cols = 17; // 5 + gap + 5 + gap + 5
  const rows = 6;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pixels: [number, number][] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < 5; x++) {
      if (C[y][x] === '#') pixels.push([x, y]);
      if (R[y][x] === '#') pixels.push([x + 6, y]);
      if (Y[y][x] === '#') pixels.push([x + 12, y]);
    }
  }

  const color = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--hud').trim() || '#ededed';

  const drawFull = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color();
    const ox = (canvas.width - cols * cell) / 2;
    for (const [x, y] of pixels) ctx.fillRect(ox + x * cell, y * cell, cell - 1, cell - 1);
  };
  // 故障只留一种：完整字标 + 一条错位扫描带，80–140ms 后恢复
  const drawSlice = () => {
    drawFull();
    const bandY = (Math.random() * rows) | 0;
    const slice = ctx.getImageData(0, bandY * cell, canvas.width, cell);
    ctx.clearRect(0, bandY * cell, canvas.width, cell);
    ctx.putImageData(slice, (Math.random() * 10 - 5) | 0, bandY * cell);
  };
  let restoreT = 0;
  const glitch = (ms: number) => {
    drawSlice();
    clearTimeout(restoreT);
    restoreT = window.setTimeout(drawFull, ms);
  };
  drawFull();
  // 颜色随日夜 / 分区翻转：属性一变就重绘（不再靠常态重绘顺带更新）
  new MutationObserver(() => {
    clearTimeout(restoreT);
    drawFull();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-zone'] });
  if (reduced || opts.still) return; // 页脚与子页的字标恒完整
  const schedule = () => {
    window.setTimeout(() => {
      glitch(80 + Math.random() * 60);
      schedule();
    }, 20000 + Math.random() * 10000); // 每 20–30s 一次
  };
  schedule();
  // hover / 聚焦：一次 300ms 切片当按钮反馈
  canvas.addEventListener('pointerenter', () => glitch(300));
  canvas.addEventListener('focus', () => glitch(300));
}
