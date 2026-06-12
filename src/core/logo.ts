/** Pixel "CRY" monogram with a constant glitch loop (discrete frame swaps). */
const C = ['.####', '#....', '#....', '#....', '#....', '.####'];
const R = ['####.', '#...#', '####.', '#.#..', '#..#.', '#...#'];
const Y = ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..'];
const SCRAMBLE = '#%&@?*+=<>';

export function initLogo(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const cell = 4;
  const cols = 17; // 5 + gap + 5 + gap + 5
  const rows = 6;

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

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color();
    const mode = Math.random();
    const ox = (canvas.width - cols * cell) / 2;
    if (mode < 0.55) {
      // full monogram
      for (const [x, y] of pixels) ctx.fillRect(ox + x * cell, y * cell, cell - 1, cell - 1);
    } else if (mode < 0.75) {
      // sparse dot cloud
      for (const [x, y] of pixels) {
        if (Math.random() < 0.45) ctx.fillRect(ox + x * cell, y * cell, cell - 1, cell - 1);
      }
    } else if (mode < 0.9) {
      // scrambled characters
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.textBaseline = 'top';
      let s = '';
      for (let i = 0; i < 3; i++) s += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      ctx.fillText(s, ox + 2, 2);
    } else {
      // sliced invert: full glyph + a displaced scan band
      for (const [x, y] of pixels) ctx.fillRect(ox + x * cell, y * cell, cell - 1, cell - 1);
      const bandY = (Math.random() * rows) | 0;
      const slice = ctx.getImageData(0, bandY * cell, canvas.width, cell);
      ctx.clearRect(0, bandY * cell, canvas.width, cell);
      ctx.putImageData(slice, (Math.random() * 10 - 5) | 0, bandY * cell);
    }
    setTimeout(draw, 500 + Math.random() * 600);
  };
  draw();
}
