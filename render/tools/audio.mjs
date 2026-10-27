// Synthesises the soundtrack: a soft electronic bed (pad, pulse, hats, arp) and UI sound effects timed to the
// picture, all through one shared room reverb. Writes a 48 kHz stereo WAV: node tools/audio.mjs out.wav
import fs from 'node:fs';

// timeline (mirrors web/main.js + web/s_vr.js): READ 1.5, DRAFT 8.5, BUILD 13.5, TOUR 20.5, SUN after the pull-back
const CLIP_SECS = [1.8, 1.3, 1.5, 1.3, 1.7, 1.3, 1.6, 2.2, 1.3, 1.2, 1.5, 1.7, 1.2, 1.7, 1.5, 2.2];
const CLIP_ROOM = ['客餐厅', '客餐厅', '客餐厅', '入户', '客餐厅', '客餐厅', '厨房', '主卧', '主卧', '主卧', '主卧', '次卧', '次卧', '榻榻米', '主卫', '客卫'];
const TOUR = 20.5, TOUR_END = TOUR + CLIP_SECS.reduce((a, b) => a + b, 0), SUN = TOUR_END + 1.5;
const SR = 48000, DUR = Math.round((SUN + 8.5) * 100) / 100, N = Math.round(SR * DUR);
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function add(bus, t0, len, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i; if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i / n);
    bus[0][k] += v * gl; bus[1][k] += v * gr;
  }
}
// one-pole low-pass state helper for noise colouring
function lpNoise(cut) { let y = 0; const a = Math.exp(-2 * Math.PI * cut / SR); return () => (y = (1 - a) * rnd() + a * y); }
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

// ---------- music ----------
const BEAT = 0.6;                                     // 100 bpm
const CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 59, 64, 67], [55, 59, 62, 66, 69]];
function sectionGain(t) {                             // overall music level along the film
  const pts = [[0, 0.25], [1.5, 0.5], [8.5, 0.75], [13.5, 0.9], [20.3, 0.9], [20.6, 0.6], [24, 0.8], [TOUR_END, 0.85], [SUN, 0.9], [SUN + 5.2, 0.6], [SUN + 6.5, 0.45], [SUN + 7.4, 0.35], [DUR, 0]];
  for (let i = 0; i < pts.length - 1; i++) if (t <= pts[i + 1][0]) { const u = (t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; }
  return 0;
}
// pad
for (let c = 0; c < Math.ceil(DUR / (BEAT * 8)); c++) {
  const t0 = c * BEAT * 8, ch = CHORDS[c % 4];
  ch.forEach((m, j) => {
    const f = mtof(m - 12 + (j === 0 ? -12 : 0)), det = 1 + (j % 2 ? 0.003 : -0.003);
    let lp = 0;
    add(music, t0, BEAT * 8 + 1.2, (t, u) => {
      const a = Math.min(1, t / 1.2) * Math.min(1, (BEAT * 8 + 1.2 - t) / 1.2);
      const saw = ((t * f * det) % 1) * 2 - 1, sin = Math.sin(2 * Math.PI * f * t);
      lp += 0.04 * (saw * 0.35 + sin - lp);
      return lp * a * 0.05 * sectionGain(t0 + t);
    }, 1, (j - 2) * 0.3);
  });
}
// pulse: soft kick on the beat from the CAD shot on
for (let b = 0; b * BEAT < DUR; b++) {
  const t0 = b * BEAT; if (t0 < 8.5 || (t0 > 20.3 && t0 < 21.6) || t0 > SUN + 6.2) continue;
  const g = sectionGain(t0) * (t0 > SUN + 5.0 ? 0.4 : 1);
  add(music, t0, 0.35, t => Math.sin(2 * Math.PI * (48 + 70 * Math.exp(-t * 30)) * t) * env(t, 0.003, 0.12) * 0.32 * g);
}
// hats on the off-beats while the model is built and the sun moves
{ const hp = lpNoise(9000);
  for (let b = 0; b * BEAT / 2 < DUR; b++) {
    const t0 = b * BEAT / 2 + BEAT / 4; if (t0 < 16.0 || t0 > SUN + 5.2 || (t0 > 20.3 && t0 < 23)) continue;
    add(music, t0, 0.08, t => { const n = rnd() - hp(); return n * env(t, 0.001, 0.018) * 0.05 * sectionGain(t0); }, 1, (b % 2) * 0.4 - 0.2);
  }
}
// arp: pentatonic plucks in the furnish and sun shots
for (let b = 0; b * BEAT / 4 < DUR; b++) {
  const t0 = b * BEAT / 4; if (!((t0 > 16.0 && t0 < 20.3) || (t0 > SUN && t0 < SUN + 5.2))) continue;
  const scale = [69, 72, 74, 76, 79, 81]; const m = scale[(b * 7 + Math.floor(b / 8)) % scale.length];
  const f = mtof(m);
  add(music, t0, 0.4, t => Math.sin(2 * Math.PI * f * t) * Math.sin(2 * Math.PI * f * 2 * t) * env(t, 0.002, 0.09) * 0.035, 1, ((b % 4) - 1.5) * 0.3);
}

// ---------- sound effects ----------
function click(t0, g = 0.25, pan = 0) {                // key / UI tick: a short filtered noise burst + body
  const hp = lpNoise(3000);
  add(sfx, t0, 0.05, t => { const n = rnd() - hp(); return (n * 0.6 + Math.sin(2 * Math.PI * 1800 * t) * 0.3) * env(t, 0.0005, 0.008) * g; }, 1, pan);
}
function pop(t0, f = 900, g = 0.22, pan = 0) {          // bubble/wood pop for tags and objects landing
  add(sfx, t0, 0.18, t => Math.sin(2 * Math.PI * (f + f * 0.8 * Math.exp(-t * 60)) * t) * env(t, 0.002, 0.035) * g, 1, pan);
}
function whoosh(t0, len = 0.6, g = 0.35, up = true) {    // band-swept noise
  let y1 = 0, y2 = 0;
  add(sfx, t0 - len * 0.6, len, (t, u) => {
    const c = up ? 300 + 4000 * u * u : 4300 - 4000 * u;
    const a = Math.exp(-2 * Math.PI * c / SR);
    y1 = (1 - a) * rnd() + a * y1; y2 = (1 - a) * y1 + a * y2;
    const e = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 2;
    return (y1 - y2) * 6 * e * g;
  });
}
function impact(t0, g = 0.5) {
  add(sfx, t0, 0.9, t => Math.sin(2 * Math.PI * (38 + 60 * Math.exp(-t * 18)) * t) * env(t, 0.002, 0.25) * g);
  const hp = lpNoise(5000); add(sfx, t0, 0.5, t => (rnd() - hp()) * env(t, 0.001, 0.06) * g * 0.5);
}
function chime(t0, f, g = 0.15, pan = 0) {
  add(sfx, t0, 2.0, t => (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 4)) * env(t, 0.003, 0.5) * g, 1, pan);
}
function swell(t0, len, f0, f1, g = 0.12) {
  add(sfx, t0, len, (t, u) => Math.sin(2 * Math.PI * (f0 + (f1 - f0) * u * u * 0.5) * t) * Math.sin(Math.PI * u) * g);
}

// shot 1: typing
const PROMPT_LEN = 18;
for (let i = 1; i <= PROMPT_LEN; i++) click(0.12 + (i / PROMPT_LEN) * 1.0 - 0.03, 0.22, (i % 3 - 1) * 0.2);
click(1.22, 0.3); whoosh(1.55, 0.7, 0.3);
// shot 2: scan
chime(4.0, 1320, 0.07, -0.4); chime(4.1, 1760, 0.05, 0.4);
swell(4.1, 1.2, 600, 1400, 0.05);
for (let i = 0; i < 4; i++) click(4.3 + i * 0.12, 0.15, i / 2 - 0.75);
whoosh(5.6, 0.8, 0.22, false);
for (let i = 0; i < 9; i++) pop(6.25 + i * 0.12, 700 + i * 40, 0.15, (i % 3 - 1) * 0.4);
whoosh(8.5, 0.9, 0.4);
// shot 3: lines drawing, sheets fanning
for (let i = 0; i < 16; i++) click(8.6 + i * 0.07, 0.07, Math.sin(i) * 0.5);
for (let i = 0; i < 11; i++) pop(9.55 + i * 0.08, 950, 0.08, (i % 2) * 0.6 - 0.3);
whoosh(10.6, 1.0, 0.3); whoosh(12.6, 0.9, 0.3, false);
// shot 4: walls growing, snap to light
{ const lp = lpNoise(180); add(sfx, 13.8, 1.6, (t, u) => lp() * Math.sin(Math.PI * u) * 1.4); }
whoosh(15.55, 0.5, 0.3); impact(15.55, 0.45); chime(15.6, 880, 0.06);
// furniture landing room by room (POP in web/s_house.js)
const POP = [2.45, 2.8, 3.15, 3.45, 3.75, 4.0, 4.2, 4.3, 4.4, 4.5, 4.6, 4.65];
POP.forEach((p, i) => { for (let j = 0; j < 3; j++) pop(13.5 + p + 0.1 + j * 0.07, 500 + j * 90 + i * 15, 0.11, (j % 2) * 0.5 - 0.25); pop(13.5 + p + 0.25, 1200, 0.09); });
// tour: soft whoosh into the walk-through, a cut tick on every picture, a pop + chime when a new room starts
whoosh(TOUR + 0.1, 0.9, 0.35);
{ let t = TOUR; CLIP_SECS.forEach((d, i) => {
  if (i > 0) { const newRoom = CLIP_ROOM[i] !== CLIP_ROOM[i - 1]; click(t, newRoom ? 0.16 : 0.09, (i % 2) * 0.5 - 0.25); if (newRoom) { whoosh(t + 0.05, 0.35, 0.18); } }
  if (i === 0 || CLIP_ROOM[i] !== CLIP_ROOM[i - 1]) { pop(t + 0.15, 1100, 0.12); chime(t + 0.16, [880, 988, 1046, 1175, 1318][i % 5], 0.035); }
  t += d;
}); }
// pull back out to the model
whoosh(TOUR_END + 0.9, 1.4, 0.4);
// sun study: clock ticks, heat-map tags, dusk swell, lights switching on room by room
for (let t = SUN + 0.2; t < SUN + 5.3; t += 0.25) click(t, 0.05, 0.7);
for (let i = 0; i < 7; i++) pop(SUN + 1.6 + i * 0.06, 800, 0.08);
swell(SUN + 4.6, 2.4, 110, 160, 0.08);
for (let i = 0; i < 12; i++) { click(SUN + 5.35 + i * 0.09, 0.1, (i % 3 - 1) * 0.4); }
chime(SUN + 5.4, 659, 0.08, -0.3); chime(SUN + 5.9, 880, 0.06, 0.3); chime(SUN + 6.5, 523, 0.05);

// ---------- one room: Schroeder reverb on both buses ----------
function reverb(inp, mix) {
  const out = [new Float32Array(N), new Float32Array(N)];
  const combs = [1557, 1617, 1491, 1422, 1277, 1356], aps = [225, 556, 441];
  for (let ch = 0; ch < 2; ch++) {
    const x = inp[ch], acc = new Float32Array(N);
    for (const [ci, d0] of combs.entries()) {
      const d = d0 + ch * 23 + ci, buf = new Float32Array(d); let p = 0, lp = 0;
      for (let i = 0; i < N; i++) { const y = buf[p]; lp = y * 0.7 + lp * 0.3; buf[p] = x[i] + lp * 0.8; p = (p + 1) % d; acc[i] += y / combs.length; }
    }
    let y = acc;
    for (const d0 of aps) {
      const d = d0 + ch * 7, buf = new Float32Array(d), o = new Float32Array(N); let p = 0;
      for (let i = 0; i < N; i++) { const b = buf[p]; const v = -0.5 * y[i] + b; buf[p] = y[i] + 0.5 * b; o[i] = v; p = (p + 1) % d; }
      y = o;
    }
    for (let i = 0; i < N; i++) out[ch][i] = x[i] + y[i] * mix;
  }
  return out;
}
const m2 = reverb(music, 0.35), s2 = reverb(sfx, 0.45);
// duck the music a little under effects, sum, soft-clip, normalise
const L = new Float32Array(N), R = new Float32Array(N);
let envF = 0;
for (let i = 0; i < N; i++) {
  const lvl = Math.abs(sfx[0][i]) + Math.abs(sfx[1][i]); envF = Math.max(lvl, envF * 0.9995);
  const duck = 1 - Math.min(0.35, envF * 0.6);
  L[i] = m2[0][i] * duck + s2[0][i]; R[i] = m2[1][i] * duck + s2[1][i];
}
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.7 / peak;
const fadeIn = i => Math.min(1, i / (SR * 0.05)), fadeOut = i => Math.min(1, (N - i) / (SR * 1.5));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const g = norm * fadeIn(i) * fadeOut(i);
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32000), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32000), 46 + i * 4);
}
const out = process.argv[2] || '/tmp/huxing_audio.wav';
fs.writeFileSync(out, buf);
console.log('wrote', out, 'peak', peak.toFixed(3));
