// Shot 1 · terminal: a translucent Claude Code window, the prompt typed in.
import { clamp, ease, inv } from './util.js';
import { getProject } from './plan.js';

let PROMPT = '把这张户型图，变成一套能住进去的房子';

export async function init() {
  const proj = getProject();
  PROMPT = proj?.shots?.terminal?.prompt || PROMPT;
}

export function render(t, ctx, shot) {
  const { renderer } = ctx;
  const u = t - shot.t0;
  const dur = shot.t1 - shot.t0;
  renderer.setClearColor('#050505', 1);
  renderer.clear();
  const n = Math.floor(clamp((u - 0.12) / (dur * 0.67)) * PROMPT.length);
  const typed = PROMPT.slice(0, n);
  const blink = (n < PROMPT.length || Math.floor(t * 3.2) % 2 === 0) ? 1 : 0;
  const zoom = 1 + ease.expoIn(inv(dur - 0.25, dur, u)) * 0.35;
  const out = inv(dur - 0.2, dur, u);
  const win = ease.cubicOut(inv(0, 0.25, u));
  const hud = `
  <div class="abs" style="inset:0;background:radial-gradient(ellipse at 50% 42%, #17130f 0%, #070606 60%, #030303 100%)"></div>
  <div class="abs" style="left:186px;top:250px;width:908px;transform:scale(${zoom * (0.98 + 0.02 * win)});transform-origin:40% 50%;opacity:${win * (1 - out)}">
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:12px" class="mono">
      <span><span style="color:#e2603f;font-size:17px">✱</span> <span style="color:#cfc9c2">Claude Code</span></span>
      <span style="color:#6d6863;font-size:12px">opus 5.5 &nbsp;·&nbsp; ~/户型</span>
    </div>
    <div style="border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.035);backdrop-filter:blur(6px);height:90px;display:flex;align-items:center;padding:0 30px;box-shadow:0 20px 60px rgba(0,0,0,.6)">
      <span class="mono" style="color:#e2603f;font-size:26px;font-weight:700;margin-right:24px">&gt;</span>
      <span style="font-size:33px;font-weight:700;color:#f3efe9;letter-spacing:.02em">${typed}</span>
      <span style="display:inline-block;width:17px;height:37px;background:#d8d4ce;margin-left:4px;opacity:${blink}"></span>
    </div>
  </div>`;
  return { hud };
}
