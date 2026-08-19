import * as THREE from 'three';

/**
 * Shelf-top props: a stack of VHS tapes, a remote, a small potted plant.
 * Low-poly, procedural, no assets; material colors are lerped by the stage
 * on day/night theme changes.
 */
export interface Props {
  group: THREE.Group;
  mats: {
    plastic: THREE.MeshStandardMaterial;
    label: THREE.MeshStandardMaterial;
    pot: THREE.MeshStandardMaterial;
    leaf: THREE.MeshStandardMaterial;
  };
}

const SHELF_Y = -0.54;

export function buildProps(): Props {
  const group = new THREE.Group();
  const mats = {
    plastic: new THREE.MeshStandardMaterial({ color: 0x2b2823, roughness: 0.8 }),
    label: new THREE.MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.9 }),
    pot: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4a6b45, roughness: 0.85 }),
  };

  // VHS stack (left of the set), slightly staggered rotations
  const tapes = [
    { x: -1.05, y: SHELF_Y + 0.04, r: 0.06 },
    { x: -1.02, y: SHELF_Y + 0.12, r: -0.09 },
    { x: -1.07, y: SHELF_Y + 0.2, r: 0.03 },
  ];
  for (const t of tapes) {
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.24), mats.plastic);
    tape.position.set(t.x, t.y, 0.05);
    tape.rotation.y = t.r;
    tape.castShadow = true;
    group.add(tape);
    // spine label facing the viewer
    const label = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.005), mats.label);
    label.position.set(t.x, t.y, 0.05 + 0.123);
    label.rotation.y = t.r;
    group.add(label);
  }

  // remote (front right, angled)
  const remote = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.028, 0.26), mats.plastic);
  remote.position.set(0.95, SHELF_Y + 0.014, 0.28);
  remote.rotation.y = 0.5;
  remote.castShadow = true;
  group.add(remote);
  for (let i = 0; i < 6; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), mats.label);
    btn.position.set(0.95 + ((i % 2) - 0.5) * 0.04, SHELF_Y + 0.032, 0.22 + Math.floor(i / 2) * 0.05);
    group.add(btn);
  }

  // potted plant (far right)
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 10), mats.pot);
  pot.position.set(1.45, SHELF_Y + 0.07, -0.1);
  pot.castShadow = true;
  group.add(pot);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07 - i * 0.015, 0.22, 7), mats.leaf);
    leaf.position.set(1.45 + (i - 1) * 0.05, SHELF_Y + 0.24 + i * 0.05, -0.1 + (i % 2) * 0.04);
    leaf.rotation.z = (i - 1) * 0.28;
    group.add(leaf);
  }

  return { group, mats };
}
