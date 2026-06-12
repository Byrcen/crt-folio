import { gsap, ScrollTrigger } from '../core/scroll';

/** Posters tilt with scroll velocity, then settle back to a random resting angle. */
export function initVelocitySkew(selector = '.poster') {
  const cards = gsap.utils.toArray<HTMLElement>(selector);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setters = cards.map((card, i) => {
    const base = (i % 2 === 0 ? 1 : -1) * (3 + Math.random() * 4); // resting ±3–7°
    gsap.set(card, { rotateZ: base, rotateY: (i - 1.5) * 6, transformPerspective: 900 });
    if (!reduced) {
      // idle float, slightly out of phase per card
      gsap.to(card, {
        y: '+=7',
        duration: 2.6 + i * 0.45,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.3,
      });
    }
    return {
      base,
      to: gsap.quickTo(card, 'rotateZ', { duration: 0.7, ease: 'power3.out' }),
    };
  });

  let settleTimer = 0;
  ScrollTrigger.create({
    trigger: '#gallery',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const v = gsap.utils.clamp(-9, 9, self.getVelocity() / 220);
      setters.forEach((s, i) => s.to(s.base + v * (1 + i * 0.12)));
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => setters.forEach((s) => s.to(s.base)), 120);
    },
  });
}
