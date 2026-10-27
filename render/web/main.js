// Composition entry: one timeline, every frame a pure function of t (window.__seek).
// All project data loaded from project.json passed via ?project= query param.
import * as THREE from 'three';
import * as Plan from './plan.js';
import { buildStudio } from './studio.js';
import * as S1 from './s1_terminal.js';
import * as S2 from './s2_scan.js';
import * as S3 from './s3_cad.js';
import * as SH from './s_house.js';
import * as VR from './s_vr.js';
import { caption } from './hud.js';

export const FPS = 30;
let DUR = 55;
let SHOTS = [];
let CAPTIONS = [];

const canvas = document.getElementById('gl');
const fx = document.getElementById('fx');
const hudEl = document.getElementById('hud');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(1280, 720, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const ctx = { THREE, renderer, fx, fxg: fx.getContext('2d'), W: 1280, H: 720 };

async function loadProject() {
  const params = new URLSearchParams(location.search);
  const projectPath = params.get('project') || '../examples/this_plan/project.json';
  const resp = await fetch(projectPath);
  const project = await resp.json();
  Plan.setProject(project);
  return project;
}

function buildTimeline(project) {
  const shots = project.shots || {};
  let t = 0;
  const list = [];

  if (shots.terminal?.enabled !== false) {
    const dur = shots.terminal?.duration || 1.5;
    list.push({ t0: t, t1: t + dur, m: S1 });
    t += dur;
  }
  if (shots.scan?.enabled !== false) {
    const dur = shots.scan?.duration || 7;
    list.push({ t0: t, t1: t + dur, m: S2 });
    t += dur;
  }
  if (shots.cad?.enabled !== false) {
    const dur = shots.cad?.duration || 5;
    list.push({ t0: t, t1: t + dur, m: S3 });
    t += dur;
  }
  if (shots.build?.enabled !== false) {
    const dur = shots.build?.duration || 7;
    list.push({ t0: t, t1: t + dur, m: SH, part: 'build' });
    t += dur;
  }

  // VR tour timing depends on image list
  const vrImages = project.vr_images || [];
  if (shots.tour?.enabled !== false && vrImages.length > 0) {
    VR.setImages(vrImages);
    const vrDur = vrImages.reduce((s, img) => s + (img.duration || 1.5), 0) + 1.5;
    VR.setT0(t);
    list.push({ t0: t, t1: t + vrDur, m: VR });
    t += vrDur;
  }

  // Sun study
  if (shots.sun?.enabled !== false) {
    const dur = shots.sun?.duration || 8.5;
    VR.setSunStart(t);
    list.push({ t0: t, t1: t + dur + 1, m: SH, part: 'sun' });
    t += dur;
  }

  return { shots: list, duration: t };
}

const inits = new Set();
async function initAll() {
  for (const s of SHOTS) if (!inits.has(s.m)) { inits.add(s.m); await s.m.init(ctx); }
}

async function main() {
  const project = await loadProject();
  ctx.studio = buildStudio(renderer);

  const timeline = buildTimeline(project);
  SHOTS = timeline.shots;
  DUR = timeline.duration;
  CAPTIONS = project.captions || [];

  window.__meta = { dur: DUR, fps: FPS };
  window.__seek = async (t) => {
    const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
    ctx.fxg.clearRect(0, 0, 1280, 720);
    fx.style.opacity = 1;
    canvas.style.opacity = 1;
    canvas.style.filter = 'none';
    const r = (await shot.m.render(t, ctx, shot)) || {};
    const light = !!r.light;
    hudEl.className = light ? 'light' : '';
    const veil = r.veil ? `<div class="abs" style="inset:0;background:#000;opacity:${r.veil}"></div>` : '';
    hudEl.innerHTML = (r.hud || '') + CAPTIONS.map(c => caption(t, c)).join('') + veil;
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    return true;
  };

  console.log("init start");
  await initAll();
  console.log("init done");

  // warm-up
  const warmTimes = [0.5, 3, 10, 15, 19, 22];
  if (SHOTS.length > 4) warmTimes.push(SHOTS[4].t0 + 0.5);
  if (SHOTS.length > 5) warmTimes.push(SHOTS[5].t0 + 2);
  for (const t of warmTimes) {
    const t0 = performance.now();
    await window.__seek(Math.min(t, DUR - 0.1));
    console.log("warm", t, Math.round(performance.now() - t0));
  }
  window.__ready = true;
}

main();
