/** All site copy in one place (eases a future EN toggle). */
export const COPY = {
  stem: '站在 AI 与产品的交汇点，深耕',
  words: ['产品策略', '用户研究', '落地交付'],

  aboutStem: '站在 AI 与产品的交汇点，深耕',

  manifesto: ['把 AI 的想法', '变成交付的产品'],
  manifestoEcho: '成交付的产',

  cli: {
    prompt: 'cry@folio ~ %',
    cmdSlash: '/',
    cmdName: 'cry',
    output: ['> 正在加载 cry 的作品集 …', '> 校准信号 … OK', '> 启动 CRT … OK'],
  },

  screen: {
    stem: '站在 AI 与产品的交汇点 — ',
    highlight: '交汇点',
    words: ['策略', '调研', '交付'],
    logs: [
      '- 把用户痛点映射到模型能力',
      '- 先写评测，再做功能',
      '- 每周交付，持续学习',
    ],
    corners: ['cry — 01', 'AIPM', 'REC ●', 'CH 03'],
  },
};

export interface Project {
  theme: 'dungeon' | 'beads' | 'fire' | 'peaky';
  no: string;
  title: string; // 中文主标题（可含 <br>）
  en: string;
  top: string; // 海报顶部小标
  foot: string; // 海报底部小字
  cap: string; // 海报下方说明
  href: string;
  live: boolean; // true=在线体验，false=仅源码
}

/** 精选作品 — 渲染为四张主题化"海报"，由 src/gallery.ts 输出 */
export const PROJECTS: Project[] = [
  {
    theme: 'dungeon',
    no: '01',
    title: '暗日<br>地下城',
    en: 'DARK SUN DUNGEON',
    top: 'SECTOR 07 · 生存建造',
    foot: '单文件 · 5–10 MIN 通关',
    cap: '科幻生存建造 · 网页小游戏',
    href: 'https://dark-sun-dungeon.vercel.app',
    live: true,
  },
  {
    theme: 'beads',
    no: '02',
    title: '拼豆',
    en: 'PINBEADS',
    top: 'PIXEL · 拼豆图纸',
    foot: '上传图片 · 生成图纸',
    cap: '像素拼豆图纸工具',
    href: 'https://github.com/Byrcen/pinbeads',
    live: false,
  },
  {
    theme: 'fire',
    no: '03',
    title: '血与火',
    en: 'FIRE & BLOOD',
    top: 'HOUSE TARGARYEN',
    foot: '坦格利安 · 三百年',
    cap: '像素互动长卷 · 维斯特洛史',
    href: 'https://fire-and-blood.vercel.app',
    live: true,
  },
  {
    theme: 'peaky',
    no: '04',
    title: '浴血<br>黑帮',
    en: 'PEAKY BLINDERS',
    top: '卷宗 S01–S06',
    foot: '六季剧情 · 像素互动',
    cap: '剧情互动卷宗 · 中英双语',
    href: 'https://peaky-dossier.vercel.app',
    live: true,
  },
];
