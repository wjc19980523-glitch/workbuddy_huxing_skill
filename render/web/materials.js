// Procedural textures and the two material palettes (mid-century / cream).
import * as THREE from 'three';
import { rng } from './util.js';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, rep = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Long wood grain: streaky noise along x.
export function woodTexture(base, dark, seed = 1, w = 512, h = 512, planks = 0) {
  const c = canvas(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const y = r() * h, a = 0.03 + r() * 0.09, th = 0.5 + r() * 2.5, amp = 2 + r() * 6, f = 0.004 + r() * 0.01, ph = r() * 9;
    g.strokeStyle = dark; g.globalAlpha = a; g.lineWidth = th; g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * f + ph) * amp);
    g.stroke();
  }
  g.globalAlpha = 1;
  if (planks) {
    const ph = h / planks;
    for (let p = 0; p < planks; p++) {
      const off = r() * w;
      g.fillStyle = `rgba(${r() < 0.5 ? '255,240,220' : '40,20,10'},${0.04 + r() * 0.06})`;
      g.fillRect(0, p * ph, w, ph);
      g.fillStyle = 'rgba(30,15,5,0.35)'; g.fillRect(0, p * ph, w, 1.5);
      g.fillRect(off, p * ph, 1.5, ph);
    }
  }
  return c;
}

// Woven cane / rattan: octagonal weave pattern.
export function caneTexture(base = '#c9a46a', line = '#8a6a3a') {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#2a1d12'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = base; g.lineWidth = 5;
  for (let i = -256; i < 512; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
  }
  g.lineWidth = 4; g.strokeStyle = line;
  for (let i = 0; i < 256; i += 16) {
    g.beginPath(); g.moveTo(0, i + 8); g.lineTo(256, i + 8); g.stroke();
    g.beginPath(); g.moveTo(i + 8, 0); g.lineTo(i + 8, 256); g.stroke();
  }
  return c;
}

export function tileTexture(base = '#d9d4cc', grout = '#b8b2a8', n = 4) {
  const c = canvas(256, 256), g = c.getContext('2d'), r = rng(7);
  const s = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = (r() - 0.5) * 10;
    g.fillStyle = shade(base, v); g.fillRect(i * s, j * s, s, s);
  }
  g.strokeStyle = grout; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke(); }
  return c;
}

export function rugTexture(style) {
  const c = canvas(512, 512), g = c.getContext('2d'), r = rng(3);
  const cream = style === 'cream';
  g.fillStyle = cream ? '#efe7da' : '#d8c8ad'; g.fillRect(0, 0, 512, 512);
  // fibre noise
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${cream ? '120,100,80' : '90,60,30'},${r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  if (!cream) {
    g.strokeStyle = '#a3542f'; g.lineWidth = 10; g.strokeRect(30, 30, 452, 452);
    g.strokeStyle = '#6f6b3a'; g.lineWidth = 4; g.strokeRect(52, 52, 408, 408);
    g.fillStyle = '#c8962e'; g.globalAlpha = 0.8;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(130 + k * 84, 256, 22, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  } else {
    g.strokeStyle = '#ddd2c1'; g.lineWidth = 6; g.strokeRect(36, 36, 440, 440);
  }
  return c;
}

// Mid-century abstract print for the walls.
export function artTexture(seed, style) {
  const c = canvas(384, 512), g = c.getContext('2d'), r = rng(seed);
  const cream = style === 'cream';
  g.fillStyle = cream ? '#f4efe6' : '#efe4cf'; g.fillRect(0, 0, 384, 512);
  const pal = cream ? ['#d9cbb6', '#c4b49c', '#e6dccb', '#b9a78e'] : ['#b55a3a', '#c8962e', '#6f6b3a', '#2f3b3a', '#d9a77a'];
  for (let i = 0; i < 5; i++) {
    g.fillStyle = pal[i % pal.length]; g.globalAlpha = 0.95;
    const x = 60 + r() * 260, y = 80 + r() * 340, s = 40 + r() * 90;
    if (i % 3 === 0) { g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
    else if (i % 3 === 1) { g.beginPath(); g.arc(x, y, s, Math.PI, 0); g.fill(); }
    else g.fillRect(x - s / 2, y - s, s * 0.6, s * 2);
  }
  g.globalAlpha = 1; g.strokeStyle = '#2b2520'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(40, 440); g.bezierCurveTo(140, 380, 240, 500, 344, 420); g.stroke();
  return c;
}

export function fabricTexture(base, seed = 5) {
  const c = canvas(256, 256), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.07})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
  return c;
}

function shade(hex, v) {
  const n = parseInt(hex.slice(1), 16);
  const f = x => Math.max(0, Math.min(255, x + v)) | 0;
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Palettes ---------------------------------------------------------------
export const PALETTES = {
  mcm: {
    wall: '#efe8dc', ceiling: '#f2ede4', floor: ['#a5764c', '#5e3b20'], wood: ['#6e4429', '#3a2112'], woodLight: ['#9a6539', '#5a3518'],
    sofa: '#c9b393', cushionA: '#6f6b3a', cushionB: '#c8962e', cushionC: '#b55a3a', leather: '#93542b',
    bedding: '#f1ebe0', throw: '#6f6b3a', cane: '#c9a46a', cabinet: '#e9e1d2', counter: '#d8d0c4', accent: '#b55a3a',
    rugStyle: 'mcm', metal: '#b08d57', lampShade: '#f3e6c8',
  },
  cream: {
    wall: '#f4efe7', ceiling: '#f6f2ec', floor: ['#cdb391', '#9c7f5c'], wood: ['#d6bf9c', '#a88d68'], woodLight: ['#dcc7a6', '#b29672'],
    sofa: '#ece3d4', cushionA: '#e2d5c0', cushionB: '#d8c6a8', cushionC: '#cdbb9f', leather: '#e5d9c6',
    bedding: '#f6f1e8', throw: '#dccbb0', cane: '#e3d3b6', cabinet: '#f1ebe1', counter: '#ebe5dc', accent: '#cdb89a',
    rugStyle: 'cream', metal: '#cbb48a', lampShade: '#f7efe0',
  },
};

// Builds the material set for a palette; materials are created once and mutated on style swaps.
export function makeMaterials(pal) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    wall: std({ color: pal.wall, roughness: 0.92 }),
    wallCap: std({ color: '#2b2622', roughness: 0.8 }),
    ceiling: std({ color: pal.ceiling, roughness: 0.95 }),
    floorWood: std({ map: tex(woodTexture(pal.floor[0], pal.floor[1], 11, 1024, 1024, 8), [0.6, 0.6]), roughness: 0.6 }),
    tile: std({ map: tex(tileTexture('#d8d3cb', '#bcb6ac', 4), [1.2, 1.2]), roughness: 0.45 }),
    tileBath: std({ map: tex(tileTexture('#e3e0da', '#c9c4bb', 6), [1, 1]), roughness: 0.3 }),
    wood: std({ map: tex(woodTexture(pal.wood[0], pal.wood[1], 21), [1, 1]), roughness: 0.5 }),
    woodLight: std({ map: tex(woodTexture(pal.woodLight[0], pal.woodLight[1], 31), [1, 1]), roughness: 0.55 }),
    sofa: std({ map: tex(fabricTexture(pal.sofa, 1)), roughness: 0.95 }),
    cushionA: std({ map: tex(fabricTexture(pal.cushionA, 2)), roughness: 0.95 }),
    cushionB: std({ map: tex(fabricTexture(pal.cushionB, 3)), roughness: 0.95 }),
    cushionC: std({ map: tex(fabricTexture(pal.cushionC, 4)), roughness: 0.95 }),
    leather: std({ color: pal.leather, roughness: 0.42 }),
    bedding: std({ map: tex(fabricTexture(pal.bedding, 6)), roughness: 0.95 }),
    throw: std({ map: tex(fabricTexture(pal.throw, 7)), roughness: 0.95 }),
    cane: std({ map: tex(caneTexture(pal.cane), [2, 2]), roughness: 0.7 }),
    cabinet: std({ color: pal.cabinet, roughness: 0.55 }),
    counter: std({ color: pal.counter, roughness: 0.3 }),
    rug: std({ map: tex(rugTexture(pal.rugStyle)), roughness: 1 }),
    metal: std({ color: pal.metal, roughness: 0.3, metalness: 0.85 }),
    black: std({ color: '#1d1b19', roughness: 0.5 }),
    steel: std({ color: '#c9c9c6', roughness: 0.25, metalness: 0.9 }),
    ceramic: std({ color: '#f4f2ee', roughness: 0.15 }),
    terracotta: std({ color: '#a8583a', roughness: 0.85 }),
    plant: std({ color: '#4c5e33', roughness: 0.75, side: THREE.DoubleSide }),
    plantDark: std({ color: '#33452a', roughness: 0.75, side: THREE.DoubleSide }),
    lampShade: std({ color: pal.lampShade, roughness: 0.9, emissive: '#ffd9a0', emissiveIntensity: 0 }),
    bulb: std({ color: '#fff4e0', emissive: '#ffe2b0', emissiveIntensity: 0, roughness: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#dfe9ee', roughness: 0.05, transmission: 1, thickness: 0.01, ior: 1.5, transparent: true, opacity: 0.25 }),
    frame: std({ color: '#2a2724', roughness: 0.5, metalness: 0.3 }),
    door: std({ map: tex(woodTexture(pal.woodLight[0], pal.woodLight[1], 41), [1, 1]), roughness: 0.55 }),
    accent: std({ color: pal.accent, roughness: 0.8 }),
    book: std({ color: '#3e4a44', roughness: 0.8 }),
    art: [1, 2, 3, 4].map(s => std({ map: tex(artTexture(s, pal.rugStyle)), roughness: 0.9 })),
    screen: std({ color: '#0d0e10', roughness: 0.2, metalness: 0.2 }),
  };
  return M;
}

// Copies colours / maps of a palette onto existing materials (used for the style swap).
const freshCache = new Map();
export function applyPalette(M, pal) {
  if (!freshCache.has(pal)) freshCache.set(pal, makeMaterials(pal));
  const fresh = freshCache.get(pal);
  for (const k of Object.keys(M)) {
    if (Array.isArray(M[k])) { M[k].forEach((m, i) => m.copy(fresh[k][i])); continue; }
    const emissiveIntensity = M[k].emissiveIntensity;
    M[k].copy(fresh[k]);
    if (emissiveIntensity !== undefined) M[k].emissiveIntensity = emissiveIntensity;
    M[k].needsUpdate = true;
  }
}
