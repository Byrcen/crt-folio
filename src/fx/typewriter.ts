/** Typewriter with rotating tail word: "stem … film|television|music". */
export interface TypeLoopOpts {
  stem: string;
  words: string[];
  typeMs?: number; // per char (randomized ±40%)
  deleteMs?: number;
  holdMs?: number; // pause with full sentence
  gapMs?: number; // pause after deletion
  onUpdate: (text: string) => void;
}

export class TypeLoop {
  private opts: Required<TypeLoopOpts>;
  private timer = 0;
  private wordIdx = 0;
  private stopped = false;

  constructor(opts: TypeLoopOpts) {
    this.opts = {
      typeMs: 52,
      deleteMs: 34,
      holdMs: 1600,
      gapMs: 220,
      ...opts,
    };
  }

  /** Type full sentence once, then loop tail-word rotation forever. */
  start() {
    this.stopped = false;
    const full = this.opts.stem + this.opts.words[0];
    this.typeChars(full, 0, () => this.cycle());
  }

  /** Skip animation: render final state (for reduced motion). */
  finishNow() {
    this.stop();
    this.opts.onUpdate(this.opts.stem + this.opts.words[0]);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  private typeChars(target: string, from: number, done: () => void) {
    if (this.stopped) return;
    this.opts.onUpdate(target.slice(0, from));
    if (from >= target.length) {
      done();
      return;
    }
    const jitter = 0.6 + Math.random() * 0.8;
    this.timer = window.setTimeout(
      () => this.typeChars(target, from + 1, done),
      this.opts.typeMs * jitter,
    );
  }

  private cycle() {
    if (this.stopped) return;
    this.timer = window.setTimeout(() => this.deleteWord(), this.opts.holdMs);
  }

  private deleteWord() {
    const word = this.opts.words[this.wordIdx];
    let remain = word.length;
    const step = () => {
      if (this.stopped) return;
      remain--;
      this.opts.onUpdate(this.opts.stem + word.slice(0, remain));
      if (remain > 0) {
        this.timer = window.setTimeout(step, this.opts.deleteMs);
      } else {
        this.wordIdx = (this.wordIdx + 1) % this.opts.words.length;
        const next = this.opts.words[this.wordIdx];
        this.timer = window.setTimeout(() => {
          this.typeChars(this.opts.stem + next, this.opts.stem.length, () => this.cycle());
        }, this.opts.gapMs);
      }
    };
    step();
  }
}

/** Bind a TypeLoop to a DOM element with a block caret. */
export function domTypeLoop(el: HTMLElement, stem: string, words: string[], opts: Partial<TypeLoopOpts> = {}) {
  const text = document.createElement('span');
  const caret = document.createElement('span');
  caret.className = 'caret';
  el.replaceChildren(text, caret);
  return new TypeLoop({
    stem,
    words,
    onUpdate: (t) => (text.textContent = t),
    ...opts,
  } as TypeLoopOpts);
}

/** One-shot line typing (no rotation), returns a promise. */
export function typeOnce(el: HTMLElement, full: string, perChar = 42): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      el.textContent = full.slice(0, i);
      if (i++ >= full.length) {
        resolve();
        return;
      }
      setTimeout(tick, perChar * (0.7 + Math.random() * 0.6));
    };
    tick();
  });
}
