// Shots: BUILD (walls grow, furniture pops in) and SUN (day cycle, heat map, night lights)
import * as THREE from 'three';
import { clamp, ease, inv, lerp, keys, hand, spring } from './util.js';
import { section, tag, fmtArea } from './hud.js';
import * as Plan from './plan.js';
import { computeSunHours, heatColor, NX, NZ, STEP, initGrid } from './sunmap.js';

let S, house, heat, heatMesh, sunInfo;
let ORDER = [], POP = {}, TAGGED = [];

function initOrder() {
  ORDER = Plan.ROOMS.map(r => r.id);
  POP = {};
  let t = 2.45;
  for (const id of ORDER) { POP[id] = t; t += 0.25; }
  TAGGED = ORDER.filter(id => Plan.room(id)?.area != null);
}

const V = new THREE.Vector3();

export async function init(ctx) {
  initOrder();
  S = ctx.studio;
  house = S.house;
  house.ceilings.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  house.ceilings.visible = true;
  for (const id in house.furn) for (const it of house.furn[id].userData.items) it.userData.base = { p: it.position.clone(), s: it.scale.clone() };

  initGrid();
  heat = computeSunHours();
  const data = new Uint8Array(NX * NZ * 4);
  for (let k = 0; k < NX * NZ; k++) {
    if (heat.inRoom[k] < 0) continue;
    const c = heatColor(clamp(heat.hours[k] / 5));
    data.set([c[0], c[1], c[2], 200], k * 4);
  }
  const tex = new THREE.DataTexture(data, NX, NZ, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(NX * STEP, NZ * STEP);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  heatMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  heatMesh.position.set(NX * STEP / 2 - Plan.W / 2, 0.03, NZ * STEP / 2 - Plan.D / 2);
  heatMesh.renderOrder = 3;
  S.scene.add(heatMesh);
  sunInfo = heat;
  window.__sunHours = Object.fromEntries(Plan.ROOMS.map((r, i) => [r.zh, +heat.avg[i].toFixed(2)]));
}

function project(x, y, z, cam) { V.set(x, y, z).project(cam); return [(V.x + 1) * 640, (1 - V.y) * 360, V.z]; }
const roomWorld = (id, y = 0) => { const r = Plan.room(id); return [r.tag[0] - Plan.W / 2, y, r.tag[1] - Plan.D / 2]; };

function setWalls(g) { house.walls.forEach((w, i) => { const k = g(i); w.group.scale.y = Math.max(0.002, k); w.group.visible = true; }); }
function setFurniture(fn) {
  for (const id in house.furn) {
    const grp = house.furn[id];
    grp.userData.items.forEach((it, j) => {
      const k = fn(id, j);
      const b = it.userData.base;
      it.visible = k > 0.001;
      it.scale.copy(b.s).multiplyScalar(Math.max(0.001, k));
      it.position.set(b.p.x, b.p.y + (1 - clamp(k)) * 0.6, b.p.z);
    });
  }
}

function darkLook() {
  S.scene.background.set('#030405'); S.ground.visible = false; S.hemi.intensity = 0.55; S.hemi.color.set('#9fb4d0'); S.sun.intensity = 1.2;
  S.scene.environmentIntensity = 0.15;
}
function studio() { S.studioLook(); S.ground.visible = true; }

function orbitPose(az, el, dist, target = [0, 0.4, 0]) {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  return [target[0] + Math.sin(a) * Math.cos(e) * dist, target[1] + Math.sin(e) * dist, target[2] - Math.cos(a) * Math.cos(e) * dist, ...target];
}
function applyPose(p, fov = 32, up = [0, 1, 0]) {
  S.camera.position.set(p[0], p[1], p[2]); S.camera.up.set(...up); S.camera.fov = fov; S.camera.updateProjectionMatrix();
  S.camera.lookAt(p[3], p[4], p[5]);
}

export function render(t, ctx, shot) {
  return shot.part === 'sun' ? renderSun(t, ctx, shot) : renderBuild(t, ctx, shot);
}

function renderBuild(t, ctx, shot) {
  const u = t - shot.t0;
  const dur = shot.t1 - shot.t0;
  const { renderer } = ctx;
  heatMesh.material.opacity = 0;
  const snap = u >= dur * 0.29;
  let hud = '';
  if (!snap) {
    house.setMode('dark'); darkLook();
    setWalls(i => ease.cubicOut(inv(dur * 0.05 + i * 0.035, dur * 0.18 + i * 0.035, u)));
    for (const w of house.walls) w.edges.visible = true;
  } else {
    house.setMode('studio'); studio();
    setWalls(() => 1);
  }
  const popTime = id => POP[id] || 2.45;
  setFurniture((id, j) => (snap ? spring(u - popTime(id) - j * 0.07, 2.4, 0.5) : 0));

  let pose, fov = 32, up = [0, 1, 0];
  const topH = 21.15;
  if (u < dur * 0.29) {
    const k = ease.cubicInOut(inv(dur * 0.04, dur * 0.29, u));
    const az = lerp(180, 335, k), el = lerp(89.95, 47, k), dist = lerp(topH, 25.5, k);
    pose = orbitPose(az, el, dist, [0, lerp(0, 0.4, k), lerp(0.08, 0, k)]);
    if (k < 0.002) up = [0, 0, -1];
  } else {
    const k = inv(dur * 0.29, dur, u);
    const h = hand(t, 0.12 * (1 - inv(dur * 0.86, dur, u)));
    pose = orbitPose(lerp(335, 332, ease.sineInOut(k)) + h[0], lerp(47, 48, k) + h[1] * 0.5, lerp(25.5, 26.5, ease.sineInOut(k)));
  }
  applyPose(pose, fov, up);
  renderer.render(S.scene, S.camera);

  hud += section('03', '建模', 'BUILD', 1 - inv(dur * 0.96, dur, u));
  if (snap) {
    for (const id of TAGGED) {
      const s = spring(u - popTime(id) - 0.25, 2.2, 0.5) * (1 - inv(dur * 0.93, dur * 0.97, u));
      const [x, y, z] = roomWorld(id, 2.9), [sx, sy, sz] = project(x, y, z, S.camera);
      const rm = Plan.room(id);
      if (sz < 1) hud += tag(sx, sy, rm.zh, fmtArea(rm.area), s);
    }
  }
  const flash = u >= dur * 0.29 ? 1 - inv(dur * 0.29, dur * 0.36, u) : 0;
  if (flash > 0) hud = `<div class="abs" style="inset:0;background:#fff;opacity:${flash * 0.55}"></div>` + hud;
  return { hud, light: snap };
}

export { orbitPose };

function hhmm(h) { const H_ = Math.floor(h), M = Math.floor((h - H_) * 60); return [String(H_).padStart(2, '0'), String(M).padStart(2, '0')]; }

function renderSun(t, ctx, shot) {
  const u = t - shot.t0;
  const dur = shot.t1 - shot.t0;
  const { renderer, fxg } = ctx;
  const proj = Plan.getProject();
  const style = proj?.meta?.style || 'mcm';
  house.setStyle(style); house.setMode('studio'); studio(); setWalls(() => 1); setFurniture(() => 1);

  const night = ease.cubicInOut(inv(dur * 0.59, dur * 0.68, u));
  const black = ease.cubicInOut(inv(dur * 0.73, dur * 0.82, u));
  const hour = u < dur * 0.62 ? lerp(6.0, 18 + 56 / 60, ease.sineInOut(u / (dur * 0.62)) * 0.15 + (u / (dur * 0.62)) * 0.85) : 18 + 56 / 60 + (u - dur * 0.62) * 0.35;
  const sd = Plan.sunDir(Math.min(hour, Plan.SUNSET + 0.3));
  const sunK = clamp(sd.y * 6) * (1 - night);
  S.setSunVec(new THREE.Vector3(sd.x, Math.max(sd.y, 0.03), sd.z), 3.0 * sunK);
  S.sun.color.setRGB(1, lerp(0.72, 0.95, clamp(sd.y * 2)), lerp(0.5, 0.86, clamp(sd.y * 2)));
  S.hemi.intensity = lerp(0.9, 0.12, night); S.scene.environmentIntensity = lerp(0.55, 0.06, night);
  const bg = new THREE.Color('#d8d3cb').lerp(new THREE.Color('#3a4870'), night).lerp(new THREE.Color('#020203'), black);
  S.scene.background.copy(bg); S.groundMat.color.copy(new THREE.Color('#d2ccc3').lerp(new THREE.Color('#33405f'), night).lerp(new THREE.Color('#050505'), black));
  house.setNight(night);

  const lightK = i => ease.cubicOut(inv(dur * 0.63 + i * 0.01, dur * 0.65 + i * 0.01, u));
  house.nightLights.children.forEach((l, i) => { l.intensity = 5 * lightK(i); });
  const lit = house.nightLights.children.filter((_, i) => lightK(i) > 0.5).length;
  heatMesh.material.opacity = 0.8 * inv(dur * 0.15, dur * 0.21, u) * (1 - inv(dur * 0.47, dur * 0.53, u));

  const h = hand(t, 0.1);
  const pose = orbitPose(lerp(-28, -8, ease.sineInOut(u / (dur * 0.82))) + h[0], lerp(48, 44, u / (dur * 0.82)), lerp(26.5, 24, ease.sineInOut(u / (dur * 0.82))));
  applyPose(pose, 32);
  renderer.render(S.scene, S.camera);

  const R = 8.5, arcOn = 1 - inv(dur * 0.61, dur * 0.68, u);
  const P = hh => { const d = Plan.sunDir(hh); return project(d.x * R * 1.1, d.y * 4.6 + 0.8, d.z * R * 0.95, S.camera); };
  fxg.save();
  if (arcOn > 0) {
    fxg.globalAlpha = arcOn; fxg.strokeStyle = 'rgba(239,150,70,0.85)'; fxg.lineWidth = 1.6; fxg.shadowColor = '#ff9a40'; fxg.shadowBlur = 6;
    fxg.beginPath(); for (let hh = Plan.SUNRISE; hh <= Plan.SUNSET + 0.001; hh += 0.1) { const [x, y] = P(hh); hh === Plan.SUNRISE ? fxg.moveTo(x, y) : fxg.lineTo(x, y); } fxg.stroke();
    fxg.shadowBlur = 0; fxg.fillStyle = 'rgba(80,60,40,0.8)'; fxg.font = '11px "DejaVu Sans Mono"';
    for (let hh = 6; hh <= 18; hh += 2) { const [x, y] = P(hh); fxg.fillText(String(hh).padStart(2, '0'), x + 8, y - 6); fxg.fillRect(x - 2, y - 2, 4, 4); }
    fxg.fillStyle = 'rgba(70,60,50,0.7)'; fxg.font = '12px "DejaVu Sans Mono"';
    for (const [l, x, z] of [['N', 12, 0], ['S', -12, 0], ['E', 0, 9], ['W', 0, -9]]) { const [sx, sy] = project(x, -0.1, z, S.camera); fxg.fillText(l, sx - 4, sy + 4); }
    if (sd.y > -0.02 && hour < Plan.SUNSET + 0.2) {
      const [sx, sy] = P(hour);
      const gr = fxg.createRadialGradient(sx, sy, 0, sx, sy, 46);
      gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.18, 'rgba(255,240,200,0.95)'); gr.addColorStop(0.45, 'rgba(255,200,120,0.35)'); gr.addColorStop(1, 'rgba(255,180,90,0)');
      fxg.fillStyle = gr; fxg.beginPath(); fxg.arc(sx, sy, 46, 0, Math.PI * 2); fxg.fill();
    }
  }
  fxg.restore();

  const dark = night > 0.5;
  let hud = section('05', '日照', 'SUNLIGHT', 1 - inv(dur * 0.87, dur * 0.93, u));
  const [hh, mm] = hhmm(hour);
  const colon = Math.floor(t * 2) % 2 ? 0.35 : 1;
  const dayK = clamp((hour - Plan.SUNRISE) / (Plan.SUNSET - Plan.SUNRISE));
  const ink = dark ? '#f2ede6' : '#2a2622', sub = dark ? 'rgba(255,255,255,.55)' : 'rgba(40,36,32,.55)';
  hud += `<div class="abs" style="right:56px;top:40px;text-align:right;color:${ink}">
    <div class="mono" style="font-size:54px;font-weight:300;letter-spacing:.06em;line-height:1">${hh}<span style="color:#ef6a4c;opacity:${colon}">:</span>${mm}</div>
    <div style="font-size:13px;margin-top:8px;font-weight:600">日照模拟 <span class="mono" style="font-size:10px;color:${sub}">SUN STUDY</span></div>
    <div style="position:relative;width:216px;height:1px;background:${sub};margin:12px 0 6px auto"><div style="position:absolute;left:${dayK * 100}%;top:-3px;width:7px;height:7px;border-radius:50%;background:#ef6a4c;transform:translateX(-50%)"></div></div>
    <div class="mono" style="font-size:10px;color:${sub};display:flex;justify-content:space-between;width:216px;margin-left:auto"><span>↑05:12</span><span>↓18:48</span></div>
    ${night > 0 ? `<div class="mono" style="font-size:10px;margin-top:10px;opacity:${night};color:${sub}">LIGHTS ${lit}/${Plan.ROOMS.length}</div>` : ''}
  </div>`;
  const heatOn = inv(dur * 0.15, dur * 0.21, u) * (1 - inv(dur * 0.47, dur * 0.53, u));
  if (heatOn > 0) {
    hud += `<div class="abs" style="right:56px;top:178px;width:216px;opacity:${heatOn}">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:rgba(40,36,32,.6)"><span class="mono">0h</span><span style="font-weight:600;color:#2a2622">日照时长</span><span class="mono">5h+</span></div>
      <div style="height:5px;margin-top:4px;border-radius:3px;background:linear-gradient(90deg,#2850dc,#28bee6,#50d26e,#fadc3c,#eb4632)"></div></div>`;
    for (const id of ['living', 'dining', 'master', 'guest', 'study', 'kitchen', 'balcony']) {
      const ri = Plan.ROOMS.findIndex(r => r.id === id);
      if (ri < 0) continue;
      const rm = Plan.ROOMS[ri];
      const [x, y, z] = roomWorld(id, 0.3), [sx, sy] = project(x, y, z, S.camera);
      hud += tag(sx, sy, rm.zh, `${heat.avg[ri].toFixed(1)}h`, spring(u - dur * 0.19 - ri * 0.007, 2.2, 0.5) * heatOn);
    }
  }
  return { hud, light: !dark, veil: ease.cubicIn(inv(dur * 0.88, dur * 0.99, u)) };
}

export function heatCanvas() {
  const c = document.createElement('canvas'); c.width = NX; c.height = NZ; const g = c.getContext('2d');
  g.fillStyle = '#101214'; g.fillRect(0, 0, NX, NZ);
  const img = g.getImageData(0, 0, NX, NZ);
  for (let k = 0; k < NX * NZ; k++) if (heat.inRoom[k] >= 0) { const col = heatColor(clamp(heat.hours[k] / 5)); img.data.set([...col, 255], k * 4); }
  g.putImageData(img, 0, 0);
  return c;
}

export function renderPose(ctx, pose, fov = 32) {
  const proj = Plan.getProject();
  const style = proj?.meta?.style || 'mcm';
  house.setStyle(style); house.setMode('studio'); studio(); setWalls(() => 1); setFurniture(() => 1);
  heatMesh.material.opacity = 0;
  applyPose(pose, fov);
  ctx.renderer.render(S.scene, S.camera);
}
