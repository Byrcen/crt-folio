/**
 * Synthesized UI sounds via WebAudio — no audio assets needed.
 * Disabled by default; the HUD "声音" toggle enables it (first user gesture
 * also unlocks the AudioContext).
 */
class SoundFX {
  enabled = false;
  private ctx: AudioContext | null = null;

  enable(on: boolean) {
    this.enabled = on;
    if (on) {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
      this.play('click');
    }
  }

  play(name: 'tick' | 'click' | 'switch' | 'static' | 'reveal') {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'tick': // hover: tiny high blip
        this.blip(t, 1700, 0.03, 0.035, 'square');
        break;
      case 'click': // generic click
        this.blip(t, 950, 0.05, 0.05, 'square');
        this.blip(t + 0.03, 660, 0.04, 0.04, 'square');
        break;
      case 'switch': // knob: low mechanical thunk
        this.blip(t, 150, 0.1, 0.14, 'sine');
        this.noise(t, 0.04, 0.06, 2400);
        break;
      case 'static': // NO SIGNAL: band-passed static burst
        this.noise(t, 0.65, 0.07, 1100);
        break;
      case 'reveal': // preloader exit: soft rising sweep
        this.sweep(t, 220, 480, 0.4, 0.05);
        break;
    }
  }

  private blip(t: number, freq: number, dur: number, vol: number, type: OscillatorType) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, vol: number, bandHz: number) {
    const ctx = this.ctx!;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bandHz;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
  }

  private sweep(t: number, f0: number, f1: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

export const sound = new SoundFX();

/** Wire hover ticks onto all [data-hover] elements. */
export function bindHoverSounds() {
  document.querySelectorAll<HTMLElement>('[data-hover]').forEach((el) => {
    el.addEventListener('mouseenter', () => sound.play('tick'));
  });
}
