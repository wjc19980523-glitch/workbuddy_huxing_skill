// The 3D apartment built from project.json: walls with openings, windows, doors, floors, ceilings,
// furniture per room, night lights, and line overlays for the BUILD shot.
import * as THREE from 'three';
import * as Plan from './plan.js';
import { makeMaterials, applyPalette, PALETTES } from './materials.js';
import * as F from './furniture.js';

export const CENTER = () => new THREE.Vector3(Plan.W / 2, 0, Plan.D / 2);

export function buildHouse() {
  const proj = Plan.getProject();
  const styleName = proj?.meta?.style || 'mcm';
  const M = makeMaterials(PALETTES[styleName]);
  const root = new THREE.Group();
  const plan = new THREE.Group();
  plan.position.set(-Plan.W / 2, 0, -Plan.D / 2);
  root.add(plan);

  const wallStudio = M.wall;
  const wallDark = new THREE.MeshStandardMaterial({ color: '#262c35', roughness: 0.85 });
  const capMat = M.wallCap;
  const edgeMat = new THREE.LineBasicMaterial({ color: '#dbe8ff', transparent: true, opacity: 1 });
  const doorLineMat = new THREE.LineBasicMaterial({ color: '#ff6a3a', transparent: true, opacity: 1 });

  const walls = [], wallMeshes = [], windows = [], doors = [], doorLines = [];

  for (const [wi, w] of Plan.WALLS.entries()) {
    const ax = w.a[0], az = w.a[1], bx = w.b[0], bz = w.b[1];
    const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    const g = new THREE.Group();
    g.position.set(ax, 0, az);
    g.rotation.y = -ang;
    plan.add(g);
    const ext = w.t / 2;
    const pieces = [];

    const piece = (x0, x1, y0, y1) => {
      if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return;
      const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, w.t);
      const m = new THREE.Mesh(geo, [wallStudio, wallStudio, y1 >= Plan.H - 1e-3 ? capMat : wallStudio, wallStudio, wallStudio, wallStudio]);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      pieces.push(m);
      wallMeshes.push(m);
    };

    const opens = [...w.open].sort((p, q) => p.s - q.s);
    let cur = -ext;

    for (const o of opens) {
      piece(cur, o.s, 0, Plan.H);
      piece(o.s, o.e, 0, o.sill);
      piece(o.s, o.e, o.head, Plan.H);
      cur = o.e;
      const ow = o.e - o.s, mid = (o.s + o.e) / 2;

      if (o.kind === 'window') {
        const wg = new THREE.Group();
        wg.position.set(mid, (o.sill + o.head) / 2, 0);
        g.add(wg);
        const hh = o.head - o.sill, ft = 0.05;
        for (const [x, y, sw, sh] of [[0, hh / 2 - ft / 2, ow, ft], [0, -hh / 2 + ft / 2, ow, ft], [-ow / 2 + ft / 2, 0, ft, hh], [ow / 2 - ft / 2, 0, ft, hh]]) {
          F.box(wg, sw, sh, 0.08, M.frame, x, y, 0);
        }
        const nm = Math.max(1, Math.round(ow / 1.3));
        for (let k = 1; k < nm; k++) F.box(wg, 0.035, hh, 0.07, M.frame, -ow / 2 + k * ow / nm, 0, 0);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(ow - ft, hh - ft), M.glass);
        glass.castShadow = false;
        wg.add(glass);
        windows.push({ group: wg, glass, wall: wi, o });
      } else if (o.kind === 'slide') {
        const dg = new THREE.Group();
        dg.position.set(mid, 0, 0);
        g.add(dg);
        for (const s of [-1, 1]) {
          const pnl = new THREE.Group();
          pnl.position.set(s * ow / 4 + s * ow * 0.12, o.head / 2, s * 0.02);
          dg.add(pnl);
          for (const [x, y, sw, sh] of [[0, o.head / 2 - 0.02, ow / 2, 0.04], [0, -o.head / 2 + 0.02, ow / 2, 0.04], [-ow / 4 + 0.02, 0, 0.04, o.head], [ow / 4 - 0.02, 0, 0.04, o.head]]) {
            F.box(pnl, sw, sh, 0.04, M.frame, x, y, 0);
          }
          const gl = new THREE.Mesh(new THREE.PlaneGeometry(ow / 2 - 0.06, o.head - 0.06), M.glass);
          pnl.add(gl);
        }
        doors.push({ group: dg, o });
      } else if (o.kind === 'door' || o.kind === 'entry') {
        const hinge = new THREE.Group();
        hinge.position.set(o.s + 0.03, 0, 0);
        g.add(hinge);
        F.box(hinge, ow - 0.06, o.head - 0.02, 0.04, o.kind === 'entry' ? M.black : M.door, (ow - 0.06) / 2, (o.head - 0.02) / 2, 0);
        hinge.rotation.y = (o.swing || 1) * 1.35;
        F.box(g, 0.04, o.head, w.t + 0.02, M.door, o.s + 0.02, o.head / 2, 0);
        F.box(g, 0.04, o.head, w.t + 0.02, M.door, o.e - 0.02, o.head / 2, 0);
        F.box(g, ow, 0.05, w.t + 0.02, M.door, mid, o.head - 0.025, 0);
        doors.push({ group: hinge, o });

        const pts = [], sw = o.swing || 1, r = ow;
        for (let k = 0; k <= 20; k++) {
          const a = (k / 20) * Math.PI / 2;
          pts.push(new THREE.Vector3(o.s + Math.cos(a) * r, 0.02, -sw * Math.sin(a) * r));
        }
        const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), doorLineMat);
        const lf = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(o.s, 0.02, 0), new THREE.Vector3(o.s, 0.02, -sw * r)]), doorLineMat);
        g.add(arc, lf);
        doorLines.push(arc, lf);

        const ol = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(ow, o.head, w.t + 0.03)), doorLineMat);
        ol.position.set(mid, o.head / 2, 0);
        g.add(ol);
        doorLines.push(ol);
      }
    }
    piece(cur, len + ext, 0, Plan.H);

    const edges = new THREE.Group();
    g.add(edges);
    for (const m of pieces) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat);
      l.position.copy(m.position);
      edges.add(l);
    }
    walls.push({ group: g, pieces, edges, len, ext: !!w.ext, mid: new THREE.Vector3((ax + bx) / 2 - Plan.W / 2, 0, (az + bz) / 2 - Plan.D / 2) });
  }

  // floors + ceilings
  const floors = [], ceilings = new THREE.Group();
  plan.add(ceilings);
  const slab = F.box(plan, Plan.W + 0.3, 0.16, Plan.D + 0.3, M.wall, Plan.W / 2, -0.08, Plan.D / 2);

  for (const rm of Plan.ROOMS) {
    const [x0, x1, z0, z1] = rm.r;
    const mat = rm.floor === 'tile' ? (rm.id.startsWith('bath') ? M.tileBath : M.tile) : M.floorWood;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    f.rotation.x = -Math.PI / 2;
    f.position.set((x0 + x1) / 2, 0.003, (z0 + z1) / 2);
    f.receiveShadow = true;
    const uv = f.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 2, uv.getY(i) * (z1 - z0) / 2);
    plan.add(f);
    floors.push({ mesh: f, room: rm });

    const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), M.ceiling);
    c.rotation.x = Math.PI / 2;
    c.position.set((x0 + x1) / 2, Plan.H - 0.01, (z0 + z1) / 2);
    ceilings.add(c);
  }
  ceilings.visible = false;

  // furniture from project.json
  const furn = {};
  const put = (id, obj, x, z, r = 0, y = 0) => {
    if (!furn[id]) {
      furn[id] = new THREE.Group();
      plan.add(furn[id]);
      furn[id].userData.items = [];
    }
    obj.position.set(x, y, z);
    obj.rotation.y = r;
    furn[id].add(obj);
    furn[id].userData.items.push(obj);
    return obj;
  };

  const furnList = proj?.furniture || [];
  for (const f of furnList) {
    const p = f.params || {};
    let obj;
    switch (f.type) {
      case 'sofa': obj = F.sofa(M, p.len || 2.3); break;
      case 'lounge_chair': obj = F.loungeChair(M); break;
      case 'arm_chair': obj = F.armChair(M); break;
      case 'coffee_table': obj = F.coffeeTable(M); break;
      case 'credenza': obj = F.credenza(M, p.len || 2.0, p.tv !== false); break;
      case 'floor_lamp': obj = F.floorLamp(M); break;
      case 'pendant': obj = F.pendant(M, p.drop || 0.9, p.r || 0.2, p.globe !== false); break;
      case 'rug': obj = F.rug(M, p.w || 2.0, p.d || 1.5); break;
      case 'plant': obj = F.plant(M, p.h || 1.4); break;
      case 'dining_set': obj = F.diningSet(M); break;
      case 'bed': obj = F.bed(M, p.w || 1.8, p.len || 2.1); break;
      case 'nightstand': obj = F.nightstand(M); break;
      case 'wardrobe': obj = F.wardrobe(M, p.w || 1.6, p.h || 2.3, p.d || 0.6); break;
      case 'desk': obj = F.desk(M, p.w || 1.3); break;
      case 'bench': obj = F.bench(M, p.w || 1.2); break;
      case 'art': obj = F.art(M, p.i || 0, p.w || 0.6, p.h || 0.8); break;
      case 'kitchen_run': obj = F.kitchenRun(M, p.len || 2.8, p.uppers !== false); break;
      case 'hob': obj = F.hob(M); break;
      case 'sink': obj = F.sink(M); break;
      case 'fridge': obj = F.fridge(M); break;
      case 'toilet': obj = F.toilet(M); break;
      case 'vanity': obj = F.vanity(M, p.w || 0.9); break;
      case 'shower': obj = F.shower(M, p.w || 0.9, p.d || 0.9); break;
      case 'washer': obj = F.washer(M); break;
      case 'shoe_cabinet': obj = F.shoeCabinet(M, p.w || 1.1); break;
      case 'shelves': obj = F.shelves(M, p.w || 1.0, p.h || 2.2); break;
      default: continue;
    }
    const placed = put(f.room, obj, f.x, f.z, f.rotation || 0, 0);
    if (f.scale && f.scale !== 1) placed.scale.setScalar(f.scale);
  }

  // night: warm room lights + glowing windows
  const nightLights = new THREE.Group();
  plan.add(nightLights);
  for (const rm of Plan.ROOMS) {
    const [x0, x1, z0, z1] = rm.r;
    const pl = new THREE.PointLight('#ffb36b', 0, 7, 1.6);
    pl.position.set((x0 + x1) / 2, Plan.H - 0.5, (z0 + z1) / 2);
    nightLights.add(pl);
  }

  root.traverse(o => { if (o.isMesh && o.material !== M.glass) o.castShadow = o.castShadow !== false; });

  const api = {
    root, plan, M, walls, wallMeshes, windows, doors, doorLines, floors, ceilings, furn, nightLights, slab, edgeMat, doorLineMat,
    style: styleName,
    setStyle(name) {
      if (api.style === name) return;
      applyPalette(M, PALETTES[name]);
      api.style = name;
      api.setMode(api.mode, true);
    },
    mode: 'studio',
    setMode(mode, force) {
      if (api.mode === mode && !force) return;
      api.mode = mode;
      const dark = mode === 'dark';
      for (const m of wallMeshes) m.material = [dark ? wallDark : wallStudio, dark ? wallDark : wallStudio, capMat, dark ? wallDark : wallStudio, dark ? wallDark : wallStudio, dark ? wallDark : wallStudio];
      for (const w of walls) w.edges.visible = dark;
      for (const d of doorLines) d.visible = dark;
      for (const f of floors) f.mesh.visible = !dark;
      for (const k in furn) furn[k].visible = !dark;
      for (const w of windows) w.group.visible = !dark;
      for (const d of doors) d.group.visible = !dark;
      slab.visible = !dark;
    },
    setNight(k) {
      M.bulb.emissiveIntensity = k * 6;
      M.lampShade.emissiveIntensity = k * 1.2;
      for (const l of nightLights.children) l.intensity = k * 5;
      M.glass.emissive = M.glass.emissive || new THREE.Color();
      M.glass.emissive.set('#ffb060');
      M.glass.emissiveIntensity = k * 0.9;
    },
  };
  api.setMode('studio', true);
  return api;
}
