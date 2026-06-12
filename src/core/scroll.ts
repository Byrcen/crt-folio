import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export let lenis: Lenis;

export function initScroll() {
  lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => 1 - Math.pow(2, -10 * t),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) (window as unknown as { lenis: Lenis }).lenis = lenis;
  return lenis;
}

export { gsap, ScrollTrigger };
