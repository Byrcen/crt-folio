import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Procedural cream CRT TV. Returns the group plus named parts used for
 * raycasting (screen, knob) and theming.
 */
export interface Tv {
  group: THREE.Group;
  screen: THREE.Mesh;
  knob: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
}

export function buildTv(screenTexture: THREE.Texture): Tv {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e3d8, roughness: 0.55, metalness: 0.02 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x35322c, roughness: 0.5 });

  // body
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.92, 0.92, 4, 0.07), bodyMat);
  body.castShadow = true;
  group.add(body);

  // screen bezel (recessed dark rounded box on the upper-left 2/3 of the front)
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.68, 0.06, 3, 0.05), darkMat);
  bezel.position.set(-0.13, 0.06, 0.45);
  group.add(bezel);

  // curved glass screen: plane with a slight bulge
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  const planeGeo = new THREE.PlaneGeometry(0.7, 0.6, 24, 24);
  const pos = planeGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / 0.35;
    const y = pos.getY(i) / 0.3;
    pos.setZ(i, 0.045 * (1 - Math.min(1, x * x * 0.55 + y * y * 0.55)));
  }
  planeGeo.computeVertexNormals();
  const screen = new THREE.Mesh(planeGeo, screenMat);
  screen.position.set(-0.13, 0.06, 0.476);
  screen.name = 'screen';
  group.add(screen);

  // right-side control column: knob (day/night), indicator, switches
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24), accentMat);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.42, -0.27, 0.47);
  knob.name = 'knob';
  group.add(knob);

  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0x3fd8c0 }));
  dot.rotation.x = Math.PI / 2;
  dot.position.set(0.32, -0.27, 0.47);
  group.add(dot);

  for (let i = 0; i < 3; i++) {
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.07, 0.025), accentMat);
    lever.position.set(0.34 + i * 0.07, 0.32, 0.47);
    lever.rotation.z = -0.35;
    group.add(lever);
  }

  // grille: vertical slats lower-right of the front
  for (let i = 0; i < 7; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.02), darkMat);
    slat.position.set(0.3 + i * 0.032, 0.02, 0.465);
    group.add(slat);
  }

  // feet
  for (const fx of [-0.42, 0.42]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.5), darkMat);
    foot.position.set(fx, -0.485, 0);
    group.add(foot);
  }

  // power cord: hangs from back-left, drapes over the shelf edge
  const cordPts = [
    new THREE.Vector3(-0.45, -0.4, -0.3),
    new THREE.Vector3(-0.62, -0.52, 0.1),
    new THREE.Vector3(-0.7, -0.54, 0.42),
    new THREE.Vector3(-0.72, -0.9, 0.5),
    new THREE.Vector3(-0.74, -1.5, 0.48),
  ];
  const cord = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 32, 0.012, 6),
    darkMat,
  );
  group.add(cord);

  return { group, screen, knob, bodyMat };
}
