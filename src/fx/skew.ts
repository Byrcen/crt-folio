import { gsap } from '../core/scroll';

/**
 * Horizontal scroll gallery: the #works section pins, vertical scroll pans the
 * #gallery track sideways. The poster nearest viewport-center straightens,
 * scales up and brightens; posters to the sides tilt away, shrink and dim.
 * Falls back to a static vertical stack on mobile / reduced-motion.
 */
export function initGalleryPan() {
  const track = document.getElementById('gallery');
  const pin = document.getElementById('gallery-pin');
  const counter = document.getElementById('works-counter');
  if (!track || !pin) return;

  const posters = gsap.utils.toArray<HTMLElement>('.poster');
  const caps = gsap.utils.toArray<HTMLElement>('.work .cap');
  const total = posters.length;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (reduced || isMobile) return; // CSS handles the stacked layout

  const panDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  // focus shaping: how each poster reacts to its distance from screen-center
  const focus = () => {
    const vc = window.innerWidth / 2;
    let nearest = 0;
    let nearestD = Infinity;
    posters.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const pc = r.left + r.width / 2;
      const k = gsap.utils.clamp(-1, 1, ((pc - vc) / window.innerWidth) * 1.7);
      const a = Math.abs(k);
      gsap.set(p, {
        rotateY: -k * 26,
        scale: 1 - a * 0.16,
        filter: `brightness(${(1 - a * 0.5).toFixed(3)})`,
        transformPerspective: 1100,
        transformOrigin: 'center center',
        z: -a * 120,
      });
      if (caps[i]) gsap.set(caps[i], { opacity: 1 - a * 0.75 });
      if (a < nearestD) {
        nearestD = a;
        nearest = i;
      }
    });
    if (counter) {
      counter.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
  };

  gsap.to(track, {
    x: () => -panDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => '+=' + panDistance(),
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onRefresh: focus,
      onUpdate: focus,
    },
  });
  focus();
}
