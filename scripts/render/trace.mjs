// A small multi-threaded path tracer, written for this concept so that the
// signature imagery is original and every lighting circuit can be rendered as
// its own registered layer.
//
//   node scripts/render/trace.mjs <scene> <camera> <pass|gbuffer> <spp> <width> <height>
//
// Output: scripts/render/out/<scene>-<camera>-<pass>.f32 (RGB float32, linear).
import { Worker, isMainThread, workerData, parentPort } from "node:worker_threads";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";

const here = fileURLToPath(new URL(".", import.meta.url));

// --- vector-free maths: everything is inlined on doubles for speed ----------
function buildBVH(prims) {
  const nodes = [];
  const order = [];
  const bounds = (p) => {
    if (p.t === 0) return [p.min, p.max];
    if (p.t === 1) return [p.c.map((v) => v - p.r), p.c.map((v) => v + p.r)];
    return [[p.cx - p.r, p.y0, p.cz - p.r], [p.cx + p.r, p.y1, p.cz + p.r]];
  };
  const items = prims.map((p, i) => {
    const [mn, mx] = bounds(p);
    return { i, mn, mx, c: [0, 1, 2].map((k) => (mn[k] + mx[k]) / 2) };
  });
  const build = (list) => {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const it of list) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], it.mn[k]); mx[k] = Math.max(mx[k], it.mx[k]); }
    const id = nodes.length;
    nodes.push(null);
    if (list.length <= 3) {
      nodes[id] = { mn, mx, start: order.length, count: list.length, left: 0, right: 0 };
      for (const it of list) order.push(it.i);
      return id;
    }
    const ext = [0, 1, 2].map((k) => mx[k] - mn[k]);
    const axis = ext.indexOf(Math.max(...ext));
    list.sort((a, b) => a.c[axis] - b.c[axis]);
    const mid = list.length >> 1;
    const left = build(list.slice(0, mid));
    const right = build(list.slice(mid));
    nodes[id] = { mn, mx, start: 0, count: 0, left, right };
    return id;
  };
  build(items);
  const f = new Float64Array(nodes.length * 6);
  const n = new Int32Array(nodes.length * 4);
  nodes.forEach((d, i) => {
    f.set([...d.mn, ...d.mx], i * 6);
    n.set([d.start, d.count, d.left, d.right], i * 4);
  });
  return { f, n, order: Int32Array.from(order) };
}

export async function loadScene(name) {
  const mod = await import(`${here}scene-${name}.mjs`);
  return mod.default();
}

if (isMainThread) {
  const [sceneName, camName, pass, sppArg, wArg, hArg] = process.argv.slice(2);
  const spp = +sppArg, W = +wArg, H = +hArg;
  const threads = Math.max(1, os.availableParallelism() - 1);
  const buf = new SharedArrayBuffer(W * H * 3 * 4);
  const out = new Float32Array(buf);
  const started = Date.now();
  let nextRow = 0, done = 0, finished = 0;
  await new Promise((resolve, reject) => {
    for (let t = 0; t < threads; t++) {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { sceneName, camName, pass, spp, W, H, buf, seed: t * 7919 + 13 } });
      const give = () => { if (nextRow < H) { w.postMessage(nextRow); nextRow += 8; } else w.postMessage(-1); };
      w.on("message", (m) => {
        if (m === "ready") return give();
        if (m === "row") {
          done += 8;
          if (done % 160 === 0) process.stdout.write(`\r${pass} ${Math.min(100, (100 * done / H)).toFixed(0)}% ${((Date.now() - started) / 1000).toFixed(0)}s   `);
          give();
        }
      });
      w.on("error", reject);
      w.on("exit", () => { if (++finished === threads) resolve(); });
    }
  });
  mkdirSync(`${here}out`, { recursive: true });
  writeFileSync(`${here}out/${sceneName}-${camName}-${pass}.f32`, Buffer.from(out.buffer));
  console.log(`\n${sceneName}/${camName}/${pass}: ${W}x${H} ${spp}spp in ${((Date.now() - started) / 1000).toFixed(0)}s`);
} else {
  const { sceneName, camName, pass, spp, W, H, buf, seed } = workerData;
  const scene = await loadScene(sceneName);
  const cam = scene.cameras[camName];
  const out = new Float32Array(buf);
  const prims = scene.prims;
  const bvh = buildBVH(prims);
  const bf = bvh.f, bn = bvh.n, bo = bvh.order;
  const stack = new Int32Array(64);
  const emitters = scene.emitters.filter((e) => e.group === pass);
  const G = pass === "gbuffer";
  const weights = new Float64Array(emitters.length);
  for (const e of emitters) {
    if (e.kind === "rect") {
      e.c0 = [0, 1, 2].map((k) => e.o[k] + e.u[k] / 2 + e.v[k] / 2);
      e.reach = Math.hypot(...e.u, ...e.v) / 2;
      e.minD2 = Math.max(0.04, e.area);
    } else { e.c0 = e.c; e.reach = e.r; e.minD2 = 0.04; }
    const o = [0, 0, 0];
    e.L(e.c0[0], e.c0[1], e.c0[2], o, 0, -1, 0);
    e.power = (o[0] + o[1] + o[2] + 1e-3) * (e.kind === "rect" ? e.area : 12 * e.r * e.r);
  }

  // Fast xorshift RNG
  let s = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };

  // Intersection state (module-level to avoid allocation)
  let hT = 0, hP = -1, nx = 0, ny = 0, nz = 0;

  function closest(ox, oy, oz, dx, dy, dz, tmax) {
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
    let best = tmax, bp = -1, bnx = 0, bny = 0, bnz = 0;
    let sp = 0; stack[sp++] = 0;
    while (sp) {
      const i = stack[--sp], k = i * 6;
      let a = (bf[k] - ox) * ix, b = (bf[k + 3] - ox) * ix;
      let tn = a < b ? a : b, tf = a < b ? b : a;
      a = (bf[k + 1] - oy) * iy; b = (bf[k + 4] - oy) * iy;
      let l = a < b ? a : b, h = a < b ? b : a;
      if (l > tn) tn = l; if (h < tf) tf = h;
      a = (bf[k + 2] - oz) * iz; b = (bf[k + 5] - oz) * iz;
      l = a < b ? a : b; h = a < b ? b : a;
      if (l > tn) tn = l; if (h < tf) tf = h;
      if (tn > tf || tf < 1e-6 || tn > best) continue;
      const q = i * 4, count = bn[q + 1];
      if (count === 0) { stack[sp++] = bn[q + 2]; stack[sp++] = bn[q + 3]; continue; }
      for (let c = 0; c < count; c++) {
        const pi = bo[bn[q] + c], p = prims[pi];
        if (p.t === 0) {
          const mn = p.min, mx = p.max;
          let t0 = -1e30, t1 = 1e30, ax = 0, s0 = 0;
          let u = (mn[0] - ox) * ix, v = (mx[0] - ox) * ix, sg = -1;
          if (u > v) { const w = u; u = v; v = w; sg = 1; }
          if (u > t0) { t0 = u; ax = 0; s0 = sg; } if (v < t1) t1 = v;
          u = (mn[1] - oy) * iy; v = (mx[1] - oy) * iy; sg = -1;
          if (u > v) { const w = u; u = v; v = w; sg = 1; }
          if (u > t0) { t0 = u; ax = 1; s0 = sg; } if (v < t1) t1 = v;
          u = (mn[2] - oz) * iz; v = (mx[2] - oz) * iz; sg = -1;
          if (u > v) { const w = u; u = v; v = w; sg = 1; }
          if (u > t0) { t0 = u; ax = 2; s0 = sg; } if (v < t1) t1 = v;
          if (t0 > t1) continue;
          let t = t0, inside = false;
          if (t < 1e-5) { t = t1; inside = true; }
          if (t < 1e-5 || t >= best) continue;
          best = t; bp = pi;
          if (!inside) { bnx = ax === 0 ? s0 : 0; bny = ax === 1 ? s0 : 0; bnz = ax === 2 ? s0 : 0; }
          else {
            // leaving the box: find the exit face
            const hx = ox + dx * t, hy = oy + dy * t, hz = oz + dz * t;
            const e = 1e-6;
            bnx = Math.abs(hx - mn[0]) < e ? 1 : Math.abs(hx - mx[0]) < e ? -1 : 0;
            bny = bnx ? 0 : Math.abs(hy - mn[1]) < e ? 1 : Math.abs(hy - mx[1]) < e ? -1 : 0;
            bnz = bnx || bny ? 0 : Math.abs(hz - mn[2]) < e ? 1 : -1;
          }
        } else if (p.t === 1) {
          const cx = ox - p.c[0], cy = oy - p.c[1], cz = oz - p.c[2];
          const bb = cx * dx + cy * dy + cz * dz, cc = cx * cx + cy * cy + cz * cz - p.r * p.r;
          const disc = bb * bb - cc;
          if (disc < 0) continue;
          const sq = Math.sqrt(disc);
          let t = -bb - sq;
          if (t < 1e-5) t = -bb + sq;
          if (t < 1e-5 || t >= best) continue;
          best = t; bp = pi;
          bnx = (cx + dx * t) / p.r; bny = (cy + dy * t) / p.r; bnz = (cz + dz * t) / p.r;
        } else {
          // Vertical capped cylinder
          const cx = ox - p.cx, cz = oz - p.cz, r = p.r;
          const A = dx * dx + dz * dz, B = cx * dx + cz * dz, C = cx * cx + cz * cz - r * r;
          let tb = 1e30, kind = 0;
          if (A > 1e-12) {
            const disc = B * B - A * C;
            if (disc >= 0) {
              const sq = Math.sqrt(disc);
              let t = (-B - sq) / A;
              const y = oy + dy * t;
              if (t > 1e-5 && y >= p.y0 && y <= p.y1) { tb = t; kind = 1; }
              else {
                t = (-B + sq) / A;
                const y2 = oy + dy * t;
                if (t > 1e-5 && y2 >= p.y0 && y2 <= p.y1) { tb = t; kind = 1; }
              }
            }
          }
          if (Math.abs(dy) > 1e-12) {
            for (let e = 0; e < 2; e++) {
              const yy = e ? p.y1 : p.y0, t = (yy - oy) * iy;
              if (t > 1e-5 && t < tb) {
                const hx = cx + dx * t, hz = cz + dz * t;
                if (hx * hx + hz * hz <= r * r) { tb = t; kind = e ? 3 : 2; }
              }
            }
          }
          if (tb >= best) continue;
          best = tb; bp = pi;
          if (kind === 1) { bnx = (cx + dx * tb) / r; bny = 0; bnz = (cz + dz * tb) / r; }
          else { bnx = 0; bny = kind === 3 ? 1 : -1; bnz = 0; }
        }
      }
    }
    hT = best; hP = bp; nx = bnx; ny = bny; nz = bnz;
    return bp >= 0;
  }

  function occluded(ox, oy, oz, dx, dy, dz, tmax) {
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
    let sp = 0; stack[sp++] = 0;
    while (sp) {
      const i = stack[--sp], k = i * 6;
      let a = (bf[k] - ox) * ix, b = (bf[k + 3] - ox) * ix;
      let tn = a < b ? a : b, tf = a < b ? b : a;
      a = (bf[k + 1] - oy) * iy; b = (bf[k + 4] - oy) * iy;
      let l = a < b ? a : b, h = a < b ? b : a;
      if (l > tn) tn = l; if (h < tf) tf = h;
      a = (bf[k + 2] - oz) * iz; b = (bf[k + 5] - oz) * iz;
      l = a < b ? a : b; h = a < b ? b : a;
      if (l > tn) tn = l; if (h < tf) tf = h;
      if (tn > tf || tf < 1e-6 || tn > tmax) continue;
      const q = i * 4, count = bn[q + 1];
      if (count === 0) { stack[sp++] = bn[q + 2]; stack[sp++] = bn[q + 3]; continue; }
      for (let c = 0; c < count; c++) {
        const p = prims[bo[bn[q] + c]];
        if (p.glass || p.noshadow) continue;
        if (p.t === 0) {
          const mn = p.min, mx = p.max;
          let u = (mn[0] - ox) * ix, v = (mx[0] - ox) * ix;
          let t0 = u < v ? u : v, t1 = u < v ? v : u;
          u = (mn[1] - oy) * iy; v = (mx[1] - oy) * iy;
          let w = u < v ? u : v, z = u < v ? v : u;
          if (w > t0) t0 = w; if (z < t1) t1 = z;
          u = (mn[2] - oz) * iz; v = (mx[2] - oz) * iz;
          w = u < v ? u : v; z = u < v ? v : u;
          if (w > t0) t0 = w; if (z < t1) t1 = z;
          if (t0 <= t1 && t1 > 1e-5 && t0 < tmax) return true;
        } else if (p.t === 1) {
          const cx = ox - p.c[0], cy = oy - p.c[1], cz = oz - p.c[2];
          const bb = cx * dx + cy * dy + cz * dz, cc = cx * cx + cy * cy + cz * cz - p.r * p.r;
          const disc = bb * bb - cc;
          if (disc < 0) continue;
          const sq = Math.sqrt(disc);
          const t = -bb - sq;
          if (t > 1e-5 && t < tmax) return true;
          const t2 = -bb + sq;
          if (t2 > 1e-5 && t2 < tmax) return true;
        } else {
          const cx = ox - p.cx, cz = oz - p.cz, r = p.r;
          const A = dx * dx + dz * dz, B = cx * dx + cz * dz, C = cx * cx + cz * cz - r * r;
          if (A < 1e-12) continue;
          const disc = B * B - A * C;
          if (disc < 0) continue;
          const sq = Math.sqrt(disc);
          for (let e = -1; e <= 1; e += 2) {
            const t = (-B + e * sq) / A, y = oy + dy * t;
            if (t > 1e-5 && t < tmax && y >= p.y0 && y <= p.y1) return true;
          }
        }
      }
    }
    return false;
  }

  const alb = [0, 0, 0];
  const Le = [0, 0, 0];

  function radiance(ox, oy, oz, dx, dy, dz, res) {
    let Tr = 1, Tg = 1, Tb = 1, Lr = 0, Lg = 0, Lb = 0;
    let specular = true;
    for (let depth = 0; depth < 7; depth++) {
      if (!closest(ox, oy, oz, dx, dy, dz, 1e9)) break;
      const t = hT, p = prims[hP], m = p.m;
      let Nx = nx, Ny = ny, Nz = nz;
      let front = Nx * dx + Ny * dy + Nz * dz;
      const hx = ox + dx * t, hy = oy + dy * t, hz = oz + dz * t;
      if (m.emit) {
        // Sky and lamps: count when seen directly or via a mirror bounce.
        if (specular && m.emit.group === pass && front < 0) {
          m.emit.L(hx, hy, hz, Le, dx, dy, dz);
          Lr += Tr * Le[0]; Lg += Tg * Le[1]; Lb += Tb * Le[2];
        }
        if (m.opaqueEmitter !== false) { if (!m.offAlbedo) break; }
      }
      if (m.glass) {
        const c = 1 + front; // front negative
        const c5 = Math.max(0, Math.min(1, c)) ** 5;
        const F = 0.05 + 0.95 * c5;
        if (rnd() < F) {
          const k = 2 * front;
          dx -= k * Nx; dy -= k * Ny; dz -= k * Nz;
          ox = hx + dx * 1e-3; oy = hy + dy * 1e-3; oz = hz + dz * 1e-3;
          specular = true;
        } else {
          ox = hx + dx * 1e-3; oy = hy + dy * 1e-3; oz = hz + dz * 1e-3;
        }
        continue;
      }
      if (front > 0) { Nx = -Nx; Ny = -Ny; Nz = -Nz; front = -front; }
      if (m.tex) m.tex(hx, hy, hz, Nx, Ny, Nz, alb);
      else { alb[0] = m.a[0]; alb[1] = m.a[1]; alb[2] = m.a[2]; }
      const cos = -front;
      const f5 = (1 - cos) ** 5;
      const F0 = m.metal ? 1 : (m.f0 ?? 0.04);
      const F = m.metal ? 1 : (m.spec === 0 ? 0 : F0 + (1 - F0) * f5);
      const isSpec = m.metal || rnd() < F;
      if (isSpec) {
        if (m.metal) { Tr *= alb[0]; Tg *= alb[1]; Tb *= alb[2]; }
        const k = 2 * front;
        let rx = dx - k * Nx, ry = dy - k * Ny, rz = dz - k * Nz;
        const r = m.rough ?? 0;
        if (r > 0) {
          let ax, ay, az, l2;
          do { ax = rnd() * 2 - 1; ay = rnd() * 2 - 1; az = rnd() * 2 - 1; l2 = ax * ax + ay * ay + az * az; } while (l2 > 1);
          rx += ax * r; ry += ay * r; rz += az * r;
          const il = 1 / Math.sqrt(rx * rx + ry * ry + rz * rz);
          rx *= il; ry *= il; rz *= il;
          if (rx * Nx + ry * Ny + rz * Nz < 0) break;
        }
        dx = rx; dy = ry; dz = rz;
        ox = hx + Nx * 1e-4; oy = hy + Ny * 1e-4; oz = hz + Nz * 1e-4;
        specular = true;
        continue;
      }
      // Next-event estimation
      const px = hx + Nx * 1e-4, py = hy + Ny * 1e-4, pz = hz + Nz * 1e-4;
      if (emitters.length) {
        // Pick an emitter in proportion to its rough contribution at this point.
        let total = 0;
        for (let q = 0; q < emitters.length; q++) {
          const c = emitters[q];
          const ex0 = c.c0[0] - px, ey0 = c.c0[1] - py, ez0 = c.c0[2] - pz;
          const dd = ex0 * ex0 + ey0 * ey0 + ez0 * ez0;
          let w = c.power / Math.max(dd, c.minD2);
          if (c.spot) { const up = -ey0 / Math.sqrt(dd + 1e-9); if (up < 0.5) w *= 0.02; }
          if (ex0 * Nx + ey0 * Ny + ez0 * Nz < -c.reach) w *= 0.02;
          weights[q] = w; total += w;
        }
        let pick = rnd() * total, ei = 0;
        for (; ei < emitters.length - 1; ei++) { pick -= weights[ei]; if (pick <= 0) break; }
        const e = emitters[ei];
        const pdfE = weights[ei] / total;
        const sx0 = rnd(), sy0 = rnd();
        let ex, ey, ez, enx, eny, enz, area;
        if (e.kind === "rect") {
          ex = e.o[0] + e.u[0] * sx0 + e.v[0] * sy0;
          ey = e.o[1] + e.u[1] * sx0 + e.v[1] * sy0;
          ez = e.o[2] + e.u[2] * sx0 + e.v[2] * sy0;
          enx = e.n[0]; eny = e.n[1]; enz = e.n[2]; area = e.area;
        } else {
          const z = 1 - 2 * sx0, r = Math.sqrt(Math.max(0, 1 - z * z)), a = 6.2831853 * sy0;
          enx = r * Math.cos(a); eny = z; enz = r * Math.sin(a);
          ex = e.c[0] + enx * e.r; ey = e.c[1] + eny * e.r; ez = e.c[2] + enz * e.r;
          area = 4 * Math.PI * e.r * e.r;
        }
        let lx = ex - px, ly = ey - py, lz = ez - pz;
        const d2 = lx * lx + ly * ly + lz * lz, d = Math.sqrt(d2);
        lx /= d; ly /= d; lz /= d;
        const cs = lx * Nx + ly * Ny + lz * Nz, ce = -(lx * enx + ly * eny + lz * enz);
        if (cs > 0 && ce > 0 && !occluded(px, py, pz, lx, ly, lz, d - 2e-3)) {
          e.L(ex, ey, ez, Le, lx, ly, lz);
          const g = (cs * ce * area) / (d2 * Math.PI * pdfE);
          const cl = Math.min(g, 120);
          Lr += Tr * alb[0] * Le[0] * cl;
          Lg += Tg * alb[1] * Le[1] * cl;
          Lb += Tb * alb[2] * Le[2] * cl;
        }
      }
      // Cosine bounce
      Tr *= alb[0]; Tg *= alb[1]; Tb *= alb[2];
      const u1 = rnd(), u2 = rnd() * 6.2831853, r = Math.sqrt(u1), lx = r * Math.cos(u2), ly = r * Math.sin(u2), lz = Math.sqrt(1 - u1);
      const ax = Math.abs(Nx) > 0.9 ? 0 : 1, ay = ax ? 0 : 1;
      let tx = ay * Nz - 0 * Ny, ty = 0 * Nx - ax * Nz, tz = ax * Ny - ay * Nx;
      const il = 1 / Math.sqrt(tx * tx + ty * ty + tz * tz); tx *= il; ty *= il; tz *= il;
      const bx = Ny * tz - Nz * ty, by = Nz * tx - Nx * tz, bz = Nx * ty - Ny * tx;
      dx = tx * lx + bx * ly + Nx * lz; dy = ty * lx + by * ly + Ny * lz; dz = tz * lx + bz * ly + Nz * lz;
      ox = px; oy = py; oz = pz;
      specular = false;
      if (depth > 2) {
        const q = Math.max(Tr, Tg, Tb);
        if (q < 1e-3 || rnd() > q) break;
        Tr /= q; Tg /= q; Tb /= q;
      }
    }
    res[0] = Lr; res[1] = Lg; res[2] = Lb;
  }

  // Shift-lens camera: the view stays level so verticals stay vertical.
  const { pos, yaw = 0, focal, shiftY = 0, shiftX = 0 } = cam;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const res = [0, 0, 0];

  function ray(px, py) {
    const u = (px / W - 0.5) * 2 + shiftX, v = (0.5 - py / H) * 2 * (H / W) + shiftY;
    const x = u / focal, y = v / focal, z = -1;
    const dx = x * cy - z * sy * -1 * -1, dz = x * -sy * -1 * -1 + z * cy;
    const rx = cy * x + sy * z, rz = -sy * x + cy * z;
    const il = 1 / Math.sqrt(rx * rx + y * y + rz * rz);
    return [rx * il, y * il, rz * il];
  }

  parentPort.on("message", (row) => {
    if (row < 0) { parentPort.close(); process.exit(0); }
    for (let y = row; y < Math.min(H, row + 8); y++) {
      for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0;
        if (G) {
          // albedo (rgb) then a guide of normal + depth in a second file slot
          const [dx, dy, dz] = ray(x + 0.5, y + 0.5);
          if (closest(pos[0], pos[1], pos[2], dx, dy, dz, 1e9)) {
            const p = prims[hP], m = p.m;
            const hx = pos[0] + dx * hT, hy = pos[1] + dy * hT, hz = pos[2] + dz * hT;
            if (m.tex) m.tex(hx, hy, hz, nx, ny, nz, alb);
            else if (m.a) { alb[0] = m.a[0]; alb[1] = m.a[1]; alb[2] = m.a[2]; } else { alb[0] = alb[1] = alb[2] = 1; }
            // pack: albedo luma, encoded normal axis, depth; enough to guide the filter
            r = (alb[0] + alb[1] + alb[2]) / 3;
            g = (nx * 0.5 + 0.5) + 2 * Math.round(ny * 0.5 + 0.5) + 4 * Math.round(nz * 0.5 + 0.5) + hP * 8;
            b = hT;
          }
        } else {
          for (let i = 0; i < spp; i++) {
            // Tent filter
            const a = rnd() * 2, c = rnd() * 2;
            const fx = a < 1 ? Math.sqrt(a) - 1 : 1 - Math.sqrt(2 - a);
            const fy = c < 1 ? Math.sqrt(c) - 1 : 1 - Math.sqrt(2 - c);
            const [dx, dy, dz] = ray(x + 0.5 + fx, y + 0.5 + fy);
            radiance(pos[0], pos[1], pos[2], dx, dy, dz, res);
            const cl = 9;
            r += Math.min(res[0], cl); g += Math.min(res[1], cl); b += Math.min(res[2], cl);
          }
          r /= spp; g /= spp; b /= spp;
        }
        const k = (y * W + x) * 3;
        out[k] = r; out[k + 1] = g; out[k + 2] = b;
      }
    }
    parentPort.postMessage("row");
  });
  parentPort.postMessage("ready");
}
