// Mid-century furniture built from primitives. Every piece: origin at floor centre, front faces +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geoCache = new Map();
function rbox(w, h, d, r) {
  const k = [w, h, d, r].map(v => v.toFixed(3)).join();
  if (!geoCache.has(k)) geoCache.set(k, r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999) : new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
export function box(g, w, h, d, mat, x, y, z, r = 0) {
  const m = new THREE.Mesh(rbox(w, h, d, r), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
export function cyl(g, rt, rb, h, mat, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
export function sph(g, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
// Tapered, splayed leg: top at y=h, foot leaning outward by (sx, sz).
function leg(g, mat, x, z, h, sx = 0, sz = 0, rt = 0.022, rb = 0.011) {
  const m = cyl(g, rt, rb, h, mat, x + sx / 2, h / 2, z + sz / 2, 10);
  m.rotation.z = -Math.atan2(sx, h); m.rotation.x = Math.atan2(sz, h);
  return m;
}
function fourLegs(g, mat, w, d, h, inset = 0.06, splay = 0.04) {
  for (const [ix, iz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) leg(g, mat, ix * (w / 2 - inset), iz * (d / 2 - inset), h, ix * splay, iz * splay);
}
const grp = () => new THREE.Group();

export function sofa(M, len = 2.3) {
  const g = grp(), d = 0.9;
  fourLegs(g, M.wood, len - 0.1, d - 0.1, 0.16, 0.08, 0.03);
  box(g, len, 0.12, d, M.wood, 0, 0.21, 0, 0.02);                          // walnut plinth
  const n = len > 2 ? 3 : 2, cw = (len - 0.24) / n;
  for (let i = 0; i < n; i++) {
    box(g, cw - 0.02, 0.16, d - 0.2, M.sofa, -len / 2 + 0.12 + cw * (i + 0.5), 0.35, 0.07, 0.06);   // seat cushions
    const b = box(g, cw - 0.02, 0.42, 0.2, M.sofa, -len / 2 + 0.12 + cw * (i + 0.5), 0.6, -d / 2 + 0.17, 0.08); b.rotation.x = -0.12;
  }
  box(g, 0.12, 0.3, d, M.sofa, -len / 2 + 0.06, 0.42, 0, 0.05);
  box(g, 0.12, 0.3, d, M.sofa, len / 2 - 0.06, 0.42, 0, 0.05);
  const p1 = box(g, 0.42, 0.4, 0.13, M.cushionC, -len / 2 + 0.38, 0.6, -0.16, 0.06); p1.rotation.set(-0.2, 0.25, 0.05);
  const p2 = box(g, 0.4, 0.38, 0.13, M.cushionB, len / 2 - 0.4, 0.6, -0.16, 0.06); p2.rotation.set(-0.2, -0.2, -0.05);
  const p3 = box(g, 0.36, 0.34, 0.12, M.cushionA, len / 2 - 0.68, 0.58, -0.2, 0.06); p3.rotation.set(-0.25, 0.1, 0);
  return g;
}

export function loungeChair(M) {
  const g = grp();
  // walnut shell + cognac leather, on a low star base
  cyl(g, 0.03, 0.03, 0.22, M.black, 0, 0.11, 0, 10);
  for (let i = 0; i < 4; i++) { const a = box(g, 0.34, 0.025, 0.05, M.black, 0, 0.03, 0); a.rotation.y = i * Math.PI / 2 + 0.4; a.position.set(Math.cos(i * Math.PI / 2 + 0.4) * 0.15, 0.03, -Math.sin(i * Math.PI / 2 + 0.4) * 0.15); }
  const seat = box(g, 0.74, 0.08, 0.7, M.wood, 0, 0.28, 0.02, 0.04); seat.rotation.x = -0.08;
  box(g, 0.68, 0.12, 0.62, M.leather, 0, 0.36, 0.04, 0.05).rotation.x = -0.08;
  const back = box(g, 0.74, 0.62, 0.07, M.wood, 0, 0.66, -0.34, 0.04); back.rotation.x = -0.32;
  box(g, 0.66, 0.56, 0.1, M.leather, 0, 0.68, -0.29, 0.05).rotation.x = -0.32;
  for (const s of [-1, 1]) box(g, 0.06, 0.05, 0.56, M.wood, s * 0.37, 0.52, -0.02, 0.02);
  return g;
}

export function armChair(M) {          // teak frame, cane back, cushion — the classic Danish lounge chair
  const g = grp();
  for (const s of [-1, 1]) {
    leg(g, M.wood, s * 0.3, 0.27, 0.62, s * 0.02, 0.03, 0.022, 0.014);
    leg(g, M.wood, s * 0.3, -0.27, 0.7, s * 0.02, -0.06, 0.022, 0.014);
    box(g, 0.06, 0.04, 0.72, M.wood, s * 0.31, 0.6, 0.0, 0.015);
  }
  box(g, 0.6, 0.04, 0.55, M.wood, 0, 0.36, 0.0, 0.01);
  box(g, 0.58, 0.12, 0.56, M.cushionA, 0, 0.44, 0.03, 0.05);
  const b = box(g, 0.56, 0.48, 0.04, M.cane, 0, 0.72, -0.3, 0.01); b.rotation.x = -0.22;
  const bc = box(g, 0.52, 0.42, 0.1, M.cushionA, 0, 0.73, -0.24, 0.05); bc.rotation.x = -0.22;
  return g;
}

export function coffeeTable(M) {
  const g = grp();
  cyl(g, 0.5, 0.5, 0.04, M.wood, 0, 0.38, 0, 48);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; leg(g, M.wood, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.37, Math.cos(a) * 0.05, Math.sin(a) * 0.05); }
  cyl(g, 0.3, 0.3, 0.03, M.woodLight, 0.55, 0.26, 0.25, 40);                 // nesting side table
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + 0.5; leg(g, M.woodLight, 0.55 + Math.cos(a) * 0.2, 0.25 + Math.sin(a) * 0.2, 0.25, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.016, 0.01); }
  box(g, 0.26, 0.04, 0.2, M.book, -0.1, 0.42, 0.05, 0.005);
  box(g, 0.22, 0.03, 0.17, M.accent, -0.1, 0.455, 0.05, 0.005);
  cyl(g, 0.05, 0.07, 0.16, M.ceramic, 0.18, 0.48, -0.12, 20);
  return g;
}

export function credenza(M, len = 2.0, tv = true) {
  const g = grp(), h = 0.5, d = 0.45;
  fourLegs(g, M.wood, len, d, 0.18, 0.1, 0.03);
  box(g, len, h, d, M.wood, 0, 0.18 + h / 2, 0, 0.015);
  const n = 4;
  for (let i = 0; i < n; i++) box(g, len / n - 0.04, h - 0.08, 0.01, i % 3 === 0 ? M.wood : M.cane, -len / 2 + (i + 0.5) * len / n, 0.18 + h / 2, d / 2 + 0.002);
  if (tv) {
    box(g, 1.45, 0.82, 0.04, M.screen, 0, 1.3, -0.12, 0.01);
    box(g, 0.04, 0.3, 0.04, M.black, 0, 0.82, -0.12);
  }
  cyl(g, 0.08, 0.1, 0.3, M.terracotta, len / 2 - 0.25, 0.83, 0, 20);
  sph(g, 0.16, M.plant, len / 2 - 0.25, 1.08, 0, 1, 1.2, 1);
  box(g, 0.3, 0.06, 0.22, M.book, -len / 2 + 0.3, 0.71, 0, 0.005);
  return g;
}

export function floorLamp(M) {
  const g = grp();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; leg(g, M.wood, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 1.25, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.015, 0.01); }
  const shade = cyl(g, 0.17, 0.22, 0.32, M.lampShade, 0, 1.38, 0, 32); shade.castShadow = false;
  sph(g, 0.05, M.bulb, 0, 1.33, 0);
  return g;
}

export function pendant(M, drop = 0.9, r = 0.2, globe = true) {
  const g = grp();
  cyl(g, 0.004, 0.004, drop, M.black, 0, -drop / 2, 0, 6).castShadow = false;
  if (globe) { const s = sph(g, r, M.lampShade, 0, -drop - r * 0.8, 0); s.castShadow = false; }
  else {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.metal);
    dome.position.y = -drop; dome.material.side = THREE.DoubleSide; g.add(dome);
  }
  sph(g, 0.06, M.bulb, 0, -drop - (globe ? r * 0.8 : 0.05), 0).castShadow = false;
  return g;
}

export function rug(M, w, d) {
  const g = grp();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), M.rug); m.position.y = 0.006; m.receiveShadow = true; g.add(m);
  return g;
}

export function plant(M, h = 1.4) {
  const g = grp();
  cyl(g, 0.17, 0.13, 0.36, M.terracotta, 0, 0.18, 0, 24);
  cyl(g, 0.012, 0.016, h * 0.7, M.wood, 0, 0.36 + h * 0.35, 0, 6);
  const leaves = [[0.15, 0.9, 0.05, 0.4], [-0.14, 1.05, 0.08, -0.6], [0.05, 1.25, -0.12, 0.9], [-0.06, 0.75, -0.1, 2.1], [0.12, 1.15, 0.12, -1.5], [-0.12, 1.35, 0.02, 0.2], [0.02, 1.45, 0.06, 1.3]];
  for (const [x, y, z, r] of leaves) {
    const l = sph(g, 0.16, leaves.indexOf(leaves.find(q => q[3] === r)) % 2 ? M.plantDark : M.plant, x, y * h / 1.4, z, 1, 0.22, 0.6);
    l.rotation.set(0.6, r, 0.3);
  }
  return g;
}

export function diningSet(M) {
  const g = grp();
  // oval walnut table 1.7 x 0.9
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 48), M.wood);
  top.scale.set(1.7, 1, 0.9); top.position.y = 0.74; top.castShadow = top.receiveShadow = true; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(g, M.wood, sx * 0.6, sz * 0.24, 0.73, sx * 0.04, sz * 0.03, 0.025, 0.014);
  for (const [x, z, r] of [[-0.42, 0.62, Math.PI], [0.42, 0.62, Math.PI], [-0.42, -0.62, 0], [0.42, -0.62, 0]]) {
    const c = chair(M); c.position.set(x, 0, z); c.rotation.y = r; g.add(c);
  }
  cyl(g, 0.06, 0.08, 0.22, M.ceramic, 0.15, 0.87, 0, 20);
  for (let i = 0; i < 3; i++) { const b = cyl(g, 0.004, 0.004, 0.45, M.wood, 0.15 + (i - 1) * 0.03, 1.1, 0, 4); b.rotation.z = (i - 1) * 0.25; }
  cyl(g, 0.12, 0.08, 0.06, M.black, -0.35, 0.79, 0.05, 24);
  return g;
}

export function chair(M) {        // wishbone-style: cane seat, curved teak back rail
  const g = grp();
  for (const [x, z] of [[-0.21, -0.19], [0.21, -0.19], [-0.21, 0.19], [0.21, 0.19]]) leg(g, M.wood, x, z, z < 0 ? 0.44 : 0.44, x * 0.08, z * 0.08, 0.017, 0.012);
  box(g, 0.46, 0.035, 0.42, M.cane, 0, 0.45, 0, 0.01);
  for (const s of [-1, 1]) leg(g, M.wood, s * 0.2, -0.2, 0.78, 0, -0.03, 0.014, 0.014).position.y = 0.39;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 8, 24, Math.PI), M.wood);
  rail.rotation.x = Math.PI / 2; rail.position.set(0, 0.76, 0.0); rail.scale.set(0.85, 0.85, 1); rail.rotation.z = Math.PI;
  rail.castShadow = true; g.add(rail);
  return g;
}

export function bed(M, w = 1.8, l = 2.1, throwMat) {
  const g = grp();
  fourLegs(g, M.wood, w + 0.06, l + 0.06, 0.12, 0.1, 0.02);
  box(g, w + 0.1, 0.16, l + 0.1, M.wood, 0, 0.2, 0, 0.02);
  box(g, w, 0.22, l, M.bedding, 0, 0.38, 0.02, 0.06);                                // mattress + duvet
  box(g, w + 0.04, 0.06, l * 0.42, throwMat || M.throw, 0, 0.5, l * 0.24, 0.03);     // throw over the foot
  box(g, w + 0.16, 0.95, 0.08, M.wood, 0, 0.6, -l / 2 - 0.06, 0.02);                  // headboard
  box(g, w - 0.1, 0.55, 0.02, M.cane, 0, 0.72, -l / 2 - 0.015, 0.005);
  const pc = [M.bedding, M.bedding, M.cushionC];
  for (let i = 0; i < 2; i++) { const p = box(g, w / 2 - 0.14, 0.16, 0.42, pc[i], (i - 0.5) * (w / 2), 0.58, -l / 2 + 0.3, 0.07); p.rotation.x = -0.35; }
  const acc = box(g, 0.45, 0.3, 0.12, M.cushionC, 0, 0.62, -l / 2 + 0.52, 0.05); acc.rotation.x = -0.3;
  return g;
}

export function nightstand(M, lamp = true) {
  const g = grp();
  fourLegs(g, M.wood, 0.46, 0.38, 0.18, 0.05, 0.02);
  box(g, 0.48, 0.32, 0.4, M.wood, 0, 0.34, 0, 0.015);
  box(g, 0.42, 0.12, 0.01, M.cane, 0, 0.36, 0.2, 0.003);
  if (lamp) {               // mushroom lamp
    cyl(g, 0.03, 0.06, 0.28, M.lampShade, 0, 0.64, 0, 20).castShadow = false;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lampShade);
    dome.position.y = 0.76; g.add(dome);
    sph(g, 0.04, M.bulb, 0, 0.74, 0).castShadow = false;
  }
  return g;
}

export function wardrobe(M, w, h = 2.3, d = 0.6) {
  const g = grp();
  box(g, w, h, d, M.wood, 0, h / 2, 0, 0.01);
  const n = Math.max(2, Math.round(w / 0.5));
  for (let i = 1; i < n; i++) box(g, 0.008, h - 0.1, 0.01, M.black, -w / 2 + i * w / n, h / 2, d / 2 + 0.003);
  for (let i = 0; i < n; i++) box(g, 0.012, 0.3, 0.025, M.metal, -w / 2 + (i + (i % 2 ? 0.12 : 0.88)) * w / n, h * 0.5, d / 2 + 0.015);
  return g;
}

export function desk(M, w = 1.3) {
  const g = grp();
  fourLegs(g, M.wood, w, 0.6, 0.72, 0.06, 0.03);
  box(g, w, 0.035, 0.62, M.wood, 0, 0.74, 0, 0.01);
  box(g, 0.45, 0.14, 0.5, M.wood, w / 2 - 0.28, 0.65, 0, 0.01);
  const lamp = grp(); cyl(lamp, 0.07, 0.08, 0.02, M.metal, 0, 0.01, 0); const arm = cyl(lamp, 0.008, 0.008, 0.42, M.metal, 0.06, 0.2, 0); arm.rotation.z = -0.3;
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 24, 1, true), M.accent); sh.position.set(0.14, 0.4, 0); sh.rotation.z = 2.3; sh.material.side = THREE.DoubleSide; lamp.add(sh);
  lamp.position.set(-w / 2 + 0.15, 0.755, -0.15); g.add(lamp);
  box(g, 0.34, 0.24, 0.02, M.black, 0, 0.88, -0.2, 0.005).rotation.x = -0.2;
  const c = armChairSimple(M); c.position.set(0, 0, 0.55); c.rotation.y = Math.PI; g.add(c);
  return g;
}
function armChairSimple(M) {
  const g = grp();
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) leg(g, M.wood, x, z, 0.44, x * 0.06, z * 0.06, 0.016, 0.011);
  box(g, 0.46, 0.06, 0.44, M.leather, 0, 0.46, 0, 0.02);
  const b = box(g, 0.44, 0.24, 0.03, M.wood, 0, 0.72, -0.22, 0.01); b.rotation.x = -0.15;
  return g;
}

export function kitchenRun(M, len, uppers = true, d = 0.6) {
  const g = grp();
  box(g, len, 0.1, d - 0.05, M.black, 0, 0.05, -0.02);
  box(g, len, 0.78, d, M.wood, 0, 0.49, 0, 0.005);
  const n = Math.round(len / 0.6);
  for (let i = 1; i < n; i++) box(g, 0.006, 0.74, 0.01, M.black, -len / 2 + i * len / n, 0.49, d / 2 + 0.003);
  box(g, len + 0.02, 0.04, d + 0.03, M.counter, 0, 0.9, 0.01, 0.005);
  if (uppers) {
    box(g, len, 0.7, 0.35, M.cabinet, 0, 1.85, -d / 2 + 0.175, 0.005);
    for (let i = 1; i < n; i++) box(g, 0.006, 0.66, 0.01, M.black, -len / 2 + i * len / n, 1.85, -d / 2 + 0.355);
  }
  return g;
}
export function hob(M) { const g = grp(); box(g, 0.7, 0.01, 0.48, M.black, 0, 0.925, 0, 0.004); for (const [x, z] of [[-0.17, 0], [0.17, 0]]) cyl(g, 0.09, 0.09, 0.012, M.steel, x, 0.93, z, 24); return g; }
export function sink(M) { const g = grp(); box(g, 0.7, 0.012, 0.44, M.steel, 0, 0.925, 0, 0.004); box(g, 0.6, 0.01, 0.36, M.black, 0, 0.93, 0, 0.004); const f = cyl(g, 0.012, 0.012, 0.3, M.steel, 0, 1.07, -0.2, 8); return g; }
export function fridge(M) { const g = grp(); box(g, 0.75, 1.85, 0.68, M.cabinet, 0, 0.925, 0, 0.03); box(g, 0.02, 0.5, 0.03, M.metal, -0.3, 1.2, 0.35); return g; }

export function toilet(M) {
  const g = grp();
  box(g, 0.38, 0.38, 0.5, M.ceramic, 0, 0.19, 0.05, 0.1);
  box(g, 0.4, 0.04, 0.5, M.ceramic, 0, 0.4, 0.06, 0.06);
  box(g, 0.42, 0.42, 0.18, M.ceramic, 0, 0.6, -0.22, 0.04);
  return g;
}
export function vanity(M, w = 0.9) {
  const g = grp();
  box(g, w, 0.45, 0.48, M.wood, 0, 0.62, 0, 0.01);
  box(g, w + 0.02, 0.04, 0.5, M.counter, 0, 0.86, 0, 0.005);
  const b = cyl(g, 0.2, 0.17, 0.12, M.ceramic, 0, 0.94, 0.02, 32);
  box(g, w * 0.8, 0.7, 0.02, M.glass, 0, 1.55, -0.24, 0.01).material = M.steel;
  return g;
}
export function shower(M, w = 0.9, d = 0.9) {
  const g = grp();
  box(g, w, 0.04, d, M.counter, 0, 0.02, 0);
  box(g, w, 2.0, 0.012, M.glass, 0, 1.02, d / 2);
  cyl(g, 0.012, 0.012, 1.1, M.steel, -w / 2 + 0.1, 1.3, -d / 2 + 0.05, 8);
  cyl(g, 0.12, 0.12, 0.02, M.steel, -w / 2 + 0.25, 2.0, -d / 2 + 0.2, 20);
  return g;
}
export function washer(M) { const g = grp(); box(g, 0.6, 0.85, 0.6, M.ceramic, 0, 0.425, 0, 0.03); cyl(g, 0.2, 0.2, 0.02, M.black, 0, 0.45, 0.3, 32).rotation.x = Math.PI / 2; return g; }
export function shoeCabinet(M, w = 1.1) { const g = grp(); box(g, w, 1.0, 0.36, M.wood, 0, 0.6, 0, 0.01); for (let i = 1; i < 3; i++) box(g, 0.006, 0.96, 0.01, M.black, -w / 2 + i * w / 3, 0.6, 0.183); box(g, 0.5, 0.7, 0.02, M.steel, 0, 1.6, -0.17, 0.01); return g; }
export function shelves(M, w = 1.0, h = 2.2) {
  const g = grp(); box(g, w, h, 0.5, M.woodLight, 0, h / 2, 0, 0.005);
  for (let i = 1; i < 5; i++) box(g, w - 0.04, 0.02, 0.46, M.wood, 0, i * h / 5, 0.03);
  for (let i = 0; i < 5; i++) box(g, w * 0.5, 0.18, 0.3, [M.cushionA, M.bedding, M.cushionB][i % 3], (i % 2 - 0.5) * 0.3, i * h / 5 + 0.12, 0.05, 0.03);
  return g;
}
export function art(M, i, w = 0.6, h = 0.8) {
  const g = grp(); box(g, w + 0.04, h + 0.04, 0.03, M.wood, 0, 0, 0, 0.005);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.art[i % M.art.length]); p.position.z = 0.017; g.add(p);
  return g;
}
export function bench(M, w = 1.2) { const g = grp(); fourLegs(g, M.wood, w, 0.4, 0.4, 0.06, 0.02); box(g, w, 0.05, 0.4, M.wood, 0, 0.42, 0, 0.01); box(g, w - 0.1, 0.06, 0.36, M.cushionB, 0, 0.47, 0, 0.03); return g; }
export function balconyChair(M) { const g = armChair(M); return g; }
