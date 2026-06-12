import * as THREE from 'three';
import { TypeLoop } from '../fx/typewriter';
import { COPY } from '../content';

/**
 * Live CRT screen content rendered to a CanvasTexture:
 * teal grid, typewriter headline (with highlighted word), log lines,
 * cycling pixel glyph, scanlines/flicker, and a big in-screen crosshair
 * that follows the pointer with a slow lerp.
 */
const W = 560;
const H = 460;
const CELL = 7; // pixel-glyph cell size

const GLYPHS: number[][][] = [
  // lightning
  [[3, 0], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3], [1, 4]],
  // stairs arrow
  [[0, 4], [1, 4], [1, 3], [2, 3], [2, 2], [3, 2], [3, 1], [4, 1], [4, 0]],
  // L
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]],
  // question curve
  [[1, 0], [2, 0], [3, 1], [2, 2], [2, 3], [2, 5]],
  // tv
  [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [1, 0], [3, 0]],
  // double up arrows
  [[1, 1], [0, 2], [2, 2], [1, 3], [1, 4], [4, 1], [3, 2], [5, 2], [4, 3], [4, 4]],
  // progress bar
  [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [0, 1], [0, 3], [5, 1], [5, 3]],
];

export class ScreenFX {
  readonly texture: THREE.CanvasTexture;
  private cv = document.createElement('canvas');
  private ctx = this.cv.getContext('2d')!;
  private text = '';
  private loop: TypeLoop;
  private glyphIdx = 0;
  private glyphPos = { x: W * 0.62, y: H * 0.58 };
  private lastGlyphSwap = 0;
  private cursor = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  private last = 0;

  constructor() {
    // render at 2x logical size so the dolly close-up stays crisp
    const res = window.innerWidth < 768 ? 1.5 : 2;
    this.cv.width = W * res;
    this.cv.height = H * res;
    this.ctx.scale(res, res);
    this.texture = new THREE.CanvasTexture(this.cv);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.loop = new TypeLoop({
      stem: COPY.screen.stem,
      words: COPY.screen.words,
      typeMs: 64,
      onUpdate: (t) => (this.text = t),
    });
    this.loop.start();
  }

  /** uv in [0,1] from raycast hit; null when pointer leaves the screen */
  setPointer(uv: { x: number; y: number } | null) {
    if (uv) {
      this.cursor.tx = uv.x;
      this.cursor.ty = 1 - uv.y;
      this.cursor.targetActive = 1;
    } else {
      this.cursor.targetActive = 0;
    }
  }

  update(now: number) {
    if (now - this.last < 33) return; // ~30fps is plenty for a CRT
    this.last = now;
    const c = this.ctx;

    // bg + grid (all coords are logical; ctx is pre-scaled)
    c.fillStyle = '#071512';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(63,216,192,0.07)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0.5; x < W; x += 20) {
      c.moveTo(x, 0);
      c.lineTo(x, H);
    }
    for (let y = 0.5; y < H; y += 20) {
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();

    // headline typewriter, char-wrapped (CJK-safe), with highlighted substring
    c.font = '600 32px "JetBrains Mono", "Noto Sans SC", monospace';
    c.textBaseline = 'top';
    const hi = COPY.screen.highlight;
    const hiStart = hi ? this.text.indexOf(hi) : -1;
    let x = 34;
    let y = 40;
    const maxW = W - 60;
    for (let i = 0; i < this.text.length; i++) {
      const ch = this.text[i];
      const chW = c.measureText(ch).width;
      if (x + chW > maxW) {
        x = 34;
        y += 44;
      }
      const inHi = hiStart >= 0 && i >= hiStart && i < hiStart + hi.length;
      if (inHi) {
        c.fillStyle = '#3fd8c0';
        c.fillRect(x - 1, y - 2, chW + 2, 38);
        c.fillStyle = '#071512';
      } else {
        c.fillStyle = '#e8f4f0';
      }
      c.fillText(ch, x, y);
      x += chW;
    }
    // caret
    if (Math.floor(now / 500) % 2 === 0) {
      c.fillStyle = '#e8f4f0';
      c.fillRect(x, y, 16, 34);
    }

    // log lines
    c.font = '12px "JetBrains Mono", "Noto Sans SC", monospace';
    c.fillStyle = 'rgba(180,210,202,0.55)';
    COPY.screen.logs.forEach((l, i) => c.fillText(l, 34, H - 92 + i * 20));

    // corner HUD labels
    c.fillStyle = 'rgba(180,210,202,0.4)';
    c.font = '11px "JetBrains Mono", monospace';
    const [a, b, r, d] = COPY.screen.corners;
    c.fillText(a, 16, 12);
    c.textAlign = 'right';
    c.fillText(b, W - 16, 12);
    c.fillText(r, W - 16, H - 24);
    c.textAlign = 'left';
    c.fillText(d, 16, H - 24);

    // cycling pixel glyph
    if (now - this.lastGlyphSwap > 450) {
      this.lastGlyphSwap = now;
      this.glyphIdx = (this.glyphIdx + 1) % GLYPHS.length;
      this.glyphPos.x = W * (0.5 + Math.random() * 0.3);
      this.glyphPos.y = H * (0.45 + Math.random() * 0.25);
    }
    c.fillStyle = '#3fd8c0';
    for (const [gx, gy] of GLYPHS[this.glyphIdx]) {
      c.fillRect(this.glyphPos.x + gx * CELL, this.glyphPos.y + gy * CELL, CELL - 1, CELL - 1);
    }

    // big crosshair (slow lerp, lingers after leave)
    const cur = this.cursor;
    cur.x += (cur.tx - cur.x) * 0.07;
    cur.y += (cur.ty - cur.y) * 0.07;
    cur.active += (cur.targetActive - cur.active) * (cur.targetActive ? 0.2 : 0.02);
    if (cur.active > 0.02) {
      const cx = cur.x * W;
      const cy = cur.y * H;
      c.fillStyle = `rgba(255,255,255,${0.9 * cur.active})`;
      const t = 7; // thickness
      const len = 42;
      const gap = 12;
      c.fillRect(cx - t / 2, cy - gap - len, t, len);
      c.fillRect(cx - t / 2, cy + gap, t, len);
      c.fillRect(cx - gap - len, cy - t / 2, len, t);
      c.fillRect(cx + gap, cy - t / 2, len, t);
    }

    // scanlines + flicker
    c.fillStyle = 'rgba(0,0,0,0.16)';
    for (let sy = 0; sy < H; sy += 4) c.fillRect(0, sy, W, 1);
    if (Math.random() < 0.06) {
      c.fillStyle = 'rgba(255,255,255,0.03)';
      c.fillRect(0, 0, W, H);
    }

    this.texture.needsUpdate = true;
  }
}
