import { gsap } from '../core/scroll';

/** Split [data-reveal-lines] into lines; reveal gray→white, staggered, on enter. */
export function initLineReveals() {
  document.querySelectorAll<HTMLElement>('[data-reveal-lines]').forEach((el) => {
    const words = (el.textContent ?? '').trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="rw">${w}</span>`).join(' ');
    const spans = el.querySelectorAll('.rw');
    gsap.fromTo(
      spans,
      { color: '#3a3a3a' },
      {
        color: '#9a9a9a',
        stagger: 0.018,
        duration: 0.45,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 82%' },
      },
    );
  });
}

/** Pill buttons: outline first, label ~0.5s later. */
export function initPillReveals() {
  document.querySelectorAll<HTMLElement>('.pill').forEach((pill) => {
    const label = pill.querySelector('span');
    const tl = gsap.timeline({ scrollTrigger: { trigger: pill, start: 'top 88%' } });
    tl.to(pill, { opacity: 1, duration: 0.35 }).to(label, { opacity: 1, duration: 0.4 }, '+=0.45');
  });
}

/** Numbered step labels pop in one by one. */
export function initSteps() {
  gsap.to('#steps li', {
    opacity: 1,
    stagger: 0.18,
    duration: 0.05, // near-instant pop, no fade-tween feel
    ease: 'none',
    scrollTrigger: { trigger: '#steps', start: 'top 75%' },
  });
}

/** Footer manifesto box: brighten + slight rise. */
export function initFootBox() {
  gsap.from('#foot-box', {
    opacity: 0.25,
    y: 18,
    duration: 0.8,
    ease: 'power2.out',
    scrollTrigger: { trigger: '#foot-box', start: 'top 85%' },
  });
}

/** Works title: first letter dark→bright CRT flicker. */
export function initWorksTitle() {
  const span = document.querySelector('#works-title span')!;
  const text = span.textContent ?? '';
  span.innerHTML = `<b class="wt-first">${text[0]}</b>${text.slice(1)}`;
  const first = span.querySelector('.wt-first')!;
  gsap.fromTo(
    first,
    { opacity: 0.15 },
    {
      opacity: 1,
      duration: 0.5,
      ease: 'steps(4)',
      scrollTrigger: { trigger: '#works-title', start: 'top 80%' },
    },
  );
}

/** Manifesto echo layer drifts with scroll. */
export function initManifestoEcho(echo: HTMLElement) {
  gsap.fromTo(
    echo,
    { x: 0, y: 0 },
    {
      x: 60,
      y: 40,
      ease: 'none',
      scrollTrigger: { trigger: '#manifesto', start: 'top bottom', end: 'bottom top', scrub: true },
    },
  );
  gsap.to('#mani-title', {
    opacity: 0.25,
    scrollTrigger: { trigger: '#manifesto', start: 'bottom 45%', end: 'bottom 10%', scrub: true },
  });
}
