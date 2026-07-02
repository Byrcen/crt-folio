/**
 * Teal pixel sprite that crawls the About-section grid in discrete steps,
 * morphing between shapes — time-driven, no tween.
 */
const SHAPES: number[][][] = [
  [[0, 0], [0, 1], [0, 2], [0, 3]], // bar
  [[0, 2], [1, 2], [1, 1], [2, 1], [2, 0]], // stairs
  [[0, 0], [0, 1], [0, 2], [1, 2]], // L
  [[0, 0], [1, 0], [0, 1], [1, 1]], // block
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], // plus
  [[1, 0], [0, 1], [2, 1], [1, 2], [1, 3]], // up arrow
];

export function initSnake(canvas: HTMLCanvasElement) {
  const section = canvas.parentElement!;
  const ctx = canvas.getContext('2d')!;
  const GRID = 26;
  let cols = 10;
  let rows = 10;
  let gx = 3;
  let gy = 3;
  let dir = { x: 1, y: 0 };
  let shape = 0;
  let last = 0;

  const resize = () => {
    // back the bitmap at device resolution — CSS-pixel bitmaps blur on 2–3× screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = section.clientWidth * dpr;
    canvas.height = section.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.floor(section.clientWidth / GRID);
    rows = Math.floor(section.clientHeight / GRID);
  };
  resize();
  addEventListener('resize', resize);

  const step = (now: number) => {
    if (now - last > 480) {
      last = now;
      // occasionally turn 90°
      if (Math.random() < 0.35) {
        dir = Math.random() < 0.5 ? { x: dir.y, y: dir.x } : { x: -dir.y, y: -dir.x };
      }
      gx += dir.x * (1 + ((Math.random() * 2) | 0));
      gy += dir.y * (1 + ((Math.random() * 2) | 0));
      // bounce off bounds
      if (gx < 2) { gx = 2; dir = { x: 1, y: 0 }; }
      if (gx > cols - 6) { gx = cols - 6; dir = { x: -1, y: 0 }; }
      if (gy < 2) { gy = 2; dir = { x: 0, y: 1 }; }
      if (gy > rows - 6) { gy = rows - 6; dir = { x: 0, y: -1 }; }
      shape = (shape + 1) % SHAPES.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createLinearGradient(0, gy * GRID, 0, (gy + 4) * GRID);
      grad.addColorStop(0, '#3fd8c0');
      grad.addColorStop(1, '#3f8ad8');
      ctx.fillStyle = grad;
      for (const [sx, sy] of SHAPES[shape]) {
        ctx.fillRect((gx + sx) * GRID + 1, (gy + sy) * GRID + 1, GRID - 2, GRID - 2);
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
