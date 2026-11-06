// A rear-extension kitchen in a British terrace, at dusk. All dimensions are in
// metres. Passes: dusk (always on), pendants, downlights, joinery.
// Fittings are placed as they would be on site: socket plates are 146 x 86 mm,
// the switch plate sits at about 1.2 m, and the drawn cable routes in
// routes() run in ceiling voids and straight drops.
const FLOOR = 0, CEIL = 2.65, LEFT = -3, RIGHT = 3, BACK = -2.4, FRONT = 7.5;

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t) => t * t * (3 - 2 * t);
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.2;

export const circuits = {
  pendants: { way: 3, label: "Island pendants" },
  downlights: { way: 4, label: "Downlights" },
  joinery: { way: 5, label: "Joinery and plinth" },
};

export default function scene() {
  const prims = [];
  const emitters = [];
  const mat = {
    plaster: { a: [0.72, 0.71, 0.68], rough: 0.5, f0: 0.02, spec: 0 },
    ceiling: { a: [0.8, 0.8, 0.78], spec: 0 },
    joinery: { a: [0.045, 0.075, 0.1], rough: 0.32, f0: 0.04 },
    joineryEdge: { a: [0.01, 0.012, 0.015], spec: 0 },
    frame: { a: [0.012, 0.012, 0.014], rough: 0.25, f0: 0.05 },
    steel: { a: [0.66, 0.66, 0.65], metal: true, rough: 0.2 },
    brass: { a: [0.72, 0.52, 0.27], metal: true, rough: 0.18 },
    faceplate: { a: [0.78, 0.78, 0.76], metal: true, rough: 0.16 },
    white: { a: [0.86, 0.86, 0.84], rough: 0.1, f0: 0.05 },
    dark: { a: [0.03, 0.03, 0.032], spec: 0 },
    flex: { a: [0.02, 0.02, 0.02], spec: 0 },
    outside: { a: [0.03, 0.04, 0.05], spec: 0 },
    stool: { a: [0.26, 0.16, 0.09], rough: 0.35, f0: 0.04 },
    shelf: { a: [0.34, 0.21, 0.11], rough: 0.4, f0: 0.04 },
    glass: { glass: true },
  };
  mat.oak = {
    rough: 0.16, f0: 0.05,
    tex(x, y, z, nx, ny, nz, o) {
      // Herringbone would be showing off: straight 180 mm boards.
      const bw = 0.18, row = Math.floor(x / bw), joint = 1.9 + hash(row, 3) * 0.8;
      const off = hash(row, 9) * 3;
      const seg = Math.floor((z + off) / joint);
      const u = x / bw - row, v = (z + off) / joint - seg;
      const seam = u < 0.012 || v < 0.002 ? 0.42 : 1;
      const tone = 0.86 + hash(row, seg) * 0.26;
      const grain = 0.82 + 0.3 * fbm(x * 90 + hash(row, seg) * 40, z * 5);
      const k = seam * tone * grain;
      o[0] = 0.40 * k; o[1] = 0.27 * k; o[2] = 0.16 * k;
    },
  };
  mat.stone = {
    rough: 0.08, f0: 0.05,
    tex(x, y, z, nx, ny, nz, o) {
      const a = Math.abs(ny) > 0.5 ? x : x + z, b = Math.abs(ny) > 0.5 ? z : y;
      const c = fbm(a * 1.1 + 3, b * 1.1 + 7);
      const vein = Math.abs(fbm(a * 3.1 + c * 2.5, b * 1.4 - c * 2.5) - 0.5);
      const v = Math.min(1, vein * 9);
      const k = 0.66 + 0.05 * v + 0.05 * c + 0.012 * fbm(a * 40, b * 40);
      o[0] = k * 0.98; o[1] = k * 0.96; o[2] = k * 0.92;
    },
  };
  mat.plasterTex = {
    spec: 0,
    tex(x, y, z, nx, ny, nz, o) {
      const a = Math.abs(nx) > 0.5 ? z : x, b = Math.abs(ny) > 0.5 ? z : y;
      const k = 0.69 + 0.05 * fbm(a * 1.4, b * 1.4) + 0.012 * fbm(a * 30, b * 30);
      o[0] = k; o[1] = k * 0.985; o[2] = k * 0.95;
    },
  };

  const box = (min, max, m, opts = {}) => { const p = { t: 0, min, max, m, ...opts }; prims.push(p); return p; };
  const sphere = (c, r, m, opts = {}) => { const p = { t: 1, c, r, m, ...opts }; prims.push(p); return p; };
  const cyl = (cx, cz, r, y0, y1, m, opts = {}) => { const p = { t: 2, cx, cz, r, y0, y1, m, ...opts }; prims.push(p); return p; };

  // ---- Shell ---------------------------------------------------------------
  box([LEFT - 0.3, -0.3, -4], [RIGHT + 0.3, FLOOR, FRONT], mat.oak, { nodraw: "partial" });
  box([LEFT - 0.3, CEIL, -1.3], [RIGHT + 0.3, CEIL + 0.5, FRONT], mat.ceiling);
  box([LEFT - 0.3, CEIL, -4], [0.95, CEIL + 0.5, -1.3], mat.ceiling);
  box([2.9, CEIL, -4], [RIGHT + 0.3, CEIL + 0.5, -1.3], mat.ceiling);
  box([LEFT - 0.3, 0, -4], [LEFT, CEIL + 0.5, 2.5], mat.plasterTex);
  box([LEFT - 0.3, 2.15, 2.5], [LEFT, CEIL + 0.5, 3.45], mat.plasterTex);
  box([LEFT - 0.3, 0, 3.45], [LEFT, CEIL + 0.5, FRONT], mat.plasterTex);
  box([LEFT - 2, 0, 2.3], [LEFT - 1.2, CEIL, 3.7], mat.dark); // hallway beyond the door
  box([RIGHT, 0, -4], [RIGHT + 0.3, CEIL + 0.5, FRONT], mat.plasterTex);
  box([LEFT, 0, FRONT], [RIGHT, CEIL, FRONT + 0.3], mat.plasterTex, { nodraw: true });

  // Back wall: lintel above the glazed screen, plaster at the head of the units
  box([LEFT, 2.3, BACK - 0.3], [RIGHT, CEIL, BACK], mat.plasterTex);
  box([LEFT, 0, BACK - 0.3], [0.9, 2.3, BACK], mat.plasterTex);
  box([2.95, 0, BACK - 0.3], [RIGHT, 2.3, BACK], mat.frame);

  // ---- Joinery: tall units on the left ------------------------------------
  const z0 = BACK, z1 = BACK + 0.62, gap = 0.004;
  box([LEFT, 0, z0], [-1.1, 2.32, z1 - 0.03], mat.joineryEdge, { nodraw: true });
  box([LEFT, 0, z1 - 0.3], [-1.1, 0.1, z1 - 0.1], mat.joineryEdge, { nodraw: true });
  const doors = 4, dw = (-1.1 - LEFT) / doors;
  for (let i = 0; i < doors; i++) {
    const x0 = LEFT + i * dw;
    box([x0 + gap, 0.1, z1 - 0.03], [x0 + dw - gap, 2.32, z1], mat.joinery);
    // Slim brass pull, full height of the hand zone
    if (i !== 1) box([i % 2 ? x0 + 0.05 : x0 + dw - 0.065, 0.95, z1], [i % 2 ? x0 + 0.065 : x0 + dw - 0.05, 1.3, z1 + 0.016], mat.brass, { nodraw: true });
  }
  box([LEFT, 2.32, z0], [-1.1, CEIL, z1], mat.plasterTex);

  // ---- Alcove with worktop, shelf and hidden strips -----------------------
  const ax0 = -1.1, ax1 = 0.9;
  box([ax0, 0, z0], [ax1, 0.1, z1 - 0.06], mat.joineryEdge, { nodraw: true });
  const bases = 3, bw = (ax1 - ax0) / bases;
  for (let i = 0; i < bases; i++) box([ax0 + i * bw + gap, 0.1, z0], [ax0 + (i + 1) * bw - gap, 0.9, z1], mat.joinery);
  box([ax0, 0.9, z0], [ax1, 0.94, z1 + 0.015], mat.stone);
  box([ax0, 0.94, z0], [ax1, 2.32, z0 + 0.02], mat.stone);
  box([ax0, 2.3, z0], [ax1, CEIL, z1], mat.plasterTex);
  box([ax0, 1.62, z0], [ax1, 1.665, z0 + 0.3], mat.shelf);
  // double socket on the splashback, brushed steel
  const plate = (x, y, wide) => {
    const hw = wide ? 0.073 : 0.043;
    box([x - hw, y - 0.043, z0 + 0.02], [x + hw, y + 0.043, z0 + 0.026], mat.faceplate, { nodraw: true });
  };
  plate(-0.55, 1.12, true); plate(0.35, 1.12, true);
  // a few objects on the shelf and worktop
  cyl(-0.72, BACK + 0.15, 0.06, 1.665, 1.86, mat.white);
  cyl(-0.56, BACK + 0.14, 0.045, 1.665, 1.78, mat.dark);
  sphere([0.42, 1.74, BACK + 0.15], 0.075, mat.white);
  box([0.05, 0.94, BACK + 0.04], [0.42, 1.2, BACK + 0.07], mat.shelf, { nodraw: true });
  cyl(-0.2, BACK + 0.32, 0.09, 0.94, 1.06, mat.dark);

  // Strips: the joinery circuit
  const warm = (k) => (x, y, z, o) => { o[0] = 1.0 * k; o[1] = 0.74 * k; o[2] = 0.47 * k; };
  const rectEmitter = (group, o, u, v, n, L) => {
    const ax = u[1] * v[2] - u[2] * v[1], ay = u[2] * v[0] - u[0] * v[2], az = u[0] * v[1] - u[1] * v[0];
    emitters.push({ kind: "rect", group, o, u, v, n, area: Math.hypot(ax, ay, az), L, spot: L.spot });
  };
  const stripShelf = warm(62), stripTop = warm(62), stripPlinth = warm(70);
  const strip = (group, x0, x1, y, z, depth, L) => {
    const mn = [x0, y, z], mx = [x1, y + 0.003, z + depth];
    box(mn, mx, { emit: { group, L }, a: [0.6, 0.6, 0.6], offAlbedo: true, spec: 0 }, { nodraw: true, noshadow: true });
    rectEmitter(group, [x0, y, z], [x1 - x0, 0, 0], [0, 0, depth], [0, -1, 0], L);
  };
  strip("joinery", ax0 + 0.02, ax1 - 0.02, 1.617, z0 + 0.22, 0.02, stripShelf);
  strip("joinery", ax0 + 0.02, ax1 - 0.02, 2.296, z0 + 0.1, 0.03, stripTop);

  // ---- Glazed screen to the garden ----------------------------------------
  const gx0 = 0.9, gx1 = 2.95;
  const bar = 0.03;
  const zg = BACK - 0.14;
  box([gx0, 2.25, zg - 0.04], [gx1, 2.3, zg + 0.04], mat.frame);
  box([gx0, 0, zg - 0.04], [gx1, 0.05, zg + 0.04], mat.frame);
  for (let i = 0; i <= 3; i++) {
    const x = gx0 + (gx1 - gx0) * (i / 3);
    box([x - bar, 0, zg - 0.04], [x + bar, 2.3, zg + 0.04], mat.frame);
  }
  for (const y of [0.78, 1.53]) box([gx0, y - 0.012, zg - 0.02], [gx1, y + 0.012, zg + 0.02], mat.frame);
  box([gx0, 0, zg - 0.005], [gx1, 2.3, zg + 0.005], mat.glass, { glass: true, nodraw: true });
  box([gx0, 0, BACK - 0.3], [gx1, 0.001, BACK], mat.frame, { nodraw: true });
  box([gx0 - 0.3, 2.3, BACK - 0.3], [gx1, 2.32, BACK], mat.plasterTex, { nodraw: true });

  // Outside: patio, fence, dusk
  box([-3, -0.05, -9], [7, 0, BACK - 0.3], mat.outside, { nodraw: true });
  box([-3, 0, -5.9], [7, 1.75, -5.8], { a: [0.018, 0.028, 0.03], spec: 0 }, { nodraw: true });
  const sky = (x, y, z, o) => {
    const t = Math.max(0, Math.min(1, (y - 1.6) / 2.4));
    const g = t * t * (3 - 2 * t);
    o[0] = (0.78 * (1 - g) + 0.07 * g) * 0.95;
    o[1] = (0.47 * (1 - g) + 0.16 * g) * 0.95;
    o[2] = (0.40 * (1 - g) + 0.42 * g) * 0.95;
  };
  box([-6, -1, -9.2], [10, 9, -9], { emit: { group: "dusk", L: sky } }, { nodraw: true });
  rectEmitter("dusk", [gx0, 0.3, BACK - 0.32], [gx1 - gx0, 0, 0], [0, 2.0, 0], [0, 0, 1], (x, y, z, o, dx, dy, dz) => {
    const t = Math.max(0, Math.min(1, (y + 1.5) / 5));
    o[0] = 0.6 * (1 - t) + 0.1 * t; o[1] = 0.46 * (1 - t) + 0.2 * t; o[2] = 0.46 * (1 - t) + 0.46 * t;
    const k = 3.0; o[0] *= k; o[1] *= k; o[2] *= k;
  });

  // Rooflight over the glazed corner, with a deep reveal
  const skyTop = (x, y, z, o) => { o[0] = 0.26; o[1] = 0.42; o[2] = 0.78; };
  box([0.95, CEIL + 0.14, -2.4], [2.9, CEIL + 0.15, -1.3], { emit: { group: "dusk", L: skyTop }, a: [0.1, 0.1, 0.1] }, { nodraw: true, noshadow: true });
  rectEmitter("dusk", [0.95, CEIL + 0.139, -2.4], [1.95, 0, 0], [0, 0, 1.1], [0, -1, 0], skyTop);
  box([0.95, CEIL + 0.15, -2.4], [2.9, CEIL + 0.5, -1.3], mat.ceiling, { nodraw: true });

  // ---- Island ------------------------------------------------------------
  const ix0 = -0.75, ix1 = 2.0, iz0 = 0.15, iz1 = 1.15;
  box([ix0 + 0.06, 0, iz0 + 0.06], [ix1 - 0.06, 0.1, iz1 - 0.06], mat.joineryEdge, { nodraw: true });
  const cols = 5, cw = (ix1 - ix0) / cols;
  box([ix0, 0.1, iz0], [ix1, 0.9, iz1 - 0.02], mat.joineryEdge, { nodraw: true });
  for (let i = 0; i < cols; i++) box([ix0 + i * cw + gap, 0.1, iz1 - 0.02], [ix0 + (i + 1) * cw - gap, 0.9, iz1], mat.joinery);
  box([ix0 - 0.03, 0.9, iz0 - 0.03], [ix1 + 0.03, 0.96, iz1 + 0.05], mat.stone);
  strip("joinery", ix0 + 0.08, ix1 - 0.08, 0.096, iz1 - 0.045, 0.012, stripPlinth);

  // Stools
  for (const x of [0.0, 0.82, 1.62]) {
    const z = 1.72;
    cyl(x, z, 0.175, 0.62, 0.66, mat.stool);
    cyl(x, z, 0.012, 0.03, 0.62, mat.frame, { nodraw: true });
    cyl(x, z, 0.16, 0, 0.022, mat.frame);
  }

  // ---- Pendants ----------------------------------------------------------
  const globes = [[-0.2, 1.74, 0.65], [0.62, 1.74, 0.65], [1.44, 1.74, 0.65]];
  const opal = (x, y, z, o) => { o[0] = 24; o[1] = 17; o[2] = 10.5; };
  for (const c of globes) {
    sphere(c, 0.115, { emit: { group: "pendants", L: opal }, a: [0.72, 0.72, 0.7], offAlbedo: true, opaqueEmitter: false, spec: 0 });
    emitters.push({ kind: "sphere", group: "pendants", c, r: 0.115, L: opal });
    cyl(c[0], c[2], 0.0035, c[1] + 0.11, CEIL, mat.flex, { nodraw: true });
    cyl(c[0], c[2], 0.022, c[1] + 0.11, c[1] + 0.14, mat.brass, { nodraw: true });
    cyl(c[0], c[2], 0.05, CEIL - 0.022, CEIL, mat.brass, { nodraw: true });
  }

  // ---- Downlights: small hooded emitters in the ceiling --------------------
  const spots = [];
  for (const x of [-2.4, -1.3, 0.2, 1.4, 2.5]) spots.push([x, -1.35]);
  for (const x of [-2.4, 0.2, 1.4, 2.5]) spots.push([x, 2.5]);
  for (const z of [4.5]) for (const x of [-1.9, 0.2, 2.1]) spots.push([x, z]);
  const lamp = (x, y, z, o, dx, dy, dz) => {
    const c = Math.max(0, Math.abs(dy));
    const beam = Math.max(0, Math.min(1, (c - 0.5) / 0.16));
    const k = 420 * beam * beam;
    o[0] = k; o[1] = k * 0.8; o[2] = k * 0.58;
  };
  lamp.spot = true;
  for (const [x, z] of spots) {
    cyl(x, z, 0.043, CEIL - 0.002, CEIL + 0.02, { a: [0.86, 0.86, 0.84], spec: 0 }, { nodraw: true });
    const r = 0.028;
    box([x - r, CEIL - 0.003, z - r], [x + r, CEIL - 0.0025, z + r], { emit: { group: "downlights", L: lamp }, a: [0.8, 0.8, 0.8], offAlbedo: true, spec: 0 }, { nodraw: true, noshadow: true });
    rectEmitter("downlights", [x - r, CEIL - 0.0035, z - r], [2 * r, 0, 0], [0, 0, 2 * r], [0, -1, 0], lamp);
  }

  // Two-gang switch plate by the door, at about 1.2 m
  box([LEFT, 1.157, 2.2], [LEFT + 0.008, 1.243, 2.346], mat.faceplate, { nodraw: true });

  return {
    prims,
    emitters,
    spots,
    globes,
    mat,
    // Cable routes per circuit, as polylines. Every one leaves the switch drop by
    // the door, climbs straight up, and then runs square to the room.
    routes() {
      const SW = 2.27, C = CEIL - 0.001;
      const drop = [[LEFT + 0.001, 1.24, SW], [LEFT + 0.001, C, SW]];
      const pendants = [
        [...drop, [LEFT + 0.001, C, 0.65], [1.44, C, 0.65]],
        ...globes.map((g) => [[g[0], C, g[2]], [g[0], g[1] + 0.115, g[2]]]),
      ];
      const downlights = [
        [...drop, [-2.4, C, SW], [-2.4, C, 4.5], [2.1, C, 4.5]],
        [[-2.4, C, 2.5], [2.5, C, 2.5]],
        [[-2.4, C, 2.5], [-2.4, C, -1.35], [2.5, C, -1.35]],
      ];
      const joinery = [
        [...drop, [LEFT + 0.001, C, -1.1], [-0.1, C, -1.1], [-0.1, C, BACK + 0.6], [-0.1, 2.3, BACK + 0.6]],
        [[-0.1, 2.3, BACK + 0.3], [-0.1, 1.62, BACK + 0.3]],
        [[LEFT + 0.001, 1.24, SW], [LEFT + 0.001, 0.002, SW], [-0.75, 0.002, SW], [-0.75, 0.002, 0.65], [-0.75, 0.1, 0.65]],
      ];
      return { pendants, downlights, joinery };
    },
    cameras: {
      wide: { pos: [-0.35, 1.28, 5.7], yaw: 0.0, focal: 1.3, shiftY: 0.05, shiftX: -0.1 },
      tall: { pos: [0.75, 1.3, 5.4], yaw: 0.0, focal: 2.1, shiftY: -0.1 },
    },
  };
}
