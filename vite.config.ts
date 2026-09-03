import { defineConfig, type Plugin } from 'vite';

/** 3D 舞台是懒加载分块，但开场必须等它：在 HTML 里预加载，让它和主包并行下载 */
function preloadStageChunk(): Plugin {
  return {
    name: 'preload-stage-chunk',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return;
        return Object.values(bundle)
          .filter((c) => c.type === 'chunk' && c.name === 'stage')
          .map((c) => ({ tag: 'link', attrs: { rel: 'modulepreload', href: `/${c.fileName}` }, injectTo: 'head' as const }));
      },
    },
  };
}

export default defineConfig({ plugins: [preloadStageChunk()] });
