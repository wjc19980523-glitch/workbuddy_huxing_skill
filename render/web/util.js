// Small deterministic helpers: seeded random, clamps, easing curves, keyframe sampling.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };

const EXPO = 1 - Math.pow(2, -10);
export const ease = {
  linear: u => clamp(u),
  smooth,
  sineInOut: u => -(Math.cos(Math.PI * clamp(u)) - 1) / 2,
  cubicInOut: u => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
  quintInOut: u => { u = clamp(u); return u < 0.5 ? 16 * u ** 5 : 1 - Math.pow(-2 * u + 2, 5) / 2; },
  cubicIn: u => Math.pow(clamp(u), 3),
  cubicOut: u => 1 - Math.pow(1 - clamp(u), 3),
  quartOut: u => 1 - Math.pow(1 - clamp(u), 4),
  expoOut: u => (u <= 0 ? 0 : u >= 1 ? 1 : (1 - Math.pow(2, -10 * u)) / EXPO),
  expoIn: u => (u <= 0 ? 0 : u >= 1 ? 1 : (Math.pow(2, 10 * u) - 1) / 1023),
  expoInOut: u => (u < 0.5 ? ease.expoIn(2 * u) / 2 : 1 - ease.expoIn(2 - 2 * u) / 2),
  backOut: u => { u = clamp(u); const s = 1.70158; return 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); },
};

// Damped spring step response (pop-ins with a little overshoot).
export function spring(u, freq = 2.2, damp = 0.42) {
  if (u <= 0) return 0;
  const w = 2 * Math.PI * freq, z = damp;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u));
}

// Sample keyframes [{t, v:[...]}] with an ease per segment (default cubicInOut).
export function keys(t, ks, e = ease.cubicInOut) {
  if (t <= ks[0].t) return ks[0].v.slice();
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (t <= b.t) {
      const u = (b.e || e)((t - a.t) / (b.t - a.t));
      return a.v.map((x, j) => x + (b.v[j] - x) * u);
    }
  }
  return ks[ks.length - 1].v.slice();
}

// A slow two-sine "hand" drift for operated cameras.
export function hand(t, amp = 1, seed = 0) {
  return [Math.sin(t * 0.73 + seed) * 0.6 + Math.sin(t * 1.31 + seed * 2) * 0.4, Math.sin(t * 0.57 + seed * 3) * 0.6 + Math.sin(t * 1.17 + seed) * 0.4].map(v => v * amp);
}
