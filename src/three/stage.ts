import * as THREE from 'three';
import gsap from 'gsap';
import { buildTv } from './tv';
import { buildProps } from './props';
import { ScreenFX } from './screen';

type Theme = 'day' | 'night';

const THEMES = {
  day: {
    wall: 0xa6a097, // warm light grey — less clinical than flat neutral
    shelfTop: 0xaaa498,
    shelfFront: 0x837c6f,
    ambient: 1.0, // a touch less fill so the key light can model the form
    key: 0.95,
    spot: 0.4, // a soft pool of light on the TV even by day
    halo: 0.4,
    window: 2.4, // warm gobo panes on the wall — the day drama
    glow: 0,
    dust: 0,
    props: { plastic: 0x2b2823, label: 0xd8cfba, pot: 0x8a5a3a, leaf: 0x4a6b45 },
  },
  night: {
    wall: 0x232323,
    shelfTop: 0x2a2a2a,
    shelfFront: 0x1c1c1c,
    ambient: 0.16,
    key: 0.12,
    spot: 1.7,
    halo: 0.85,
    window: 0,
    glow: 1.2, // screen light spilling onto the set
    dust: 0.32, // motes in the spot cone
    props: { plastic: 0x191919, label: 0x555048, pot: 0x4a3626, leaf: 0x2c3d2a },
  },
};

/** 2×2 bright panes on black — projected by the day window light as a gobo. */
function windowGobo(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#fff';
  for (const [x, y] of [[28, 28], [140, 28], [28, 140], [140, 140]] as const) c.fillRect(x, y, 88, 88);
  return new THREE.CanvasTexture(cv);
}

function haloTexture(): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,252,240,0.8)');
  g.addColorStop(0.4, 'rgba(255,252,240,0.25)');
  g.addColorStop(1, 'rgba(255,252,240,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
}

export class Stage {
  theme: Theme = 'day';
  readonly screenFX = new ScreenFX();

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private tv = buildTv(this.screenFX.texture);
  private props = buildProps();
  private wallMat: THREE.MeshStandardMaterial;
  private shelfTopMat: THREE.MeshStandardMaterial;
  private shelfFrontMat: THREE.MeshStandardMaterial;
  private ambient: THREE.AmbientLight;
  private key: THREE.DirectionalLight;
  private spot: THREE.SpotLight;
  private halo: THREE.Sprite;
  private windowLight!: THREE.SpotLight;
  private glow!: THREE.PointLight;
  private glowBase = { v: 0 };
  private dust!: THREE.Points;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2(99, 99);
  private mouse = { x: 0, y: 0 }; // -1..1 parallax
  private progress = 0; // raw scroll progress
  private eased = 0; // lerped camera progress
  private lastT = 0; // 上一帧时间戳：缓动按真实 dt，不同刷新率手感一致
  private lastPointerT = 0; // 最近一次鼠标移动，闲置判定用
  private themeUntil = 0; // 日夜材质过渡结束时刻，过渡中不降帧
  private paused = false;
  private onKnob?: () => void;
  private onScreen?: () => void;

  // camera path (z 8.3 ≈ 电视视觉宽度 +27%，五档截图对比后定档)
  private startPos = new THREE.Vector3(0, 0.16, 8.3);
  // 停靠位：荧幕近乎铺满画面、机壳仍在 —— 到这里就切台，镜头不再钻进屏幕内部
  private endPos = new THREE.Vector3(-0.13, 0.06, 1.9);
  private startLook = new THREE.Vector3(0, -0.05, 0);
  private endLook = new THREE.Vector3(-0.13, 0.06, 0.476);

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(this.dpr());
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', '一台复古电视立在桌上，屏幕上打着字');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.05, 40);
    this.camera.position.copy(this.startPos);

    // room
    this.wallMat = new THREE.MeshStandardMaterial({ color: THEMES.day.wall, roughness: 1 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), this.wallMat);
    wall.position.set(0, 0, -1.3);
    this.scene.add(wall);

    this.shelfTopMat = new THREE.MeshStandardMaterial({ color: THEMES.day.shelfTop, roughness: 0.9 });
    this.shelfFrontMat = new THREE.MeshStandardMaterial({ color: THEMES.day.shelfFront, roughness: 0.95 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 1.5), [
      this.shelfFrontMat, this.shelfFrontMat, this.shelfTopMat,
      this.shelfFrontMat, this.shelfFrontMat, this.shelfFrontMat,
    ]);
    shelf.position.set(0, -0.54 - 4, 0);
    shelf.receiveShadow = true;
    this.scene.add(shelf);

    // tv on the shelf
    this.tv.group.position.set(0, 0, 0);
    this.scene.add(this.tv.group);

    // shelf-top props flanking the set
    this.scene.add(this.props.group);

    // lights
    this.ambient = new THREE.AmbientLight(0xffffff, THEMES.day.ambient);
    this.scene.add(this.ambient);

    this.key = new THREE.DirectionalLight(0xffffff, THEMES.day.key);
    this.key.position.set(-2.5, 3.5, 3);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -2;
    this.key.shadow.camera.right = 2;
    this.key.shadow.camera.top = 2;
    this.key.shadow.camera.bottom = -2;
    this.key.shadow.radius = 6;
    this.scene.add(this.key);

    this.spot = new THREE.SpotLight(0xfff4e0, THEMES.day.spot, 8, Math.PI / 5, 0.55, 1.2);
    this.spot.position.set(0, 2.6, 0.7);
    this.spot.target = this.tv.group;
    this.scene.add(this.spot);

    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: haloTexture(), transparent: true, opacity: THEMES.day.halo, depthWrite: false }),
    );
    this.halo.position.set(0, 1.1, -1.2);
    this.halo.scale.set(4.5, 4.5, 1);
    this.scene.add(this.halo);

    // day window light: warm gobo panes raking across the wall & shelf
    this.windowLight = new THREE.SpotLight(0xffe6bd, THEMES.day.window, 24, Math.PI / 5.2, 0.32, 1.3);
    this.windowLight.position.set(-5.2, 3.4, 4.6);
    this.windowLight.target.position.set(1.1, -0.5, -1.3);
    this.windowLight.map = windowGobo();
    this.windowLight.castShadow = true;
    this.scene.add(this.windowLight, this.windowLight.target);

    // night screen glow spilling onto the set (flickers slightly in tick)
    this.glow = new THREE.PointLight(0x3fd8c0, 0, 2.6, 1.8);
    this.glow.position.set(-0.13, 0.1, 0.95);
    this.scene.add(this.glow);

    // dust motes drifting in the spot cone (night only; fewer on mobile)
    const dustCount = innerWidth < 768 ? 60 : 120;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() * 2 - 1) * 1.0;
      dustPos[i * 3 + 1] = -0.5 + Math.random() * 2.9;
      dustPos[i * 3 + 2] = -0.5 + Math.random() * 1.6;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ size: 0.016, color: 0xfff2d8, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.scene.add(this.dust);

    // fake reflection: inverted TV clone with faint no-depth materials, so it
    // paints over the (solid) shelf as a gloss. Materials are cloned — the
    // originals stay untouched; the screen texture is shared and stays live.
    const mirror = this.tv.group.clone(true);
    mirror.scale.y = -1;
    mirror.position.y = 2 * -0.54;
    // 电源线垂到柜面以下，镜像会翻到柜面以上画在墙上——剔除
    mirror.getObjectByName('cord')?.removeFromParent();
    mirror.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[];
        const cloned = mats.map((mat) => {
          const c = mat.clone();
          c.transparent = true;
          c.opacity = 0.14;
          c.depthTest = false;
          c.depthWrite = false;
          c.side = THREE.DoubleSide; // scale.y = -1 flips winding
          return c;
        });
        m.material = Array.isArray(m.material) ? cloned : cloned[0];
        m.renderOrder = 2;
      }
    });
    this.scene.add(mirror);

    // events
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.pointerNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.lastPointerT = performance.now();
      this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
    });
    addEventListener('click', (e) => {
      if (this.paused) return;
      // 监听挂在 window 上：HUD / 覆盖层上的点击不该穿透到 3D 去 raycast
      const t = e.target as Element | null;
      if (t?.closest?.('#hud, #hero-overlay, #page-about')) return;
      const hit = this.raycast();
      if (hit === 'knob') this.onKnob?.();
      else if (hit === 'screen') {
        this.screenFX.egg();
        this.onScreen?.();
      }
    });

    // restore the visitor's last day/night choice (no transition on boot)
    try {
      const saved = localStorage.getItem('crt-theme');
      if (saved === 'day' || saved === 'night') this.setTheme(saved, false);
    } catch {
      /* private mode / storage disabled */
    }

    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  onKnobClick(fn: () => void) {
    this.onKnob = fn;
  }

  onScreenClick(fn: () => void) {
    this.onScreen = fn;
  }

  /** CRT power-on moment, fired right after the preloader lifts. */
  powerOnScreen() {
    this.screenFX.powerOn();
  }

  setProgress(p: number) {
    this.progress = p;
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  /** 推进镜头已基本停靠（缓动余量 < 4%），缝隙切台以此为准 */
  get docked() {
    return this.eased > 0.9;
  }

  /** world point → screen px, for DOM labels anchored to 3D */
  project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * innerWidth,
      y: (-p.y * 0.5 + 0.5) * innerHeight,
      visible: p.z < 1,
    };
  }

  toggleTheme(animate = true) {
    this.setTheme(this.theme === 'day' ? 'night' : 'day', animate);
  }

  setTheme(t: Theme, animate = true) {
    this.theme = t;
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('crt-theme', t);
    } catch {
      /* private mode / storage disabled */
    }
    const T = THEMES[t];
    const dur = animate ? 0.55 : 0;
    this.themeUntil = performance.now() + dur * 1000 + 300;
    const lerpColor = (mat: THREE.MeshStandardMaterial, hex: number, d: number, delay: number) => {
      const target = new THREE.Color(hex);
      gsap.to(mat.color, { r: target.r, g: target.g, b: target.b, duration: d, delay, ease: 'power2.inOut', overwrite: 'auto' });
    };
    // staggered surfaces: shelf front first, then top, wall last (as observed)
    lerpColor(this.shelfFrontMat, T.shelfFront, dur * 0.6, 0.05);
    lerpColor(this.shelfTopMat, T.shelfTop, dur * 0.8, 0.1);
    lerpColor(this.wallMat, T.wall, dur, 0.15);
    lerpColor(this.props.mats.plastic, T.props.plastic, dur, 0.08);
    lerpColor(this.props.mats.label, T.props.label, dur, 0.08);
    lerpColor(this.props.mats.pot, T.props.pot, dur, 0.12);
    lerpColor(this.props.mats.leaf, T.props.leaf, dur, 0.12);
    gsap.to(this.ambient, { intensity: T.ambient, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.key, { intensity: T.key, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.spot, { intensity: T.spot, duration: dur, delay: 0.1, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.halo.material, { opacity: T.halo, duration: dur, delay: 0.1, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.windowLight, { intensity: T.window, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.glowBase, { v: T.glow, duration: dur, delay: 0.1, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.dust.material as THREE.PointsMaterial, { opacity: T.dust, duration: dur, delay: 0.15, ease: 'power2.inOut', overwrite: 'auto' });
  }

  /** "切换 日 / 夜"标签的锚点：电视右侧、旋钮下方（原来在台面倒影区里，箭头指空） */
  get labelAnchor() {
    return new THREE.Vector3(0.78, -0.4, 0.5); // 再抬一点，避开台面上的遥控器
  }

  get knobWorld() {
    return new THREE.Vector3(0.42, -0.27, 0.47);
  }

  private raycast(): 'screen' | 'knob' | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects([this.tv.screen, this.tv.knob], false);
    if (!hits.length) {
      this.screenFX.setPointer(null);
      return null;
    }
    const first = hits[0];
    if (first.object.name === 'screen' && first.uv) {
      this.screenFX.setPointer(first.uv);
      return 'screen';
    }
    this.screenFX.setPointer(null);
    return first.object.name as 'knob';
  }

  private resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    // 跨显示器拖窗后 devicePixelRatio 会变：不跟就永远糊着（或过采样）
    const dpr = this.dpr();
    if (dpr !== this.renderer.getPixelRatio()) this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight);
  }

  /** 像素比分档：桌面上限 1.5，低配 1.25，手机 1 —— 首屏停留期间不为闲置帧多付一倍像素 */
  private dpr() {
    if (innerWidth < 768) return Math.min(devicePixelRatio, 1);
    const nav = navigator as Navigator & { deviceMemory?: number };
    const low = (navigator.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    return Math.min(devicePixelRatio, low ? 1.25 : 1.5);
  }

  private tick(t: number) {
    if (this.paused) {
      this.lastT = 0;
      return;
    }
    const dtRaw = this.lastT ? Math.min(t - this.lastT, 50) : 16.7;
    // 闲置（镜头到位、鼠标静止、没在换日夜）时降到约 30fps：屏幕纹理本来就是 30fps 刷新
    const shapedNow = Math.pow(this.progress, 1.9);
    const idle = Math.abs(shapedNow - this.eased) < 0.0005 && t - this.lastPointerT > 250 && t > this.themeUntil;
    if (idle && this.lastT && dtRaw < 30) return;
    const dt = dtRaw;
    this.lastT = t;
    const frames = dt / 16.7; // 相对 60Hz 的帧数，给旧的按帧常量换算
    this.screenFX.setProgress(this.progress);
    this.screenFX.update(t);

    // night: screen glow breathes; dust drifts down through the spot cone
    const g = this.glowBase.v;
    this.glow.intensity = this.reduced ? g : g * (0.93 + 0.07 * Math.sin(t * 0.0113) * Math.sin(t * 0.0047));
    const dustMat = this.dust.material as THREE.PointsMaterial;
    if (!this.reduced && dustMat.opacity > 0.01) {
      const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 0.0005 * frames;
        if (y < -0.5) y = 2.4;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // dolly: accelerate toward the screen, smoothed
    const shaped = Math.pow(this.progress, 1.9);
    this.eased += (shaped - this.eased) * (1 - Math.exp(-dt / 140)); // τ≈140ms：停靠等待更短
    const e = this.eased;
    this.camera.position.lerpVectors(this.startPos, this.endPos, e);

    // mouse parallax fades out while diving in
    const par = (1 - e) * 0.12;
    this.camera.position.x += this.mouse.x * par;
    this.camera.position.y += -this.mouse.y * par * 0.5;

    const look = new THREE.Vector3().lerpVectors(this.startLook, this.endLook, e);
    this.camera.lookAt(look);

    this.raycast();
    this.renderer.render(this.scene, this.camera);
  }
}
