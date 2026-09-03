import * as THREE from 'three';
import { TypeLoop } from '../fx/typewriter';
import { COPY } from '../content';

/**
 * Live CRT screen content rendered to a CanvasTexture.
 * Draw pipeline: terminal scene (typewriter headline, logs, glyph, crosshair,
 * program-bar marquee) goes into an offscreen buffer; the buffer is composited
 * to the texture canvas with a progress-driven v-hold roll that destabilizes
 * mid-dolly and locks back in at the seam; power-on boot and click-egg static
 * are overlaid last.
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

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class ScreenFX {
  readonly texture: THREE.CanvasTexture;
  private cv = document.createElement('canvas');
  private ctx = this.cv.getContext('2d')!;
  private buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d')!;
  private text = '';
  private loop: TypeLoop;
  private glyphIdx = 0;
  private glyphPos = { x: W * 0.62, y: H * 0.58 };
  private lastGlyphSwap = 0;
  private cursor = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, targetActive: 0 };
  private last = 0;
  private res = window.innerWidth < 768 ? 1.5 : 2;
  private mode: 'live' | 'boot' = 'live';
  private bootT0 = 0;
  private progress = 0; // dolly progress from the stage
  private eggFlash = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    // render at 2x logical size so the dolly close-up stays crisp
    const res = this.res;
    this.cv.width = W * res;
    this.cv.height = H * res;
    this.ctx.scale(res, res);
    this.buf.width = W * res;
    this.buf.height = H * res;
    this.bctx.scale(res, res);
    this.texture = new THREE.CanvasTexture(this.cv);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.loop = this.makeLoop();
    this.loop.start();
  }

  private makeLoop(): TypeLoop {
    return new TypeLoop({
      stem: COPY.screen.stem,
      words: COPY.screen.words,
      typeMs: 64,
      onUpdate: (t) => (this.text = t),
    });
  }

  /** CRT power-on: hairline → vertical bloom → flash → live. Restarts typing. */
  powerOn() {
    if (this.reduced) return; // reduced motion: keep the stable picture
    this.mode = 'boot';
    this.bootT0 = 0; // stamped on first update frame
    this.loop.stop();
    this.text = '';
    this.loop = this.makeLoop();
    this.loop.start();
  }

  /** Dolly progress: drives v-hold instability (peaks mid-dolly, re-locks at the seam). */
  setProgress(p: number) {
    this.progress = p;
  }

  /** Click egg: one static flash + swap the pixel glyph. */
  egg() {
    this.eggFlash = 1;
    this.glyphIdx = (this.glyphIdx + 1) % GLYPHS.length;
    this.glyphPos.x = W * (0.5 + Math.random() * 0.3);
    this.glyphPos.y = H * (0.45 + Math.random() * 0.25);
    this.lastGlyphSwap = performance.now() + 900; // hold the new glyph a beat
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

    this.drawLive(now);

    // composite with v-hold roll: destabilizes mid-dolly, locks back in as
    // the camera docks at the seam (the resting picture is a stable terminal)
    const c = this.ctx;
    const k = this.reduced
      ? 0
      : smoothstep(0.22, 0.6, this.progress) * (1 - smoothstep(0.72, 0.92, this.progress));
    const roll = k > 0 ? (now * 0.25 * k) % H : 0;
    c.drawImage(this.buf, 0, roll, W, H);
    if (roll > 0) c.drawImage(this.buf, 0, roll - H, W, H); // wrap-around slice above
    // occasional horizontal tear while unstable
    if (k > 0.35 && Math.random() < 0.5) {
      const ty = Math.random() * H;
      const th = 4 + Math.random() * 6;
      const dx = (Math.random() * 2 - 1) * 16 * k;
      c.drawImage(this.cv, 0, ty * this.res, this.cv.width, th * this.res, dx, ty, W, th);
    }

    // click-egg static burst
    if (this.eggFlash > 0.05) {
      c.fillStyle = `rgba(200,230,222,${0.14 * this.eggFlash})`;
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < 220; i++) {
        const v = 120 + Math.random() * 135;
        c.fillStyle = `rgba(${v * 0.85},${v},${v * 0.95},${this.eggFlash * 0.9})`;
        c.fillRect(Math.random() * W, Math.random() * H, Math.random() * 9, Math.random() * 3);
      }
      this.eggFlash *= 0.78;
    }

    // power-on overlay
    if (this.mode === 'boot') {
      if (!this.bootT0) this.bootT0 = now;
      const bt = now - this.bootT0;
      if (bt < 260) {
        // black, a horizontal hairline blooming from the center
        c.fillStyle = '#020505';
        c.fillRect(0, 0, W, H);
        const t = bt / 260;
        const lw = W * (0.04 + 0.96 * t * t);
        c.fillStyle = '#dffef5';
        c.fillRect((W - lw) / 2, H / 2 - 1.2, lw, 2.4);
      } else if (bt < 520) {
        // the line opens vertically into a white field
        const t = (bt - 260) / 260;
        c.fillStyle = '#020505';
        c.fillRect(0, 0, W, H);
        const lh = H * t * t;
        c.fillStyle = '#eafff8';
        c.fillRect(0, (H - lh) / 2, W, lh);
      } else if (bt < 680) {
        // flash decays over the live picture
        const t = (bt - 520) / 160;
        c.fillStyle = `rgba(234,255,248,${1 - t})`;
        c.fillRect(0, 0, W, H);
      } else {
        this.mode = 'live';
      }
    }

    this.texture.needsUpdate = true;
  }

  /** Terminal scene → offscreen buffer. */
  private drawLive(now: number) {
    const c = this.bctx;

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
    c.font = '600 30px "JetBrains Mono", "Noto Sans SC", monospace';
    c.textBaseline = 'top';
    const hi = COPY.screen.highlight;
    const hiStart = hi ? this.text.indexOf(hi) : -1;
    // 高亮词和"— 尾词"是不可拆的整体：放不下就整体换行，不再出现"— 调 / 研"
    const stem = COPY.screen.stem;
    const tailStart = Math.max(0, stem.lastIndexOf('—'));
    const longest = COPY.screen.words.reduce((a, b) => (b.length > a.length ? b : a), '');
    const tailW = c.measureText(stem.slice(tailStart) + longest).width;
    const hiW = hi ? c.measureText(hi).width : 0;
    let x = 34;
    let y = 40;
    const maxW = W - 60;
    for (let i = 0; i < this.text.length; i++) {
      const ch = this.text[i];
      const chW = c.measureText(ch).width;
      const atomW = i === hiStart ? hiW : i === tailStart && i >= stem.length - 3 ? tailW : chW;
      if (x + atomW > maxW && x > 34) {
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
    COPY.screen.logs.forEach((l, i) => c.fillText(l, 34, H - 104 + i * 20));

    // program-bar marquee (正在播出…)
    const bandY = H - 44;
    c.fillStyle = 'rgba(63,216,192,0.08)';
    c.fillRect(0, bandY, W, 17);
    c.fillStyle = 'rgba(63,216,192,0.7)';
    const txt = '正在播出：作品集 · CH 00　──　';
    const tw = c.measureText(txt).width;
    const off = (now * 0.05) % tw;
    for (let mx = -off; mx < W; mx += tw) c.fillText(txt, mx, bandY + 3);

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
  }
}
