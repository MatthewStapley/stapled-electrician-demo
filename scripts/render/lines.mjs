// Hidden-line drawing of the scene from a render camera, plus projected lamp
// positions and cable routes. Registered exactly to the renders.
//   node scripts/render/lines.mjs <scene> <camera> <width> <height>
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
const [sceneName, camName, Warg, Harg] = process.argv.slice(2);
const W = +Warg, H = +Harg;
const scene = (await import(`${here}scene-${sceneName}.mjs`)).default();
const cam = scene.cameras[camName];
const { pos, focal, shiftY = 0, shiftX = 0 } = cam;
const project = ([x, y, z]) => {
  const dz = pos[2] - z; // camera looks down -z, level
  if (dz <= 0.05) return null;
  const u = ((x - pos[0]) / dz) * focal, v = ((y - pos[1]) / dz) * focal;
  return [((u - shiftX) / 2 + 0.5) * W, (0.5 - ((v - shiftY) * (W / H)) / 2) * H];
};
// Brute force occlusion: precision matters more than speed here.
const prims = scene.prims.filter((p) => !p.glass && !(p.m.emit && !p.m.offAlbedo));
function blocked(o, d, tmax) {
  for (const p of prims) {
    if (p.t === 0) {
      let t0 = 1e-4, t1 = tmax;
      let ok = true;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(d[k]) < 1e-12) { if (o[k] < p.min[k] || o[k] > p.max[k]) { ok = false; break; } continue; }
        let a = (p.min[k] - o[k]) / d[k], b = (p.max[k] - o[k]) / d[k];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && t1 > 1e-3 && t0 < tmax) return true;
    } else if (p.t === 1) {
      const c = [o[0] - p.c[0], o[1] - p.c[1], o[2] - p.c[2]];
      const b = c[0] * d[0] + c[1] * d[1] + c[2] * d[2], cc = c[0] ** 2 + c[1] ** 2 + c[2] ** 2 - p.r ** 2;
      const D = b * b - cc;
      if (D > 0 && -b - Math.sqrt(D) > 1e-3 && -b - Math.sqrt(D) < tmax) return true;
    } else {
      const cx = o[0] - p.cx, cz = o[2] - p.cz;
      const A = d[0] ** 2 + d[2] ** 2, B = cx * d[0] + cz * d[2], C = cx * cx + cz * cz - p.r ** 2;
      const D = B * B - A * C;
      if (A > 1e-9 && D > 0) {
        const t = (-B - Math.sqrt(D)) / A, y = o[1] + d[1] * t;
        if (t > 1e-3 && t < tmax && y > p.y0 && y < p.y1) return true;
      }
    }
  }
  return false;
}
const visible = (P) => {
  const v = [P[0] - pos[0], P[1] - pos[1], P[2] - pos[2]];
  const L = Math.hypot(...v), d = v.map((a) => a / L);
  return !blocked(pos, d, L - 0.012);
};
const lines = [];
function edge(a, b) {
  const pa = project(a), pb = project(b);
  if (!pa || !pb) {
    // clip against the near plane by walking towards the camera limit
    const t = (pos[2] - 0.2 - a[2]) / (b[2] - a[2]);
    if (!(t > 0 && t < 1)) return;
    const m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, pos[2] - 0.2];
    return edge(pa ? a : b, m);
  }
  const len = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
  if (len < 4) return;
  const n = Math.max(2, Math.min(120, Math.round(len / 6)));
  let run = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const p = project(P);
    const on = visible(P) && p[0] >= -2 && p[0] <= W + 2 && p[1] >= -2 && p[1] <= H + 2;
    if (on) { run ? (run[1] = p) : (run = [p, p]); }
    if ((!on || i === n) && run) {
      if (Math.hypot(run[0][0] - run[1][0], run[0][1] - run[1][1]) > 5) lines.push([run[0], run[1]]);
      run = null;
    }
  }
}
for (const p of scene.prims) {
  if (p.nodraw === true || p.glass) continue;
  if (p.t === 0) {
    const [x0, y0, z0] = p.min, [x1, y1, z1] = p.max;
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) edge(c[i], c[j]);
  } else if (p.t === 2) {
    for (const y of [p.y0, p.y1]) {
      const pts = [];
      for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; pts.push([p.cx + Math.cos(a) * p.r, y, p.cz + Math.sin(a) * p.r]); }
      for (let i = 0; i < 28; i++) edge(pts[i], pts[i + 1]);
    }
  }
}
const round = (v) => Math.round(v * 10) / 10;
const uniq = new Map();
for (const [a, b] of lines) {
  const k = [a, b].flat().map(round).join();
  uniq.set(k, [a, b].flat().map(round));
}
const circles = scene.globes.map((c) => { const p = project(c); const q = project([c[0] + 0.115, c[1], c[2]]); return [round(p[0]), round(p[1]), round(q[0] - p[0])]; });
const spots = scene.spots.map(([x, z]) => project([x, 2.65, z])).filter(Boolean).filter(([x, y]) => x > -40 && x < W + 40 && y > -40).map((p) => p.map(round));
const routes = scene.routes ? Object.fromEntries(Object.entries(scene.routes()).map(([k, list]) => [k, list.map((pl) => pl.map(project).filter(Boolean).map((p) => p.map(round)))])) : {};
const data = { w: W, h: H, lines: [...uniq.values()], circles, spots, routes };
writeFileSync(`${here}out/${sceneName}-${camName}-lines.json`, JSON.stringify(data));
console.log(sceneName, camName, "lines", data.lines.length);
