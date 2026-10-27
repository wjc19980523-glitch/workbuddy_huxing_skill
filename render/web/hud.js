// HUD overlay: each frame the active shot returns HTML; helpers here build the recurring pieces.
import { clamp, ease, inv } from './util.js';

export const ACCENT = '#ef6a4c';

export function section(num, zh, en, op = 1) {
  return `<div class="abs sec" style="opacity:${op}"><span class="num mono">${num}</span><span class="zh">${zh}</span><span class="en mono">${en}</span></div>`;
}

// Caption with a per-character reveal (blur → sharp, rising), fading out at t1.
export function caption(t, c) {
  const { t0, t1, zh, en, hl } = c;
  if (t < t0 || t > t1 + 0.3) return '';
  const out = 1 - inv(t1, t1 + 0.3, t);
  const chars = [...zh];
  const hs = hl ? zh.indexOf(hl) : -1, he = hs + (hl ? hl.length : 0);
  let html = '', i = 0;
  for (const ch of chars) {
    const u = ease.cubicOut(inv(t0 + i * 0.045, t0 + i * 0.045 + 0.32, t));
    const cls = i >= hs && i < he && hs >= 0 ? ' class="hl"' : '';
    html += `<span${cls} style="opacity:${u};filter:blur(${(1 - u) * 6}px);transform:translateY(${(1 - u) * 6}px)">${ch === ' ' ? '&nbsp;' : ch}</span>`;
    i++;
  }
  const eu = ease.cubicOut(inv(t0 + 0.35, t0 + 0.9, t));
  return `<div class="abs cap" style="opacity:${out}"><div class="zh">${html}</div><div class="en" style="opacity:${eu}">${en}</div></div>`;
}

// Small dark tag (name + area) anchored at a screen point, popping with a spring.
export function tag(x, y, name, area, u, extra = '') {
  if (u <= 0) return '';
  const s = 0.6 + 0.4 * clamp(u, 0, 1.2);
  return `<div class="abs tag" style="left:${x}px;top:${y - 14}px;opacity:${clamp(u * 1.5)};transform:translate(-50%,-100%) scale(${s})${extra}"><b>${name}</b>${area ? `<i class="mono">${area}</i>` : ''}</div>`;
}

export function fmtArea(a) { return a == null ? '' : `${a.toFixed(1)} ㎡`; }
