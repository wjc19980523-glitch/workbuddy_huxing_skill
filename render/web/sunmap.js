// Sunlight-hours map: for each floor sample, march toward the sun through the real wall openings.
// Light reaches the floor only if the ray leaves the flat through a window/glass opening below the ceiling.
import * as Plan from './plan.js';

export const STEP = 0.1;
export const getNX = () => Math.round(Plan.W / STEP);
export const getNZ = () => Math.round(Plan.D / STEP);
export let NX = 0, NZ = 0;
export function initGrid() { NX = getNX(); NZ = getNZ(); }

function lit(px, pz, s) {
  if (s.y <= 0.02) return false;
  const horiz = Math.hypot(s.x, s.z), tanA = s.y / horiz, dx = s.x / horiz, dz = s.z / horiz;
  // crossings with every wall line, nearest first
  const hits = [];
  for (const w of Plan.WALLS) {
    const [ax, az] = w.a, [bx, bz] = w.b;
    const ex = bx - ax, ez = bz - az, len = Math.hypot(ex, ez);
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const r = ((ax - px) * ez - (az - pz) * ex) / den;       // distance along the ray
    const q = ((ax - px) * dz - (az - pz) * dx) / den;       // fraction along the wall
    if (r <= 1e-4 || q < -0.002 || q > 1.002) continue;
    hits.push({ r, along: q * len, w });
  }
  hits.sort((a, b) => a.r - b.r);
  for (const h of hits) {
    const y = h.r * tanA;
    if (y >= Plan.H) return false;                              // hit the ceiling first
    const o = h.w.open.find(o => h.along >= o.s && h.along <= o.e);
    if (!o || y < o.sill || y > o.head) return false;          // solid wall
    if (h.w.ext) return true;                                  // out through a window
  }
  return false;
}

// hours of direct sun per cell + per-room averages (computed once, deterministic)
export function computeSunHours(dt = 0.25) {
  initGrid();
  const hours = new Float32Array(NX * NZ), inRoom = new Int8Array(NX * NZ).fill(-1);
  Plan.ROOMS.forEach((rm, ri) => {
    const [x0, x1, z0, z1] = rm.r;
    for (let i = Math.ceil(x0 / STEP); i < Math.floor(x1 / STEP); i++) for (let j = Math.ceil(z0 / STEP); j < Math.floor(z1 / STEP); j++) if (i >= 0 && j >= 0 && i < NX && j < NZ) inRoom[j * NX + i] = ri;
  });
  const suns = []; for (let h = Plan.SUNRISE; h <= Plan.SUNSET; h += dt) suns.push(Plan.sunDir(h));
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i; if (inRoom[k] < 0) continue;
    const px = (i + 0.5) * STEP, pz = (j + 0.5) * STEP;
    let n = 0; for (const s of suns) if (lit(px, pz, s)) n++;
    hours[k] = n * dt;
  }
  const avg = Plan.ROOMS.map((rm, ri) => { let s = 0, c = 0; for (let k = 0; k < hours.length; k++) if (inRoom[k] === ri) { s += hours[k]; c++; } return c ? s / c : 0; });
  const peak = Plan.ROOMS.map((rm, ri) => { let m = 0; for (let k = 0; k < hours.length; k++) if (inRoom[k] === ri) m = Math.max(m, hours[k]); return m; });
  return { hours, inRoom, avg, peak };
}

// blue → cyan → green → yellow → red
export function heatColor(v) {
  const stops = [[0, [40, 80, 220]], [0.25, [40, 190, 230]], [0.5, [80, 210, 110]], [0.75, [250, 220, 60]], [1, [235, 70, 50]]];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (v <= b) { const u = (v - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * u)); }
  }
  return stops[stops.length - 1][1];
}
