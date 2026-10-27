// Shot 3 · CAD: the CAD set drawn from the plan data — plan with dimension chains, south elevation,
// section A-A and furniture layout — fanned out as floating sheets, then back down onto the plan in white.
import * as THREE from 'three';
import { clamp, ease, inv, lerp, keys, spring } from './util.js';
import { section } from './hud.js';
import * as Plan from './plan.js';

const CW = 2048, CH = 1152, K = 95;
const BLUE = '#bfdcff', GLOW = '#3d9bff', RED = '#ff6a45';
let scene, camera, sheets = [], planCanvas, planTex, furnRects = [], ctxRef;
let OX, OZ;
const px = x => OX + x * K, pz = z => OZ + z * K;

function wallParts(w) {
  const [ax, az] = w.a, [bx, bz] = w.b, len = Math.hypot(bx - ax, bz - az);
  const dx = (bx - ax) / len, dz = (bz - az) / len, t = w.t / 2;
  const seg = (s0, s1) => {
    const x0 = ax + dx * s0, z0 = az + dz * s0, x1 = ax + dx * s1, z1 = az + dz * s1;
    return [Math.min(x0, x1) - (dx ? 0 : t), Math.min(z0, z1) - (dz ? 0 : t), Math.abs(x1 - x0) + (dx ? 0 : 2 * t), Math.abs(z1 - z0) + (dz ? 0 : 2 * t)];
  };
  const solids = [], opens = [];
  let cur = -t;
  for (const o of [...w.open].sort((p, q) => p.s - q.s)) {
    solids.push(seg(cur, o.s));
    opens.push({ o, r: seg(o.s, o.e), a: [ax + dx * o.s, az + dz * o.s], d: [dx, dz], n: [-dz, dx] });
    cur = o.e;
  }
  solids.push(seg(cur, len + t));
  return { solids, opens };
}

export let PARTS = [];
function computeParts() {
  OX = (CW - Plan.W * K) / 2;
  OZ = (CH - Plan.D * K) / 2 + 20;
  PARTS = Plan.WALLS.map(wallParts);
}

function glowStroke(g, color, width, blur, fn) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.shadowColor = GLOW; g.shadowBlur = blur; fn(); g.restore();
}

export function drawPlan(g, { p = 1, dims = 1, tags = 1, mode = 'neon', furn = 0, k = 1, title = 1 } = {}) {
  g.save(); g.scale(k, k);
  const white = mode === 'white';
  const stroke = white ? '#f4f6f8' : BLUE;
  const nW = PARTS.length, shown = p * nW;
  PARTS.forEach((pt, i) => {
    const u = clamp(shown - i);
    if (u <= 0) return;
    g.globalAlpha = u;
    for (const [x, z, w, d] of pt.solids) {
      if (w <= 0 || d <= 0) continue;
      g.fillStyle = white ? 'rgba(255,255,255,0.08)' : 'rgba(110,170,255,0.14)'; g.fillRect(px(x), pz(z), w * K, d * K);
      glowStroke(g, stroke, white ? 1.6 : 2.2, white ? 2 : 10, () => g.strokeRect(px(x), pz(z), w * K, d * K));
    }
    for (const { o, r: [x, z, w, d], a, dir, n } of pt.opens) {
      if (o.kind === 'window') {
        glowStroke(g, stroke, 1.2, white ? 0 : 6, () => {
          for (const f of [0.18, 0.5, 0.82]) { g.beginPath(); if (w > d) { g.moveTo(px(x), pz(z + d * f)); g.lineTo(px(x + w), pz(z + d * f)); } else { g.moveTo(px(x + w * f), pz(z)); g.lineTo(px(x + w * f), pz(z + d)); } g.stroke(); }
          g.strokeRect(px(x), pz(z), w * K, d * K);
        });
      } else if (o.kind === 'door' || o.kind === 'entry') {
        const r = (o.e - o.s) * K, sw = o.swing || 1;
        const [dx, dz] = pt.opens.find(q => q.o === o).d, [nx, nz] = [-dz * sw * -1, dx * sw * -1];
        const hx = px(a[0]), hz = pz(a[1]);
        g.save(); g.strokeStyle = white ? '#ff8a5c' : RED; g.lineWidth = 1.6; g.shadowColor = RED; g.shadowBlur = white ? 0 : 8;
        g.beginPath(); g.moveTo(hx, hz); g.lineTo(hx + nx * r, hz + nz * r); g.stroke();
        const a0 = Math.atan2(dz, dx), a1 = Math.atan2(nz, nx);
        let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        g.beginPath(); g.arc(hx, hz, r, a0, a0 + da, da < 0); g.stroke(); g.restore();
      } else if (o.kind === 'slide') {
        glowStroke(g, stroke, 1.2, white ? 0 : 6, () => {
          if (w > d) { g.strokeRect(px(x), pz(z + d * 0.2), w * K * 0.55, d * K * 0.3); g.strokeRect(px(x + w * 0.45), pz(z + d * 0.5), w * K * 0.55, d * K * 0.3); }
          else { g.strokeRect(px(x + w * 0.2), pz(z), w * K * 0.3, d * K * 0.55); g.strokeRect(px(x + w * 0.5), pz(z + d * 0.45), w * K * 0.3, d * K * 0.55); }
        });
      }
    }
  });
  g.globalAlpha = 1;
  if (furn > 0) {
    g.globalAlpha = furn;
    for (const f of furnRects) {
      g.save(); g.strokeStyle = f.c; g.lineWidth = 1.3; g.shadowColor = f.c; g.shadowBlur = 6;
      g.fillStyle = f.c + '22'; g.fillRect(px(f.x0), pz(f.z0), (f.x1 - f.x0) * K, (f.z1 - f.z0) * K);
      g.strokeRect(px(f.x0), pz(f.z0), (f.x1 - f.x0) * K, (f.z1 - f.z0) * K); g.restore();
    }
    g.globalAlpha = 1;
  }
  if (dims > 0 && Plan.DIMS.top.length) {
    g.globalAlpha = dims;
    g.font = '500 21px "DejaVu Sans Mono"'; g.fillStyle = '#a9ccf5'; g.textAlign = 'center';
    const chain = (vals, start, pos, horiz, off, label, span) => {
      let c = start;
      const line = (a, b) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
      g.strokeStyle = 'rgba(160,200,245,0.75)'; g.lineWidth = 1;
      const total = span || vals.reduce((s, v) => s + v, 0) / 1000;
      if (horiz) line([px(start), pz(pos)], [px(start + total), pz(pos)]); else line([px(pos), pz(start)], [px(pos), pz(start + total)]);
      const tick = q => (horiz ? line([px(q) - 6, pz(pos) + 6], [px(q) + 6, pz(pos) - 6]) : line([px(pos) - 6, pz(q) + 6], [px(pos) + 6, pz(q) - 6]));
      tick(c);
      for (let v of vals) {
        const sv = span ? span * 1000 : v; const m = c + sv / 2000; c += sv / 1000; tick(c); v = label || v;
        if (horiz) { line([px(c), pz(pos) - 10], [px(c), pz(pos) + 10]); g.fillText(String(v), px(m), pz(pos) + off); }
        else { g.save(); g.translate(px(pos) + off, pz(m)); g.rotate(-Math.PI / 2); g.fillText(String(v), 0, 0); g.restore(); }
      }
    };
    const topZ = Plan.ROOMS[0]?.r[2] || 0;
    chain(Plan.DIMS.top, 0, -0.75, true, -10);
    chain([0], 0, -1.25, true, -10, Math.round(Plan.DIMS.top.reduce((a, b) => a + b, 0)).toString(), Plan.DIMS.top.reduce((a, b) => a + b, 0) / 1000);
    chain(Plan.DIMS.bottom, 0, Plan.D + 0.75, true, 24);
    chain([0], 0, Plan.D + 1.25, true, 24, Math.round(Plan.W * 1000).toString(), Plan.W);
    if (Plan.DIMS.left.length) chain(Plan.DIMS.left, topZ, -0.75, false, -10);
    if (Plan.DIMS.right.length) chain(Plan.DIMS.right, 0, Plan.W + 0.75, false, 24);
    g.textAlign = 'left'; g.globalAlpha = 1;
  }
  if (tags > 0) {
    Plan.ROOMS.forEach((rm, i) => {
      const s = clamp(spring(tags * 2.2 - i * 0.08, 2.2, 0.55), 0, 1.15);
      if (s <= 0) return;
      const [x, z] = rm.tag, cx = px(x), cz = pz(z);
      g.save(); g.translate(cx, cz); g.scale(s, s); g.globalAlpha = clamp(s);
      const w = Math.max(84, rm.zh.length * 28 + 22);
      g.fillStyle = 'rgba(16,18,22,0.92)'; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
      roundRect(g, -w / 2, -32, w, 64, 7); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = '600 24px "Noto Sans CJK SC"'; g.textAlign = 'center'; g.fillText(rm.zh, 0, -5);
      g.fillStyle = '#ff7f5c'; g.font = '500 19px "DejaVu Sans Mono"'; if (rm.area != null) g.fillText(rm.area.toFixed(1) + '㎡', 0, 22);
      g.restore();
    });
  }
  g.restore();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function frame(g, title, en, no) {
  g.fillStyle = 'rgba(8,12,18,0.82)'; g.fillRect(0, 0, CW, CH);
  g.strokeStyle = 'rgba(170,205,245,0.7)'; g.lineWidth = 3; g.strokeRect(14, 14, CW - 28, CH - 28);
  g.lineWidth = 1; g.strokeRect(30, 30, CW - 60, CH - 60);
  const bx = CW - 470, by = CH - 150;
  g.strokeRect(bx, by, 440, 120); g.beginPath(); g.moveTo(bx, by + 60); g.lineTo(bx + 440, by + 60); g.moveTo(bx + 280, by + 60); g.lineTo(bx + 280, by + 120); g.stroke();
  g.fillStyle = '#fff'; g.font = '700 30px "Noto Sans CJK SC"'; g.fillText(title, bx + 16, by + 42);
  g.fillStyle = '#9fc4ef'; g.font = '500 16px "DejaVu Sans Mono"'; g.fillText(en, bx + 16 + title.length * 32, by + 40);
  g.fillText('SCALE 1:50', bx + 16, by + 98); g.fillStyle = RED; g.fillText(no, bx + 300, by + 98);
  g.fillStyle = '#fff'; g.font = '700 40px "Noto Sans CJK SC"'; g.fillText(title, 70, 100);
  g.fillStyle = '#8fb6e6'; g.font = '500 22px "DejaVu Sans Mono"'; g.fillText(`${en}  ·  1:50`, 84 + title.length * 42, 96);
}

function drawElevation(g) {
  frame(g, '南立面图', 'SOUTH ELEVATION', 'A-02');
  const k = 140, ox = (CW - Plan.D * k) / 2, oy = 860;
  const X = z => ox + z * k, Y = y => oy - y * k;
  g.save(); g.strokeStyle = BLUE; g.shadowColor = GLOW; g.shadowBlur = 8; g.lineWidth = 2;
  g.beginPath(); g.moveTo(X(-1), Y(-0.16)); g.lineTo(X(Plan.D + 1), Y(-0.16)); g.stroke();
  g.strokeRect(X(0), Y(Plan.H + 0.15), Plan.D * k, (Plan.H + 0.31) * k);
  const zTop = Plan.ROOMS[0]?.r[2] || 0.8, zBot = Plan.ROOMS[0]?.r[3] || 7.75;
  g.lineWidth = 2.6; g.strokeRect(X(zTop), Y(Plan.H), (zBot - zTop) * k, (Plan.H + 0.16) * k);
  g.lineWidth = 1.5;
  g.strokeRect(X(zTop + 0.2), Y(2.45), (zBot - zTop - 0.4) * k, 1.55 * k);
  g.restore();
  g.fillStyle = '#d8e8ff'; g.font = '500 22px "DejaVu Sans Mono"';
  for (const [y, s] of [[0, '±0.000'], [Plan.H, `+${Plan.H.toFixed(3)}`], [0.9, '+0.900'], [2.45, '+2.450']]) {
    g.strokeStyle = '#9fc4ef'; g.beginPath(); g.moveTo(X(-0.9), Y(y)); g.lineTo(X(-0.2), Y(y)); g.stroke();
    g.fillText(s, X(-1.0) - 60, Y(y) - 16);
  }
}

function drawSection(g) {
  frame(g, '剖面图', 'SECTION A-A', 'A-03');
  const k = 100, ox = (CW - Plan.W * k) / 2, oy = 820;
  const X = x => ox + x * k, Y = y => oy - y * k;
  const hatch = (x0, y0, x1, y1) => {
    g.save(); g.beginPath(); g.rect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); g.clip();
    g.fillStyle = 'rgba(110,170,255,0.18)'; g.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
    g.strokeStyle = 'rgba(170,205,245,0.6)'; g.lineWidth = 1;
    for (let i = -400; i < (x1 - x0) * k + 400; i += 14) { g.beginPath(); g.moveTo(X(x0) + i, Y(y0)); g.lineTo(X(x0) + i + 40, Y(y1)); g.stroke(); }
    g.restore(); g.save(); g.strokeStyle = BLUE; g.shadowColor = GLOW; g.shadowBlur = 8; g.lineWidth = 2; g.strokeRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); g.restore();
  };
  hatch(-0.12, -0.16, Plan.W + 0.12, 0); hatch(-0.12, Plan.H, Plan.W + 0.12, Plan.H + 0.15);
  hatch(-0.12, 0, 0.12, 0.9); hatch(-0.12, 2.45, 0.12, Plan.H);
  g.fillStyle = '#d8e8ff'; g.font = '500 20px "DejaVu Sans Mono"';
  g.fillText('±0.000', X(-1.6), Y(0) + 6); g.fillText(`+${Plan.H.toFixed(3)}`, X(-1.6), Y(Plan.H) + 6);
  g.fillStyle = RED; g.fillText('A', X(-0.6), Y(Plan.H + 0.5)); g.fillText('A', X(Plan.W + 0.4), Y(Plan.H + 0.5));
}

export async function init(ctx) {
  ctxRef = ctx;
  computeParts();
  scene = new THREE.Scene(); scene.background = new THREE.Color('#030405');
  camera = new THREE.PerspectiveCamera(30, 1280 / 720, 0.1, 200);
  const house = ctx.studio.house; house.root.updateMatrixWorld(true);
  const pal = ['#ff8a5c', '#7fd0ff', '#ffd27a', '#b6f0a0'];
  Object.entries(house.furn).forEach(([id, grp], gi) => {
    for (const it of grp.userData.items) {
      const b = new THREE.Box3().setFromObject(it);
      if (b.max.y < 0.05) continue;
      furnRects.push({ x0: b.min.x + Plan.W / 2, x1: b.max.x + Plan.W / 2, z0: b.min.z + Plan.D / 2, z1: b.max.z + Plan.D / 2, c: pal[gi % pal.length] });
    }
  });
  const mk = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; };
  planCanvas = mk();
  const sheetsDef = [
    { c: planCanvas },
    { c: mk(), draw: g => drawElevation(g) },
    { c: mk(), draw: g => drawSection(g) },
    { c: mk(), draw: g => { frame(g, '家具布置图', 'FURNITURE LAYOUT', 'A-04'); drawPlan(g, { furn: 1, dims: 0.6, tags: 0 }); } },
  ];
  const SW = 3.2, SH = SW * CH / CW;
  sheetsDef.forEach((d, i) => {
    if (d.draw) d.draw(d.c.getContext('2d'));
    const tex = new THREE.CanvasTexture(d.c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 10 - i;
    scene.add(m); sheets.push({ mesh: m, tex });
  });
  planTex = sheets[0].tex;
}

function topDown(fov = 30) { const h = (3.2 * 720 / 1280) / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2)); return h; }

export function render(t, ctx, shot) {
  const u = t - shot.t0;
  const dur = shot.t1 - shot.t0;
  const fan = ease.cubicInOut(inv(dur * 0.35, dur * 0.6, u)) * (1 - ease.cubicInOut(inv(dur * 0.75, dur * 0.92, u)));
  const white = inv(dur * 0.78, dur * 0.92, u);
  const g = planCanvas.getContext('2d');
  g.clearRect(0, 0, CW, CH);
  const bgA = 1 - white;
  if (bgA > 0) { g.globalAlpha = bgA * clamp(u / (dur * 0.06)); frame(g, '平面图', 'FLOOR PLAN', 'A-01'); g.globalAlpha = 1; }
  drawPlan(g, {
    p: ease.cubicOut(inv(dur * 0.01, dur * 0.24, u)),
    dims: inv(dur * 0.16, dur * 0.28, u) * (1 - inv(dur * 0.72, dur * 0.82, u)),
    tags: inv(dur * 0.2, dur * 0.4, u) * (1 - inv(dur * 0.7, dur * 0.78, u)),
    mode: white > 0.5 ? 'white' : 'neon',
  });
  planTex.needsUpdate = true;
  sheets.forEach((s, i) => {
    const m = s.mesh;
    const off = i * fan;
    m.position.set(off * 1.05 - fan * 1.3, off * 0.32 - (i ? 0.02 * i * (1 - fan) : 0), -off * 0.55 + fan * 0.5);
    m.material.opacity = i === 0 ? 1 : clamp(fan * 1.6);
    m.visible = i === 0 || fan > 0.01;
  });
  const h = topDown(30);
  const iso = ease.cubicInOut(inv(dur * 0.32, dur * 0.6, u)) * (1 - ease.cubicInOut(inv(dur * 0.74, dur * 0.93, u)));
  const az = lerp(0, -24, iso), el = lerp(89.9, 42, iso), dist = lerp(h * 1.18, 8.6, iso);
  const drift = u < dur * 0.32 ? 1 - 0.04 * u / (dur * 0.32) : lerp(0.96, 1 / 1.18, inv(dur * 0.74, dur * 0.93, u));
  const tgt = new THREE.Vector3(lerp(0, 0.35, iso), lerp(0, 0.45, iso), lerp(0, -0.3, iso));
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  const d = dist * (u < dur * 0.32 ? drift : u > dur * 0.74 ? drift : 1);
  camera.position.set(tgt.x + Math.sin(a) * Math.cos(e) * d, tgt.y + Math.sin(e) * d, tgt.z + Math.cos(a) * Math.cos(e) * d);
  camera.up.set(0, 1, 0); if (el > 89) camera.up.set(0, 0, -1);
  camera.lookAt(tgt);
  ctx.renderer.setClearColor('#000', 1);
  ctx.renderer.toneMapping = THREE.NoToneMapping;
  ctx.renderer.render(scene, camera);
  ctx.renderer.toneMapping = THREE.ACESFilmicToneMapping;

  let hud = section('02', '图纸', 'DRAFT', 1 - inv(dur * 0.9, dur * 0.98, u));
  const chips = [['DWG', 'AutoCAD 2018'], ['DXF', 'R2013 · 通用'], ['PDF', 'A3 · 打印'], ['1:50', '施工图比例']];
  const chOn = inv(dur * 0.4, dur * 0.48, u) * (1 - inv(dur * 0.72, dur * 0.78, u));
  if (chOn > 0) hud += `<div class="abs" style="left:52px;top:84px;display:flex;gap:8px;opacity:${chOn}">` + chips.map((c, i) =>
    `<div style="opacity:${inv(dur * 0.4 + i * dur * 0.024, dur * 0.46 + i * dur * 0.024, u)};border:1px solid ${i === 3 ? 'rgba(239,106,76,.7)' : 'rgba(255,255,255,.25)'};border-radius:4px;padding:4px 9px;font-size:11px;background:rgba(255,255,255,.04)"><span class="mono" style="font-weight:700">${c[0]}</span> <span style="color:#8d949c;font-size:10px">${c[1]}</span></div>`).join('') + `</div>`;
  return { hud, veil: 1 - inv(0, dur * 0.05, u) };
}
