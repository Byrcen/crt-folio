# crt-folio

cry 的个人作品集 —— 一个 AI 产品经理的求职站点。

复刻 [hle.io](https://hle.io)（The First The Last 出品，FWA / CSS Design Awards 双 SOTD）的动态与交互形式，内容替换为中文的 AIPM 个人品牌。

## 体验

- **CLI 开场**：黑屏终端里输入 `/cry` 回车，进入页面
- **复古 CRT 电视**：程序化建模的 3D 电视，屏幕是实时渲染的 canvas 终端
- **滚动换台**：向下滚驱动镜头推进电视屏幕，越过阈值触发 "NO SIGNAL" 雪花转场进入内容区
- **日 / 夜**：点电视旋钮切换全局 3D 光照主题
- **关于子页**：经换台转场进入，50/50 明暗分屏 + 滚动驱动的蓝图线稿绘制
- **合成音效**：右上角开关，全部用 WebAudio 实时合成，无音频文件

## 技术栈

Vite + TypeScript（无 UI 框架）· Three.js · GSAP + ScrollTrigger · Lenis

电视为程序化建模 + `CanvasTexture` 实时纹理（非 GLB / 视频）；音效为 WebAudio 合成；3D 场景懒加载，CLI 开场动画掩盖加载时间。

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

## 结构

```
src/
  main.ts            入口：编排 preloader → hero → 内容区 → 子页路由
  content.ts         全站文案（集中管理）
  about.ts           关于子页：蓝图线稿、能力高亮、入场动画
  core/    cursor · clock · scroll(Lenis+ScrollTrigger) · preloader · logo · sound
  three/   stage(场景/灯光/日夜) · tv(程序化电视) · screen(canvas纹理)
  fx/      typewriter · scramble · nosignal · snake · skew · reveal
  styles/  main.css
docs/superpowers/specs/   设计文档与逐帧交互规格
```

## 状态

首页与关于子页均已完成。精选作品收录四个真实项目（暗日地下城 / 拼豆 / 血与火 / 浴血黑帮），电脑端横向拖拽浏览、移动端竖向堆叠，整张海报可点击跳转 demo 或源码。

部分个人介绍文案仍为初稿，待替换。已部署于 Vercel：<https://crt-folio.vercel.app>。
