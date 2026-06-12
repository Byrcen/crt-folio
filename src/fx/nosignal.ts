/**
 * "NO SIGNAL" CRT static transition. Hard cuts, no easing:
 * black → navy glitch band → rolling bright band → blue-white flash
 * → snow static with eroded NO SIGNAL caps → fade out.
 */
let playing = false;

export function playNoSignal(durationMs = 1000): Promise<void> {
  if (playing) return Promise.resolve();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return fadeOnly();
  }
  playing = true;

  const cv = document.getElementById('nosignal') as HTMLCanvasElement;
  const c = cv.getContext('2d')!;
  const W = (cv.width = Math.floor(innerWidth / 3)); // quarter-res noise, CSS scales up
  const H = (cv.height = Math.floor(innerHeight / 3));
  cv.style.display = 'block';
  cv.style.opacity = '1';

  const phases = [0.08, 0.2, 0.32, 0.4, 0.85, 1]; // cumulative fractions
  // frame-delta clock (capped): a backgrounded tab pauses instead of skipping
  let elapsed = 0;
  let last = performance.now();

  return new Promise((resolve) => {
    const frame = (now: number) => {
      elapsed += Math.min(now - last, 64);
      last = now;
      const p = elapsed / durationMs;
      if (p >= 1) {
        cv.style.display = 'none';
        playing = false;
        resolve();
        return;
      }
      c.fillStyle = '#000';
      c.fillRect(0, 0, W, H);

      if (p < phases[0]) {
        // black
      } else if (p < phases[1]) {
        // navy glitch band, jumps position
        const y = Math.random() < 0.5 ? H * 0.2 : 0;
        c.fillStyle = '#1d2a4a';
        c.fillRect(0, y, W, H * 0.09);
        for (let i = 0; i < 40; i++) {
          c.fillStyle = `rgba(90,120,200,${Math.random() * 0.5})`;
          c.fillRect(Math.random() * W, y + Math.random() * H * 0.09, Math.random() * 30, 2);
        }
      } else if (p < phases[2]) {
        // bright band rolling to the bottom (vertical hold loss)
        const t = (p - phases[1]) / (phases[2] - phases[1]);
        const y = t * H;
        c.fillStyle = '#0b1228';
        c.fillRect(0, 0, W, H);
        const grd = c.createLinearGradient(0, y - 30, 0, y + 30);
        grd.addColorStop(0, 'rgba(180,220,255,0)');
        grd.addColorStop(0.5, 'rgba(220,240,255,0.95)');
        grd.addColorStop(1, 'rgba(180,220,255,0)');
        c.fillStyle = grd;
        c.fillRect(0, y - 30, W, 60);
      } else if (p < phases[3]) {
        // blue-white full flash with herringbone
        c.fillStyle = '#cfe2ff';
        c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(40,80,160,0.4)';
        for (let y = 0; y < H; y += 3) c.fillRect((y % 6) - 3, y, W, 1);
      } else if (p < phases[4]) {
        // snow static + NO SIGNAL
        const img = c.createImageData(W, H);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 235;
          d[i] = v * 0.82;
          d[i + 1] = v * 0.86;
          d[i + 2] = v;
          d[i + 3] = 255;
        }
        c.putImageData(img, 0, 0);
        // drifting brighter band
        const by = ((now / 6) % (H * 1.4)) - H * 0.2;
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.fillRect(0, by, W, H * 0.07);
        // eroded caps
        c.save();
        c.font = `700 ${Math.floor(H * 0.1)}px "JetBrains Mono", monospace`;
        c.textAlign = 'center';
        c.fillStyle = 'rgba(10,12,20,0.85)';
        c.setTransform(1, 0, 0, 1.6, 0, 0); // tall narrow
        c.fillText('NO SIGNAL', W / 2, (H * 0.38) / 1.6);
        c.fillText('NO SIGNAL', W / 2 + (Math.random() * 4 - 2), (H * 0.8) / 1.6);
        c.restore();
        // erosion: punch noise holes through the text
        for (let i = 0; i < 250; i++) {
          const v = Math.random() * 235;
          c.fillStyle = `rgb(${v * 0.85},${v * 0.9},${v})`;
          c.fillRect(Math.random() * W, H * 0.3 + Math.random() * H * 0.55, Math.random() * 8, Math.random() * 3);
        }
      } else {
        // dim out
        const t = (p - phases[4]) / (phases[5] - phases[4]);
        const img = c.createImageData(W, H);
        const d = img.data;
        const dim = 1 - t;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() < dim * 0.8 ? Math.random() * 160 * dim : 0;
          d[i] = d[i + 1] = v;
          d[i + 2] = v * 1.1;
          d[i + 3] = 255;
        }
        c.putImageData(img, 0, 0);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function fadeOnly(): Promise<void> {
  const cv = document.getElementById('nosignal') as HTMLCanvasElement;
  cv.style.display = 'block';
  cv.style.background = '#000';
  cv.style.opacity = '1';
  return new Promise((r) =>
    setTimeout(() => {
      cv.style.display = 'none';
      cv.style.background = 'transparent';
      r();
    }, 250),
  );
}
