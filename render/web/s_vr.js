// Shot VR · Tour: the user's VR walk-through images, room by room, Ken Burns, then pull back to the 3D model.
import { clamp, ease, inv, lerp, spring, hand } from './util.js';
import { section, tag } from './hud.js';
import { renderPose, orbitPose } from './s_house.js';

let CLIPS = [], T0 = 20.5, PULL = 1.5, END = 0, SUN_START = 0;
let starts = [], imgs = {};
const EN = {
  '客餐厅': 'LIVING · DINING', '入户': 'ENTRY', '厨房': 'KITCHEN', '主卧': 'MASTER',
  '次卧': 'BEDROOM', '榻榻米房间': 'TATAMI', '主卫': 'MASTER BATH', '客卫': 'GUEST BATH',
  '书房': 'STUDY', '阳台': 'BALCONY', '卫生间': 'BATH'
};

export function setImages(list) {
  CLIPS = list.map(img => [
    img.file.replace(/\.[^.]+$/, ''),
    img.duration || 1.5,
    img.tag_anchor || 0,
    img.push_dir || 1,
    img.room,
    img.area_m2
  ]);
  END = CLIPS.reduce((t, c) => t + c[1], T0);
}
export function setT0(t) { T0 = t; END = CLIPS.reduce((s, c) => s + c[1], T0); }
export function setSunStart(t) { SUN_START = t; }
export { T0, END, SUN_START, PULL };

function load(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

export async function init() {
  let t = T0;
  for (const c of CLIPS) {
    starts.push(t);
    t += c[1];
    try {
      imgs[c[0]] = await load(`/web/vr/${encodeURI(c[0])}.jpg`);
    } catch (e) {
      console.warn('VR image not found:', c[0]);
      imgs[c[0]] = null;
    }
  }
}

const roomOf = name => name.split('-')[1] || name;

function kb(i, u) {
  const [, dur, , dir] = CLIPS[i];
  const k = ease.sineInOut(u / dur) * 0.6 + (u / dur) * 0.4;
  const s = 0.8 * (dir > 0 ? lerp(1.0, 1.075, k) : lerp(1.075, 1.0, k));
  const px = (i % 3 - 1) * 18 * (k - 0.5), py = -6 * (k - 0.5);
  return { s, x: 640 - 800 * s + px, y: 360 - 450 * s + py };
}

export function render(t, ctx) {
  const { renderer, fxg } = ctx;
  let i = starts.findIndex((s, j) => t >= s && t < s + CLIPS[j][1]);
  let hud = '';

  if (t >= END) {
    const u = (t - END) / PULL, k = ease.cubicInOut(u);
    const pose = keyPose(k);
    renderPose(ctx, pose, lerp(48, 32, k));
    const last = CLIPS.length - 1;
    if (last >= 0 && imgs[CLIPS[last][0]]) {
      const tr = kb(last, CLIPS[last][1]);
      const sc = lerp(1, 0.35, ease.cubicOut(u)), a = 1 - ease.cubicOut(inv(0.1, 0.55, u));
      fxg.save(); fxg.globalAlpha = a; fxg.translate(640, 360); fxg.scale(sc, sc); fxg.translate(-640, -360);
      fxg.drawImage(imgs[CLIPS[last][0]], tr.x, tr.y, 1600 * tr.s, 900 * tr.s); fxg.restore();
    }
    hud += section('04', '漫游', 'TOUR', 1 - inv(0.2, 0.6, u));
    return { hud, light: u > 0.6 };
  }

  if (i < 0) i = 0;
  const u = t - starts[i], c = CLIPS[i], tr = kb(i, u);
  renderer.setClearColor('#000', 1); renderer.clear();

  if (imgs[c[0]]) {
    fxg.drawImage(imgs[c[0]], tr.x, tr.y, 1600 * tr.s, 900 * tr.s);
  } else {
    fxg.fillStyle = '#111'; fxg.fillRect(0, 0, 1280, 720);
    fxg.fillStyle = '#666'; fxg.font = '24px sans-serif'; fxg.textAlign = 'center';
    fxg.fillText(`VR image not found: ${c[0]}`, 640, 360);
    fxg.textAlign = 'left';
  }

  const room = c[4] || roomOf(c[0]);
  const newRoom = i === 0 || (CLIPS[i - 1][4] || roomOf(CLIPS[i - 1][0])) !== room;
  if (newRoom && i > 0) {
    const f = 1 - inv(0, 0.18, u);
    if (f > 0) { fxg.fillStyle = `rgba(255,250,242,${f * 0.35})`; fxg.fillRect(0, 0, 1280, 720); }
  }

  const vg = fxg.createRadialGradient(640, 360, 300, 640, 360, 820);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  fxg.fillStyle = vg; fxg.fillRect(0, 0, 1280, 720);
  const top = fxg.createLinearGradient(0, 0, 0, 140);
  top.addColorStop(0, 'rgba(0,0,0,0.35)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  fxg.fillStyle = top; fxg.fillRect(0, 0, 1280, 140);
  const bot = fxg.createLinearGradient(0, 560, 0, 720);
  bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, 'rgba(0,0,0,0.45)');
  fxg.fillStyle = bot; fxg.fillRect(0, 560, 1280, 160);

  hud += section('04', '漫游', 'TOUR', ease.cubicOut(inv(T0, T0 + 0.4, t)));

  let j = i;
  while (j > 0 && (CLIPS[j - 1][4] || roomOf(CLIPS[j - 1][0])) === room) j--;
  const since = t - starts[j], anchor = CLIPS[j][2] || [0.5, 0.36];
  const roomEnd = (() => {
    let e = j;
    while (e + 1 < CLIPS.length && (CLIPS[e + 1][4] || roomOf(CLIPS[e + 1][0])) === room) e++;
    return starts[e] + CLIPS[e][1];
  })();
  const s = spring(since - 0.12, 2.3, 0.5) * (1 - inv(roomEnd - 0.25, roomEnd - 0.05, t));
  const area = c[5];
  const ax = Array.isArray(anchor) ? tr.x + anchor[0] * 1600 * tr.s : 640;
  const ay = Array.isArray(anchor) ? tr.y + anchor[1] * 900 * tr.s : 250;
  if (i === j) hud += tag(ax, ay, room, area != null ? `${area.toFixed(1)} ㎡` : '', s);
  else hud += tag(640, 250, room, area != null ? `${area.toFixed(1)} ㎡` : '', s);

  const stop = new Set(CLIPS.slice(0, i + 1).map(q => q[0].slice(0, 2))).size;
  const total = new Set(CLIPS.map(q => q[0].slice(0, 2))).size;
  hud += `<div class="abs" style="right:52px;top:42px;text-align:right;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.4)">
    <div class="mono" style="font-size:28px;font-weight:300;letter-spacing:.06em">${String(stop).padStart(2, '0')}<span style="opacity:.45;font-size:14px"> / ${total}</span></div>
    <div style="font-size:12px;margin-top:4px;font-weight:600">${room} <span class="mono" style="font-size:9px;opacity:.6">${EN[room] || ''}</span></div>
    <div style="width:180px;height:1px;background:rgba(255,255,255,.3);margin:8px 0 0 auto"><div style="height:1px;width:${(stop / total) * 100}%;background:#ef6a4c"></div></div></div>`;
  return { hud, veil: 0 };
}

function keyPose(k) {
  const a = [2.135, 3.2, 2.52, 2.135, 0.6, 2.52];
  const b = orbitPose(332, 48, 26.5);
  return a.map((v, n) => lerp(v, b[n], k));
}
