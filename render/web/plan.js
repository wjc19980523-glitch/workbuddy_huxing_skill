// Floor plan geometry loaded from project.json at runtime.
// All geometry values come from the project config — nothing hardcoded here.

let _project = null;
export function setProject(p) { _project = p; compute(); }
export function getProject() { return _project; }

// Computed geometry (populated after setProject)
export let W = 0, D = 0, H = 0, EXT = 0, INT = 0;
export let DIMS = { top: [], bottom: [], left: [], right: [] };
export let GRID = { X: {}, Z: {} };
export let WALLS = [];
export let ROOMS = [];
export let AREA_TABLE = [];
export let TOTAL_AREA = 0;
export let TITLE = '', GROSS = 0;
export let SUNRISE = 5.2, SUNSET = 18.8;

function compute() {
  if (!_project) return;
  const g = _project.geometry;
  W = g.width_m;
  D = g.depth_m;
  H = g.height_m || 2.8;
  EXT = g.wall_ext_m || 0.24;
  INT = g.wall_int_m || 0.12;
  DIMS = {
    top: g.dims_top || [],
    bottom: g.dims_bottom || [],
    left: g.dims_left || [],
    right: g.dims_right || [],
  };

  // Build walls from project config
  WALLS = (_project.walls || []).map(w => ({
    a: w.a,
    b: w.b,
    t: w.thickness,
    ext: !!w.exterior,
    open: (w.openings || []).map(o => ({
      kind: o.kind,
      s: o.start,
      e: o.end,
      sill: o.sill ?? 0,
      head: o.head ?? 2.15,
      swing: o.swing ?? 1,
    })),
  }));

  // Build rooms from project config
  ROOMS = (_project.rooms || []).map(r => ({
    id: r.id,
    zh: r.name_zh,
    en: r.name_en || r.name_zh.toUpperCase(),
    r: r.bounds,
    floor: r.floor_type || 'wood',
    tag: r.tag_pos || [(r.bounds[0] + r.bounds[1]) / 2, (r.bounds[2] + r.bounds[3]) / 2],
    area: r.area_m2 ?? null,
  }));

  // Area table
  AREA_TABLE = _project.area_table || ROOMS.filter(r => r.area != null).map(r => [r.zh, r.area]);
  TOTAL_AREA = +AREA_TABLE.reduce((s, row) => s + row[1], 0).toFixed(1);

  // Meta
  TITLE = _project.meta.title;
  GROSS = _project.meta.gross_area_m2;

  // Compute grid lines from rooms for compatibility
  const xs = new Set(), zs = new Set();
  for (const r of ROOMS) {
    xs.add(r.r[0]); xs.add(r.r[1]);
    zs.add(r.r[2]); zs.add(r.r[3]);
  }
  GRID.X = Object.fromEntries([...xs].sort((a, b) => a - b).map((v, i) => [`x${i}`, v]));
  GRID.Z = Object.fromEntries([...zs].sort((a, b) => a - b).map((v, i) => [`z${i}`, v]));
}

export const room = id => ROOMS.find(r => r.id === id);

// Sun direction for a given hour (simple solar model).
// Latitude and orientation come from project.json.
export function sunDir(hour) {
  const lat = ((_project?.meta?.latitude) || 30) * Math.PI / 180;
  const decl = 15 * Math.PI / 180;
  const ha = (hour - 12) * 15 * Math.PI / 180;
  const alt = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha));
  let az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat)))));
  if (ha > 0) az = 2 * Math.PI - az;
  const n = Math.cos(az), e = Math.sin(az);
  return { x: n * Math.cos(alt), y: Math.sin(alt), z: e * Math.cos(alt), alt };
}
