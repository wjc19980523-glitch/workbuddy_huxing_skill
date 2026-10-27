// Shot 2 · scan: the floor plan printed on a sheet on a walnut desk, AR scan, deskew, rooms read and tagged.
import * as THREE from 'three';
import { clamp, ease, inv, lerp, keys, hand, spring } from './util.js';
import { section, tag, fmtArea } from './hud.js';
import { woodTexture } from './materials.js';
import * as Plan from './plan.js';

const PW = 2048, PH = 1448;
const SIZE = { w: 1.0, h: PH / PW };
const PK = 74, POX = 120, POZ = 470;
let scene, camera, paper, paperGeo, overlayTex, overlayCtx, base, furn = [], PARTS = [];

const pp = (x, z) => [POX + x * PK, POZ + z * PK];

function computeParts() {
  PARTS = Plan.WALLS.map(w => {
    const ax = w.a[0], az = w.a[1], bx = w.b[0], bz = w.b[1];
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len, dz = (bz - az) / len;
    const nx = -dz, nz = dx;
    const solids = [], opens = [];
    const t = w.t / 2;
    let cur = 0;
    for (const o of [...w.open].sort((a, b) => a.s - b.s)) {
      if (o.s > cur) solids.push([ax + dx * cur - nx * t, az + dz * cur - nz * t, (o.s - cur) * dx + 2 * nx * t, (o.s - cur) * dz + 2 * nz * t]);
      opens.push({ o, r: [ax + dx * o.s - nx * t, az + dz * o.s - nz * t, (o.e - o.s) * dx + 2 * nx * t, (o.e - o.s) * dz + 2 * nz * t], a: [ax + dx * o.s, az + dz * o.s], d: [dx, dz] });
      cur = o.e;
    }
    if (cur < len) solids.push([ax + dx * cur - nx * t, az + dz * cur - nz * t, (len - cur) * dx + 2 * nx * t, (len - cur) * dz + 2 * nz * t]);
    return { solids, opens };
  });
}

function paperCanvas() {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d');
  g.fillStyle = '#f3efe6'; g.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(120,100,70,${((i * 7919) % 97) / 97 * 0.035})`; g.fillRect((i * 104729) % PW, (i * 1299709) % PH, 2, 1); }

  g.fillStyle = '#9a948a'; g.font = '500 22px "DejaVu Sans Mono"'; g.fillText('户型图  ·  FLOOR PLAN  ·  1:100', 120, 120);
  g.fillStyle = '#211e1b'; g.font = '700 66px "Noto Sans CJK SC"'; g.fillText(Plan.TITLE, 120, 205);
  g.font = '400 32px "Noto Sans CJK SC"'; g.fillStyle = '#4a443e';
  g.fillText(`·  建筑面积约 ${Plan.GROSS}㎡  ·  套内约 ${Plan.TOTAL_AREA.toFixed(1)}㎡`, 120 + Plan.TITLE.length * 70 + 20, 200);
  g.fillStyle = '#cfc8bc'; g.fillRect(120, 236, 1808, 2);

  // compass
  g.strokeStyle = '#3a342e'; g.lineWidth = 2.5; g.beginPath(); g.arc(1850, 150, 44, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#211e1b'; g.beginPath(); g.moveTo(1850, 104); g.lineTo(1864, 166); g.lineTo(1850, 156); g.lineTo(1836, 166); g.fill();
  g.font = '700 24px "DejaVu Sans"'; g.fillText('N', 1842, 92); g.font = '400 22px "Noto Sans CJK SC"'; g.fillText('北', 1780, 158);

  // dimension chains
  g.strokeStyle = '#9d968b'; g.fillStyle = '#8a8378'; g.lineWidth = 1.4; g.font = '400 17px "DejaVu Sans Mono"'; g.textAlign = 'center';
  const chain = (vals, start, pos, horiz) => {
    let c0 = start; const L = (a, b) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
    const tot = vals.reduce((a, b) => a + b, 0) / 1000;
    if (horiz) L(pp(start, pos), pp(start + tot, pos)); else L(pp(pos, start), pp(pos, start + tot));
    const tick = q => { const [x, y] = horiz ? pp(q, pos) : pp(pos, q); L([x - 5, y + 5], [x + 5, y - 5]); };
    tick(c0);
    for (const v of vals) {
      const m = c0 + v / 2000; c0 += v / 1000; tick(c0);
      if (horiz) { const [x, y] = pp(m, pos); g.fillText(String(v), x, y - 8); }
      else { const [x, y] = pp(pos, m); g.save(); g.translate(x - 8, y); g.rotate(-Math.PI / 2); g.fillText(String(v), 0, 0); g.restore(); }
    }
  };
  if (Plan.DIMS.top.length) chain(Plan.DIMS.top, 0, -0.7, true);
  if (Plan.DIMS.bottom.length) chain(Plan.DIMS.bottom, 0, Plan.D + 0.95, true);
  if (Plan.DIMS.left.length) chain(Plan.DIMS.left, Plan.ROOMS[0]?.r[2] || 0, -0.7, false);
  if (Plan.DIMS.right.length) chain(Plan.DIMS.right, 0, Plan.W + 0.95, false);
  g.textAlign = 'left';

  // furniture footprints
  g.strokeStyle = '#c9c1b4'; g.lineWidth = 1.5;
  for (const f of furn) { const [x0, y0] = pp(f.x0, f.z0), [x1, y1] = pp(f.x1, f.z1); g.strokeRect(x0, y0, x1 - x0, y1 - y0); }

  // walls
  for (const pt of PARTS) {
    for (const [x, z, w, d] of pt.solids) { if (Math.abs(w) <= 0.001 || Math.abs(d) <= 0.001) continue; const [a, b] = pp(x, z); g.fillStyle = '#1d1b19'; g.fillRect(a, b, w * PK, d * PK); }
    for (const { o, r: [x, z, w, d], a: hp, d: dir } of pt.opens) {
      const [a, b] = pp(x, z);
      if (o.kind === 'window' || o.kind === 'slide') {
        g.strokeStyle = '#4a4540'; g.lineWidth = 1.3; g.strokeRect(a, b, w * PK, d * PK);
        g.beginPath(); if (Math.abs(w) > Math.abs(d)) { g.moveTo(a, b + d * PK / 2); g.lineTo(a + w * PK, b + d * PK / 2); } else { g.moveTo(a + w * PK / 2, b); g.lineTo(a + w * PK / 2, b + d * PK); } g.stroke();
      } else if (o.kind === 'door' || o.kind === 'entry') {
        const r = (o.e - o.s) * PK, sw = o.swing || 1, [dx, dz] = dir, nx = dz * sw, nz = -dx * sw;
        const [hx, hz] = pp(...hp);
        g.strokeStyle = '#6b655e'; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(hx, hz); g.lineTo(hx + nx * r, hz + nz * r); g.stroke();
        const a0 = Math.atan2(dz, dx), a1 = Math.atan2(nz, nx); let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        g.setLineDash([4, 4]); g.beginPath(); g.arc(hx, hz, r, a0, a0 + da, da < 0); g.stroke(); g.setLineDash([]);
      }
    }
  }

  // room labels
  g.textAlign = 'center';
  for (const rm of Plan.ROOMS) {
    const [x, y] = pp(...rm.tag);
    g.fillStyle = '#2a2622'; g.font = '600 26px "Noto Sans CJK SC"'; g.fillText(rm.zh, x, y);
    if (rm.area != null) { g.fillStyle = '#8f887e'; g.font = '400 18px "DejaVu Sans Mono"'; g.fillText(rm.area.toFixed(1) + '㎡', x, y + 26); }
  }
  g.textAlign = 'left';

  // area table
  const X0 = 1430, Y0 = 330, CW = 500;
  g.fillStyle = '#211e1b'; g.font = '700 30px "Noto Sans CJK SC"'; g.fillText('面积明细', X0, Y0);
  g.fillStyle = '#a49c92'; g.font = '400 16px "DejaVu Sans Mono"'; g.fillText('AREA SCHEDULE', X0 + 140, Y0 - 4);
  g.fillStyle = '#3a342e'; g.fillRect(X0, Y0 + 16, CW, 2.5);
  Plan.AREA_TABLE.forEach(([n, a], i) => {
    const y = Y0 + 62 + i * 46;
    g.fillStyle = '#3a342e'; g.font = '400 24px "Noto Sans CJK SC"'; g.fillText(n, X0, y);
    g.fillStyle = '#b0a89c'; g.font = '400 15px "DejaVu Sans Mono"'; g.fillText(`R-${String(i + 1).padStart(2, '0')}`, X0 + 130, y - 2);
    g.fillStyle = '#3a342e'; g.font = '400 22px "DejaVu Sans Mono"'; g.textAlign = 'right'; g.fillText(a.toFixed(2) + ' ㎡', X0 + CW, y); g.textAlign = 'left';
    g.fillStyle = '#e0d9cd'; g.fillRect(X0, y + 14, CW, 1.5);
  });
  const yt = Y0 + 62 + Plan.AREA_TABLE.length * 46 + 8;
  g.fillStyle = '#3a342e'; g.fillRect(X0, yt - 30, CW, 2);
  g.fillStyle = '#211e1b'; g.font = '700 26px "Noto Sans CJK SC"'; g.fillText('套内合计', X0, yt + 4);
  g.textAlign = 'right'; g.font = '700 26px "DejaVu Sans Mono"'; g.fillText(Plan.TOTAL_AREA.toFixed(1) + ' ㎡', X0 + CW, yt + 4); g.textAlign = 'left';

  // scale bar
  const sy = PH - 150;
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f3efe6' : '#211e1b'; g.fillRect(X0 + i * PK, sy, PK, 10); }
  g.strokeStyle = '#211e1b'; g.lineWidth = 1.5; g.strokeRect(X0, sy, 4 * PK, 10);
  g.fillStyle = '#7a7268'; g.font = '400 17px "DejaVu Sans Mono"'; [0, 1, 2, 3, 4].forEach(k => g.fillText(k + (k === 4 ? 'm' : ''), X0 + k * PK - 4, sy + 34));
  g.fillText('比例 1:100', X0 + CW - 110, sy + 34);
  g.font = '400 18px "Noto Sans CJK SC"'; g.fillText('注：面积为套内使用面积，尺寸以施工图为准', X0, sy + 80);
  return c;
}

function curl(x, z, k) {
  const nx = x / SIZE.w + 0.5, nz = z / SIZE.h + 0.5;
  const corner = Math.pow(clamp((nx - 0.72) / 0.28) * clamp((nz - 0.55) / 0.45), 1.6) * 0.07;
  const corner2 = Math.pow(clamp((0.2 - nx) / 0.2) * clamp((0.3 - nz) / 0.3), 1.6) * 0.03;
  const bow = Math.sin(nx * Math.PI) * 0.006;
  return (corner + corner2 + bow) * k + 0.001;
}

export async function init(ctx) {
  computeParts();
  const house = ctx.studio.house;
  house.root.updateMatrixWorld(true);
  for (const id in house.furn) for (const it of house.furn[id].userData.items) {
    const b = new THREE.Box3().setFromObject(it);
    if (b.max.y < 0.05) continue;
    furn.push({ x0: b.min.x + Plan.W / 2, x1: b.max.x + Plan.W / 2, z0: b.min.z + Plan.D / 2, z1: b.max.z + Plan.D / 2 });
  }
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#050403');
  camera = new THREE.PerspectiveCamera(38, 1280 / 660, 0.01, 50);

  const wt = new THREE.CanvasTexture(woodTexture('#3b2414', '#120804', 99, 1024, 1024, 0));
  wt.colorSpace = THREE.SRGBColorSpace;
  wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2, 3); wt.rotation = 0.05;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.42, metalness: 0 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);

  base = new THREE.CanvasTexture(paperCanvas()); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
  paperGeo = new THREE.PlaneGeometry(SIZE.w, SIZE.h, 48, 34); paperGeo.rotateX(-Math.PI / 2);
  paperGeo.userData.flat = paperGeo.attributes.position.array.slice();
  paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: base, roughness: 0.85 }));
  paper.castShadow = paper.receiveShadow = true; scene.add(paper);

  const oc = document.createElement('canvas'); oc.width = PW / 2; oc.height = PH / 2; overlayCtx = oc.getContext('2d');
  overlayTex = new THREE.CanvasTexture(oc); overlayTex.colorSpace = THREE.SRGBColorSpace;
  const ov = new THREE.Mesh(paperGeo, new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthWrite: false, blending: THREE.NormalBlending }));
  ov.renderOrder = 2; ov.position.y = 0.0015; paper.add(ov);

  const pen = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.36, 24), new THREE.MeshStandardMaterial({ color: '#0d0c0c', roughness: 0.25, metalness: 0.3 }));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.012, 24), new THREE.MeshStandardMaterial({ color: '#c9a25a', roughness: 0.25, metalness: 1 }));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 24), new THREE.MeshStandardMaterial({ color: '#b8a070', roughness: 0.3, metalness: 1 }));
  ring.position.y = 0.06; tip.position.y = -0.2; tip.rotation.x = Math.PI;
  pen.add(body, ring, tip); pen.traverse(o => { o.castShadow = true; });
  pen.rotation.set(Math.PI / 2, 0, 0.55); pen.position.set(0.66, 0.012, 0.05);
  pen.rotation.z = Math.PI / 2 - 0.5; pen.rotation.x = Math.PI / 2; pen.rotation.y = 0;
  scene.add(pen);

  scene.add(new THREE.AmbientLight('#4a3424', 0.35));
  const spot = new THREE.SpotLight('#ffcf9a', 13, 7, 0.6, 0.8, 1.2);
  spot.position.set(-0.6, 1.9, -0.4); spot.target.position.set(0.05, 0, 0.05);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004; spot.shadow.radius = 3;
  scene.add(spot, spot.target);
  const fill = new THREE.DirectionalLight('#ffe2c0', 0.25); fill.position.set(1, 1, 1); scene.add(fill);
}

function shapePaper(k) {
  const p = paperGeo.attributes.position, f = paperGeo.userData.flat;
  for (let i = 0; i < p.count; i++) p.setY(i, curl(f[i * 3], f[i * 3 + 2], k));
  p.needsUpdate = true; paperGeo.computeVertexNormals();
}

const V = new THREE.Vector3();
function project(u, v, k) {
  const x = (u / PW - 0.5) * SIZE.w, z = (v / PH - 0.5) * SIZE.h;
  V.set(x, curl(x, z, k) + 0.002, z).applyMatrix4(paper.matrixWorld).project(camera);
  return [(V.x + 1) * 640, (1 - V.y) * 360];
}

function drawOverlay(scan, read) {
  const g = overlayCtx, s = 0.5;
  g.clearRect(0, 0, PW * s, PH * s);
  if (scan <= 0 && read <= 0) return;
  g.save(); g.scale(s, s);
  g.beginPath(); g.rect(0, 0, PW, PH * scan); g.clip();
  g.lineWidth = 5; g.strokeStyle = 'rgba(110,185,255,0.9)'; g.shadowColor = 'rgba(70,160,255,0.9)'; g.shadowBlur = 14;
  for (const pt of PARTS) for (const [x, z, w, d] of pt.solids) { if (Math.abs(w) <= 0.001 || Math.abs(d) <= 0.001) continue; const [a, b] = pp(x, z); g.strokeRect(a, b, w * PK, d * PK); }
  if (read > 0) {
    g.shadowBlur = 0; g.fillStyle = `rgba(110,180,255,${0.12 * read})`;
    for (const rm of Plan.ROOMS) { const [x0, x1, z0, z1] = rm.r; const [a, b] = pp(x0, z0), [c, d] = pp(x1, z1); g.fillRect(a + 4, b + 4, c - a - 8, d - b - 8); }
  }
  g.restore();
  overlayTex.needsUpdate = true;
}

export function render(t, ctx, shot) {
  const { renderer, fxg } = ctx;
  const u = t - shot.t0;
  const dur = shot.t1 - shot.t0;
  const deskew = ease.cubicInOut(inv(dur * 0.51, dur * 0.64, u));
  shapePaper(1 - deskew);
  paper.rotation.y = lerp(-0.1, 0, deskew);
  paper.position.set(lerp(-0.02, 0, deskew), 0, 0);

  const h = hand(t, 0.006 * (1 - deskew));
  const c = keys(u, [
    { t: 0, v: [0.12, 0.86, 1.16, 0.02, 0, 0.06, 40] },
    { t: dur * 0.37, v: [0.08, 0.78, 1.0, 0.02, 0, 0.05, 40] },
    { t: dur * 0.51, v: [0.06, 0.76, 0.95, 0.02, 0, 0.04, 40], e: ease.linear },
    { t: dur * 0.64, v: [0.0, 1.22, 0.03, 0.0, 0, 0.0, 40] },
    { t: dur * 0.89, v: [-0.05, 1.12, 0.03, -0.05, 0, 0.0, 40], e: ease.sineInOut },
    { t: dur, v: [-0.164, 0.12, 0.03, -0.164, 0, 0.023, 40], e: ease.expoIn },
  ]);
  camera.position.set(c[0] + h[0], c[1], c[2] + h[1]); camera.fov = c[6]; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0); if (u > dur * 0.56) camera.up.set(0, 0, -1);
  camera.lookAt(c[3], c[4], c[5]);

  const scan = inv(dur * 0.37, dur * 0.53, u), read = ease.cubicOut(inv(dur * 0.63, dur * 0.71, u));
  drawOverlay(scan, read);
  scene.updateMatrixWorld();
  renderer.setClearColor('#000', 1);
  renderer.toneMappingExposure = 1.05;
  renderer.render(scene, camera);
  renderer.toneMappingExposure = 1.0;

  const vg = fxg.createRadialGradient(640, 380, 200, 640, 380, 820);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); fxg.fillStyle = vg; fxg.fillRect(0, 0, 1280, 660);

  let hud = '';
  const k = 1 - deskew;
  const corners = [[0, 0], [PW, 0], [PW, PH], [0, PH]].map(([a, b]) => project(a, b, k));

  const arOn = clamp(inv(dur * 0.36, dur * 0.40, u)) * (1 - inv(dur * 0.70, dur * 0.76, u));
  if (arOn > 0) {
    fxg.save(); fxg.globalAlpha = arOn;
    fxg.strokeStyle = 'rgba(140,200,255,0.5)'; fxg.setLineDash([4, 6]); fxg.lineWidth = 1;
    fxg.beginPath(); corners.forEach((p, i) => (i ? fxg.lineTo(...p) : fxg.moveTo(...p))); fxg.closePath(); fxg.stroke(); fxg.setLineDash([]);
    fxg.strokeStyle = '#9fd4ff'; fxg.lineWidth = 2.5; fxg.shadowColor = '#5fb8ff'; fxg.shadowBlur = 12;
    corners.forEach((p, i) => {
      const n = corners[(i + 1) % 4], q = corners[(i + 3) % 4], L = 26;
      const d1 = [n[0] - p[0], n[1] - p[1]], d2 = [q[0] - p[0], q[1] - p[1]];
      const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2);
      fxg.beginPath(); fxg.moveTo(p[0] + d1[0] / l1 * L, p[1] + d1[1] / l1 * L); fxg.lineTo(...p); fxg.lineTo(p[0] + d2[0] / l2 * L, p[1] + d2[1] / l2 * L); fxg.stroke();
    });
    if (scan > 0 && scan < 1) {
      const s = ease.sineInOut(scan);
      const a = corners[0].map((v, j) => lerp(v, corners[3][j], s)), b = corners[1].map((v, j) => lerp(v, corners[2][j], s));
      const grd = fxg.createLinearGradient(...a, ...b);
      grd.addColorStop(0, 'rgba(140,210,255,0)'); grd.addColorStop(0.5, 'rgba(190,230,255,1)'); grd.addColorStop(1, 'rgba(140,210,255,0)');
      fxg.strokeStyle = grd; fxg.lineWidth = 3; fxg.shadowBlur = 24;
      fxg.beginPath(); fxg.moveTo(...a); fxg.lineTo(...b); fxg.stroke();
      const a2 = corners[0].map((v, j) => lerp(v, corners[3][j], Math.max(0, s - 0.08))), b2 = corners[1].map((v, j) => lerp(v, corners[2][j], Math.max(0, s - 0.08)));
      fxg.fillStyle = 'rgba(120,200,255,0.08)'; fxg.beginPath(); fxg.moveTo(...a2); fxg.lineTo(...b2); fxg.lineTo(...b); fxg.lineTo(...a); fxg.fill();
    }
    fxg.restore();
    corners.forEach((p, i) => {
      const off = [[-8, -26], [8, -26], [8, 12], [-8, 12]][i];
      hud += `<div class="abs mono" style="left:${p[0] + off[0]}px;top:${p[1] + off[1]}px;font-size:10px;color:#a9d6ff;opacity:${arOn};transform:translateX(${i === 1 || i === 2 ? 0 : -100}%)">${Math.round(p[0])}, ${Math.round(p[1])}</div>`;
    });
  }

  const secOn = clamp(inv(dur * 0.36, dur * 0.40, u)) * (1 - inv(dur * 0.94, dur, u));
  if (secOn > 0) {
    hud += section('01', '识别', 'READ', secOn);
    const doors = Plan.WALLS.flatMap(w => w.open).filter(o => o.kind !== 'window').length;
    const wins = Plan.WALLS.flatMap(w => w.open).filter(o => o.kind === 'window').length;
    const tick = (a, b, x) => Math.round(lerp(a, b, clamp(x)));
    if (u < dur * 0.66) {
      const rows = [['EDGE DETECT', `✓ ${tick(0, 4812, inv(dur * 0.39, dur * 0.51, u)).toLocaleString()} px`, dur * 0.39], ['CORNERS', `${tick(0, 4, inv(dur * 0.40, dur * 0.47, u))} / 4`, dur * 0.41],
        ['DESKEW', `${lerp(-5.7, 0, deskew).toFixed(1)}°`, dur * 0.44], ['PERSPECTIVE', `${lerp(3.5, 0, deskew).toFixed(1)}° · ${lerp(1.8, 0, deskew).toFixed(1)}°`, dur * 0.46]];
      hud += `<div class="abs mono" style="left:52px;top:92px;font-size:10px;line-height:19px;opacity:${secOn}">
        <div style="color:#ef6a4c">SCAN · 线框识别</div>` + rows.map(([a, b, t0]) => `<div style="opacity:${inv(t0, t0 + dur * 0.03, u)};color:#cfd6de"><span style="display:inline-block;width:110px;color:#8f9aa6">${a}</span>${b}</div>`).join('') + `</div>`;
    } else {
      const n = s => tick(0, s, inv(dur * 0.66, dur * 0.80, u));
      hud += `<div class="abs" style="left:52px;top:92px;opacity:${secOn}">
        <div class="mono" style="font-size:10px;color:#ef6a4c">READ · 结构识别</div>
        <div style="font-size:15px;margin-top:8px;font-weight:600">墙 <span class="mono" style="color:#ef6a4c">${n(Plan.WALLS.length)}</span>&nbsp; 门 <span class="mono" style="color:#ef6a4c">${n(doors)}</span>&nbsp; 窗 <span class="mono" style="color:#ef6a4c">${n(wins)}</span>&nbsp; 房间 <span class="mono" style="color:#ef6a4c">${n(Plan.ROOMS.length)}</span></div>
        <div class="mono" style="font-size:10px;color:#9a9590;margin-top:6px">比例 1 px = 14.7 mm · SCALE</div></div>`;
    }
  }

  if (u > dur * 0.66 && u < dur) {
    Plan.ROOMS.forEach(({ zh, tag: [x, y], area }, i) => {
      const s = spring(u - dur * 0.68 - i * dur * 0.017, 2.4, 0.5) * (1 - inv(dur * 0.93, dur * 0.98, u));
      const [sx, sy] = project(...pp(x, y - 0.25), 0);
      hud += tag(sx, sy + 10, zh, fmtArea(area), s);
    });
  }
  return { hud, veil: Math.max(1 - inv(0, dur * 0.05, u), inv(dur * 0.94, dur, u)) };
}

export { PARTS };
