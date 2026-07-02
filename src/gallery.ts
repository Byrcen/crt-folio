import { PROJECTS, type Project } from './content';

/** Pixel heart for the 拼豆 poster (8×7, 1 = bead). */
const HEART = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];
const BEAD_COLORS = ['#e23b3b', '#f0a431', '#3fc7b0', '#3f8ad8', '#c060c0', '#e6d24a'];

function beadGrid(): string {
  let cells = '';
  let k = 0;
  for (const row of HEART) {
    for (const on of row) {
      if (on) {
        // stride 5 is coprime with the palette size, so all 6 colors cycle
        // (the old ×3 stride collapsed onto just two of them)
        const color = BEAD_COLORS[(k * 5 + 1) % BEAD_COLORS.length];
        cells += `<i style="background:${color}"></i>`;
        k++;
      } else {
        cells += `<i class="off"></i>`;
      }
    }
  }
  return `<div class="p-beadgrid">${cells}</div>`;
}

/** Theme-specific decorative middle layer. */
function decor(p: Project): string {
  switch (p.theme) {
    case 'dungeon':
      return `<div class="p-sun"></div>`;
    case 'beads':
      return beadGrid();
    case 'fire':
      return `<div class="p-emblem">🜂</div>`;
    case 'peaky':
      return `<div class="p-stamp">机密</div><div class="p-redact"><i></i><i></i></div>`;
  }
}

function posterHTML(p: Project): string {
  const viewLabel = p.live ? '在线体验 ↗' : '查看源码 ↗';
  const aria = `${p.title.replace(/<br>/g, '')} — ${p.cap}`;
  return `
    <figure class="work">
      <a class="poster p-${p.theme}" href="${p.href}" target="_blank" rel="noopener noreferrer" data-hover aria-label="${aria}">
        <div class="p-top mono-label">${p.top}</div>
        ${decor(p)}
        <div class="p-no mono-label">${p.no}</div>
        <div class="p-title-zh">${p.title}</div>
        <div class="p-en mono-label">${p.en}</div>
        <div class="p-foot mono-label">${p.foot}</div>
        <span class="p-view mono-label">${viewLabel}</span>
      </a>
      <figcaption class="cap mono-label">${p.cap}</figcaption>
      ${p.live ? `<a class="p-src mono-label" href="${p.repo}" target="_blank" rel="noopener noreferrer" data-hover>源码 ↗</a>` : ''}
    </figure>`;
}

/** Render the four project posters into #gallery. Call before velocity-skew init. */
export function renderGallery() {
  const el = document.getElementById('gallery');
  if (!el) return;
  el.innerHTML = PROJECTS.map(posterHTML).join('');
}
