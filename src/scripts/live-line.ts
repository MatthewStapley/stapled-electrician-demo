// The three-core line. A cable may only run straight and turn square, so one
// centre route is built through the page from [data-line-node] anchors, with
// real arcs at the corners. Live, neutral and earth are true parallels of that
// route, and the earth is genuinely striped green and yellow.
//
// Everything is measured by distance along the route, not by page height. A
// horizontal run has no height, so a height-based mapping draws it in one frame.
// Instead, buildMap() gives each run its own stretch of scrolling, and the head
// eases towards its target, so runs sweep across at any scroll speed.
//
// It's drawn on a fixed canvas rather than a page-tall SVG: only the viewport
// repaints, and the striped earth keeps its pattern while it reveals.
//
// Sections marked [data-energise] switch on when the head reaches them.

const canvas = document.querySelector<HTMLCanvasElement>("[data-live-line]");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where in the viewport the head tracks, as a share of its height. */
const FOCUS = 0.62;
/** Longest stretch of scrolling a horizontal run may take, as a share of viewport height. */
const RUN_WINDOW = 0.6;
/** Easing time constant in ms: lower follows scrolling more tightly. */
const EASE_MS = 110;
/** Half-width in px of the filter that softens speed changes at corners. */
const SOFTEN = 60;
/** Fastest the head may travel: viewport widths per second on runs, px per second otherwise. */
const RUN_SPEED = 2.4;
const MAX_SPEED = 6500;
const MAP_STEP = 4;

if (canvas) {
  const ctx = canvas.getContext("2d")!;
  type P = { x: number; y: number };

  // Centre line, sampled through corners. nx, ny is the unit normal at each point.
  let px: number[] = [], py: number[] = [], nx: number[] = [], ny: number[] = [], dist: number[] = [];
  let total = 0;
  let map = new Float32Array(1); // target y to distance along the route
  let mapStart = 0;

  let dark: { top: number; bottom: number }[] = [];
  let energise: { el: Element; y: number }[] = [];
  let vw = 0, vh = 0, dpr = 1, gap = 5, lw = 2, radius = 22;
  let head = 0, goal = 0, reach = -Infinity, lastTime = 0, running = false;

  const docY = (el: Element) => el.getBoundingClientRect().top + scrollY;

  /** Square route through the anchors, without collinear points. */
  function corners(): P[] {
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-line-node]")];
    if (!nodes.length) return [];
    const rail = vw < 761 ? 11 : Math.max(26, Math.min(vw * 0.031, 46));
    const pts: P[] = [{ x: rail, y: docY(nodes[0]) }];
    let x = rail;
    for (const n of nodes) {
      const y = docY(n);
      const nextX = n.dataset.lineNode === "right" ? vw - rail : rail;
      pts.push({ x, y });
      if (nextX !== x) { pts.push({ x: nextX, y }); x = nextX; }
    }
    const unique = pts.filter((p, i, a) => !i || p.x !== a[i - 1].x || p.y !== a[i - 1].y);
    return unique.filter((p, i, a) => {
      const prev = a[i - 1], next = a[i + 1];
      return !(prev && next && ((prev.x === p.x && p.x === next.x) || (prev.y === p.y && p.y === next.y)));
    });
  }

  /** Sample straight runs and true arcs into one continuous, measured path. */
  function flatten(route: P[]) {
    px = []; py = []; nx = []; ny = []; dist = [];
    total = 0;
    if (route.length < 2) return;
    const add = (x: number, y: number, tx: number, ty: number) => {
      const i = px.length;
      dist.push(i ? dist[i - 1] + Math.hypot(x - px[i - 1], y - py[i - 1]) : 0);
      px.push(x); py.push(y); nx.push(-ty); ny.push(tx);
    };
    const unit = (a: P, b: P) => {
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (b.x - a.x) / l, y: (b.y - a.y) / l, l };
    };
    const u0 = unit(route[0], route[1]);
    add(route[0].x, route[0].y, u0.x, u0.y);
    for (let i = 1; i < route.length - 1; i++) {
      const p = route[i];
      const a = unit(route[i - 1], p), b = unit(p, route[i + 1]);
      const r = Math.min(radius, a.l / 2, b.l / 2);
      const sx = p.x - a.x * r, sy = p.y - a.y * r; // arc start
      const cx = sx + b.x * r, cy = sy + b.y * r; // arc centre
      add(sx, sy, a.x, a.y);
      const STEPS = 14;
      for (let k = 1; k <= STEPS; k++) {
        const th = (k / STEPS) * (Math.PI / 2), c = Math.cos(th), s = Math.sin(th);
        add(cx + r * (a.x * s - b.x * c), cy + r * (a.y * s - b.y * c), a.x * c + b.x * s, a.y * c + b.y * s);
      }
    }
    const n = route.length - 1;
    const u1 = unit(route[n - 1], route[n]);
    add(route[n].x, route[n].y, u1.x, u1.y);
    total = dist[dist.length - 1];
  }

  /** Distance along the path of the sampled point closest to p. */
  function distanceAt(p: P) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < px.length; i++) {
      const d = Math.abs(px[i] - p.x) + Math.abs(py[i] - p.y);
      if (d < bd) { bd = d; best = dist[i]; }
    }
    return best;
  }

  /**
   * Scroll to distance. Vertical runs track the page. Each horizontal run gets
   * a window of scrolling centred on it, where the head crosses at a steady
   * rate. Speeds are then softened so corners don't change gear.
   */
  function buildMap(route: P[]) {
    if (!route.length) return;
    const scrollMax = document.documentElement.scrollHeight - vh;
    const end = route[route.length - 1].y;
    const targetMax = Math.min(end, scrollMax + vh * FOCUS);
    const knots: { t: number; s: number }[] = [{ t: route[0].y, s: 0 }];

    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
      if (a.y !== b.y) continue;
      const from = Math.max(0, distanceAt(a) - radius * 0.8);
      const to = Math.min(total, distanceAt(b) + radius * 0.8);
      const w = Math.min(to - from, vh * RUN_WINDOW);
      const last = knots[knots.length - 1];
      const t0 = Math.max(last.t + 1, a.y - w / 2);
      knots.push({ t: t0, s: from }, { t: t0 + w, s: to });
    }
    knots.push({ t: Math.max(targetMax, knots[knots.length - 1].t + 1), s: total });

    mapStart = knots[0].t;
    const n = Math.ceil((knots[knots.length - 1].t - mapStart) / MAP_STEP) + 2;
    const raw = new Float32Array(n);
    for (let i = 0, k = 0; i < n; i++) {
      const t = mapStart + i * MAP_STEP;
      while (k < knots.length - 2 && t > knots[k + 1].t) k++;
      const A = knots[k], B = knots[k + 1];
      raw[i] = A.s + (B.s - A.s) * Math.max(0, Math.min(1, (t - A.t) / (B.t - A.t)));
    }
    // A box filter keeps the map monotonic and rounds off the kinks.
    const half = Math.round(SOFTEN / MAP_STEP);
    const sum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + raw[i];
    map = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // The window narrows towards each end, so the line starts and stops cleanly.
      const h = Math.min(half, i, n - 1 - i);
      map[i] = (sum[i + h + 1] - sum[i - h]) / (2 * h + 1);
    }
  }

  function targetDistance() {
    if (reduced) return total;
    const f = (scrollY + vh * FOCUS - mapStart) / MAP_STEP;
    if (f <= 0) return 0;
    if (f >= map.length - 1) return total;
    const i = Math.floor(f);
    return map[i] + (map[i + 1] - map[i]) * (f - i);
  }

  function indexAt(s: number) {
    let lo = 0, hi = dist.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (dist[mid] <= s) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /** Trace one conductor from the start of the route to the head. */
  function trace(offset: number, end: number, frac: number) {
    ctx.beginPath();
    for (let i = 0; i <= end; i++) {
      const x = px[i] + nx[i] * offset, y = py[i] + ny[i] * offset - scrollY;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    if (end < px.length - 1 && frac > 0) {
      const j = end + 1;
      const ax = px[end] + nx[end] * offset, ay = py[end] + ny[end] * offset;
      const bx = px[j] + nx[j] * offset, by = py[j] + ny[j] * offset;
      ctx.lineTo(ax + (bx - ax) * frac, ay + (by - ay) * frac - scrollY);
    }
  }

  function band(top: number, bottom: number, onDark: boolean, end: number, frac: number) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - scrollY, vw, bottom - top);
    ctx.clip();
    ctx.lineWidth = lw; ctx.lineCap = "butt"; ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.strokeStyle = onDark ? "#c98448" : "#8a4a1c";
    trace(-gap, end, frac); ctx.stroke();
    ctx.strokeStyle = onDark ? "#6c9bd2" : "#2a5f9f";
    trace(0, end, frac); ctx.stroke();
    ctx.strokeStyle = onDark ? "#6fb36f" : "#2f8340";
    trace(gap, end, frac); ctx.stroke();
    ctx.setLineDash([9, 9]);
    ctx.strokeStyle = "#e2c62c";
    ctx.stroke();
    ctx.restore();
  }

  const isDark = (y: number) => dark.some((d) => y >= d.top && y <= d.bottom);

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (px.length < 2 || head <= 0) return;

    const s = Math.min(head, total);
    const end = indexAt(s);
    const segLen = (dist[end + 1] ?? dist[end]) - dist[end];
    const frac = segLen ? (s - dist[end]) / segLen : 0;

    const edges = [scrollY, scrollY + vh, ...dark.flatMap((d) => [d.top, d.bottom])]
      .filter((y) => y >= scrollY && y <= scrollY + vh)
      .sort((a, b) => a - b);
    for (let i = 0; i < edges.length - 1; i++) {
      if (edges[i + 1] - edges[i] > 0.5) band(edges[i], edges[i + 1], isDark((edges[i] + edges[i + 1]) / 2), end, frac);
    }

    const j = Math.min(end + 1, px.length - 1);
    const hx = px[end] + (px[j] - px[end]) * frac, hy = py[end] + (py[j] - py[end]) * frac;

    // A terminal across all three cores, square to the direction of travel.
    if (s < total) {
      const out = gap + lw + 1;
      ctx.setLineDash([]);
      ctx.lineWidth = 4;
      ctx.lineCap = "butt";
      ctx.strokeStyle = isDark(hy) ? "#eef0ec" : "#141c29";
      ctx.beginPath();
      ctx.moveTo(hx - nx[end] * out, hy - ny[end] * out - scrollY);
      ctx.lineTo(hx + nx[end] * out, hy + ny[end] * out - scrollY);
      ctx.stroke();
    }

    // Never leave something on screen dark while the head catches up after a fling.
    reach = Math.max(reach, hy, scrollY + vh * 0.55);
    for (const e of energise) if (reach > e.y) e.el.classList.add("is-live");
  }

  function frame(now: number) {
    // A frame's timestamp can precede the time wake() recorded.
    const dt = Math.max(1, Math.min(64, now - lastTime));
    lastTime = now;
    goal = targetDistance();
    let step = (goal - head) * (1 - Math.exp(-dt / EASE_MS));
    // Speed limits: a hard fling still sweeps through runs instead of skipping them.
    const onRun = Math.abs(ny[indexAt(Math.min(head, total))] ?? 0) > 0.7;
    const limit = ((onRun ? Math.max(900, vw * RUN_SPEED) : MAX_SPEED) * dt) / 1000;
    step = Math.max(-limit, Math.min(limit, step));
    head += step;
    if (Math.abs(goal - head) < 0.4) head = goal;
    draw();
    if (head !== goal) requestAnimationFrame(frame);
    else running = false;
  }

  function wake() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  let measures = 0;
  function measure() {
    measures++;
    dpr = Math.min(devicePixelRatio || 1, 2);
    vw = document.documentElement.clientWidth;
    vh = innerHeight;
    canvas!.width = vw * dpr;
    canvas!.height = vh * dpr;
    const small = vw < 761;
    gap = small ? 3 : 5; lw = small ? 1.5 : 2; radius = small ? 12 : 22;

    const route = corners();
    flatten(route);
    buildMap(route);
    dark = [...document.querySelectorAll(".dusk")].map((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top + scrollY, bottom: r.bottom + scrollY };
    });
    energise = [...document.querySelectorAll("[data-energise]")].map((el) => ({ el, y: docY(el) }));
    // The layout changed, so place the line rather than animating it there.
    head = goal = targetDistance();
    draw();
  }

  if (reduced) document.querySelectorAll("[data-energise]").forEach((e) => e.classList.add("is-live"));
  else document.documentElement.classList.add("line-armed");

  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", measure, { passive: true });
  new ResizeObserver(measure).observe(document.body);
  document.fonts?.ready.then(measure);
  measure();

  if (import.meta.env.DEV) {
    // Read by the motion tests in development only.
    (window as unknown as Record<string, unknown>).__line = () => {
      const s = Math.min(head, total), i = indexAt(s), j = Math.min(i + 1, px.length - 1);
      const f = (s - dist[i]) / ((dist[j] - dist[i]) || 1);
      return { head, goal, total, x: px[i] + (px[j] - px[i]) * f, y: py[i] + (py[j] - py[i]) * f, measures };
    };
  }
}
