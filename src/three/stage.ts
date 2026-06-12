import * as THREE from 'three';
import gsap from 'gsap';
import { buildTv } from './tv';
import { ScreenFX } from './screen';

type Theme = 'day' | 'night';

const THEMES = {
  day: {
    wall: 0x9a9a9a,
    shelfTop: 0xa2a2a2,
    shelfFront: 0x7e7e7e,
    ambient: 1.15,
    key: 0.85,
    spot: 0.25,
    halo: 0.35,
  },
  night: {
    wall: 0x232323,
    shelfTop: 0x2a2a2a,
    shelfFront: 0x1c1c1c,
    ambient: 0.16,
    key: 0.12,
    spot: 1.7,
    halo: 0.85,
  },
};

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
  private wallMat: THREE.MeshStandardMaterial;
  private shelfTopMat: THREE.MeshStandardMaterial;
  private shelfFrontMat: THREE.MeshStandardMaterial;
  private ambient: THREE.AmbientLight;
  private key: THREE.DirectionalLight;
  private spot: THREE.SpotLight;
  private halo: THREE.Sprite;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2(99, 99);
  private mouse = { x: 0, y: 0 }; // -1..1 parallax
  private progress = 0; // raw scroll progress
  private eased = 0; // lerped camera progress
  private paused = false;
  private onKnob?: () => void;

  // camera path
  private startPos = new THREE.Vector3(0, 0.18, 10.5);
  private endPos = new THREE.Vector3(-0.13, 0.06, 1.05);
  private startLook = new THREE.Vector3(0, -0.05, 0);
  private endLook = new THREE.Vector3(-0.13, 0.06, 0.476);

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2));
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

    // events
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.pointerNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
    });
    addEventListener('click', () => {
      if (this.paused) return;
      const hit = this.raycast();
      if (hit === 'knob') this.onKnob?.();
    });

    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  onKnobClick(fn: () => void) {
    this.onKnob = fn;
  }

  setProgress(p: number) {
    this.progress = p;
  }

  setPaused(p: boolean) {
    this.paused = p;
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
    const T = THEMES[t];
    const dur = animate ? 0.55 : 0;
    const lerpColor = (mat: THREE.MeshStandardMaterial, hex: number, d: number, delay: number) => {
      const target = new THREE.Color(hex);
      gsap.to(mat.color, { r: target.r, g: target.g, b: target.b, duration: d, delay, ease: 'power2.inOut', overwrite: 'auto' });
    };
    // staggered surfaces: shelf front first, then top, wall last (as observed)
    lerpColor(this.shelfFrontMat, T.shelfFront, dur * 0.6, 0.05);
    lerpColor(this.shelfTopMat, T.shelfTop, dur * 0.8, 0.1);
    lerpColor(this.wallMat, T.wall, dur, 0.15);
    gsap.to(this.ambient, { intensity: T.ambient, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.key, { intensity: T.key, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.spot, { intensity: T.spot, duration: dur, delay: 0.1, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.halo.material, { opacity: T.halo, duration: dur, delay: 0.1, ease: 'power2.inOut', overwrite: 'auto' });
  }

  /** anchor point for the "Switch Day 'N' Night" label (below the shelf, under the TV) */
  get labelAnchor() {
    return new THREE.Vector3(-0.28, -0.78, 0.76);
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
    this.renderer.setSize(innerWidth, innerHeight);
  }

  private tick(t: number) {
    if (this.paused) return;
    this.screenFX.update(t);

    // dolly: accelerate toward the screen, smoothed
    const shaped = Math.pow(this.progress, 1.9);
    this.eased += (shaped - this.eased) * 0.09;
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
