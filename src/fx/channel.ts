import { ScrollTrigger } from '../core/scroll';

/** 广播层：频道角标进区"跳台"闪现 + 右缘频段刻度尺随滚动点亮。 */
export function initBroadcastLayer() {
  document.querySelectorAll<HTMLElement>('#content .ch-badge').forEach((b) => {
    ScrollTrigger.create({
      trigger: b.parentElement,
      start: 'top 75%',
      onEnter: () => b.classList.add('on'),
    });
  });
  // 子页角标没有滚动语境（换台直达）——常亮即可
  document.querySelector('#page-about .ch-badge')?.classList.add('on');

  const ruler = document.getElementById('freq-ruler');
  if (!ruler) return;
  const N = 28;
  for (let i = 0; i < N; i++) ruler.appendChild(document.createElement('i'));
  const ticks = Array.from(ruler.children) as HTMLElement[];
  ScrollTrigger.create({
    trigger: '#content',
    start: 'top bottom',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const hot = Math.round(self.progress * (N - 1));
      ticks.forEach((t, i) => t.classList.toggle('hot', i === hot));
    },
  });
}
