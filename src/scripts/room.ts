// The live room. Each lighting circuit was rendered as its own layer, so the
// browser can add them together in linear light, exactly as the lamps would.
// A second canvas holds the hidden-line drawing and cable routes from the same
// camera. If WebGL isn't available, the fully lit poster stays in place.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { asset } from "../data/site";

gsap.registerPlugin(ScrollTrigger);
// Keep to real time on slow devices, so the room never stalls mid-sequence.
gsap.ticker.lagSmoothing(0);

type Pt = [number, number];
interface RoomData {
  w: number; h: number;
  lines: number[][];
  circles: [number, number, number][];
  spots: Pt[];
  routes: Record<string, Pt[][]>;
}

/** Linework all but disappears once the room is lit. */
const RESTING_LINES = 0.04;
const CIRCUITS = ["pendants", "downlights", "joinery"] as const;
type Circuit = (typeof CIRCUITS)[number];
const GAIN: Record<string, number> = { dusk: 1.7, pendants: 1, downlights: 0.85, joinery: 1 };

const root = document.querySelector<HTMLElement>("[data-room]");
if (root) start(root);

function start(root: HTMLElement) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tall = matchMedia("(max-aspect-ratio: 1/1)").matches;
  const name = tall ? "kitchen-tall" : "kitchen-wide";
  const gl = root.querySelector<HTMLCanvasElement>("[data-room-gl]")!;
  const ink = root.querySelector<HTMLCanvasElement>("[data-room-ink]")!;
  const switches = [...document.querySelectorAll<HTMLButtonElement>("[data-circuit]")];
  const master = document.querySelector<HTMLButtonElement>("[data-circuit-master]");
  const cut = root.querySelector<HTMLElement>("[data-room-reveal]");

  // Everything animatable lives here; render() draws from it.
  const state = {
    drawn: 0, // how much of the drawing is on screen
    drawing: 0.32, // strength of the linework while it draws
    xray: 0, // 0 finished room, 1 behind the plaster
    pendants: 0, downlights: 0, joinery: 0,
    routePendants: 0, routeDownlights: 0, routeJoinery: 0,
    dusk: 0.35,
  };
  const on: Record<Circuit, boolean> = { pendants: true, downlights: true, joinery: true };

  let glCtx: WebGLRenderingContext | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let data: RoomData | null = null;
  let scale = 1;
  const inkCtx = ink.getContext("2d");

  const setup = async () => {
    const res = await fetch(asset(`/renders/${name}.json`));
    data = (await res.json()) as RoomData;
    const imgs = await Promise.all(
      ["dusk", ...CIRCUITS].map(
        (p) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = asset(`/renders/${name}-${p}.webp`);
          }),
      ),
    );
    const { w, h } = data;
    gl.width = w; gl.height = h;
    scale = Math.min(2, 2200 / w);
    ink.width = w * scale; ink.height = h * scale;
    glCtx = gl.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!glCtx) throw new Error("no webgl");
    const c = glCtx;
    const vs = c.createShader(c.VERTEX_SHADER)!;
    c.shaderSource(vs, `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`);
    c.compileShader(vs);
    const fs = c.createShader(c.FRAGMENT_SHADER)!;
    c.shaderSource(fs, `precision mediump float;
      varying vec2 uv;
      uniform sampler2D d, a, b, e;
      uniform vec4 k;
      uniform float expo;
      vec3 lin(vec4 t){ return t.rgb * t.rgb * 4.0; }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 c = lin(texture2D(d,uv))*k.x + lin(texture2D(a,uv))*k.y + lin(texture2D(b,uv))*k.z + lin(texture2D(e,uv))*k.w;
        c *= expo;
        c = (c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);
        c = pow(clamp(c,0.,1.), vec3(1./2.2));
        c += (rnd(gl_FragCoord.xy)-.5)/200.;
        gl_FragColor = vec4(c,1.);
      }`);
    c.compileShader(fs);
    const pr = c.createProgram()!;
    c.attachShader(pr, vs); c.attachShader(pr, fs); c.linkProgram(pr); c.useProgram(pr);
    const buf = c.createBuffer();
    c.bindBuffer(c.ARRAY_BUFFER, buf);
    c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), c.STATIC_DRAW);
    const loc = c.getAttribLocation(pr, "p");
    c.enableVertexAttribArray(loc);
    c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
    imgs.forEach((im, i) => {
      c.activeTexture(c.TEXTURE0 + i);
      c.bindTexture(c.TEXTURE_2D, c.createTexture());
      c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, im);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
    });
    c.uniform1i(c.getUniformLocation(pr, "d"), 0);
    c.uniform1i(c.getUniformLocation(pr, "a"), 1);
    c.uniform1i(c.getUniformLocation(pr, "b"), 2);
    c.uniform1i(c.getUniformLocation(pr, "e"), 3);
    uniforms = { k: c.getUniformLocation(pr, "k"), expo: c.getUniformLocation(pr, "expo") };
  };

  function polyLen(pl: Pt[]) {
    let l = 0;
    for (let i = 1; i < pl.length; i++) l += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    return l;
  }

  function strokePartial(ctx: CanvasRenderingContext2D, pl: Pt[], t: number) {
    const target = polyLen(pl) * t;
    let run = 0;
    ctx.beginPath();
    ctx.moveTo(pl[0][0], pl[0][1]);
    for (let i = 1; i < pl.length; i++) {
      const seg = Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
      if (run + seg >= target) {
        const k = (target - run) / (seg || 1);
        ctx.lineTo(pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * k, pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * k);
        break;
      }
      ctx.lineTo(pl[i][0], pl[i][1]);
      run += seg;
    }
    ctx.stroke();
  }

  const ROUTE_COL: Record<Circuit, string> = { pendants: "#e9a765", downlights: "#8cb5e6", joinery: "#8fd08f" };
  const ROUTE_KEY: Record<Circuit, "routePendants" | "routeDownlights" | "routeJoinery"> = { pendants: "routePendants", downlights: "routeDownlights", joinery: "routeJoinery" };

  function render() {
    if (glCtx) {
      const dim = 1 - state.xray * 0.86;
      const ca = state.pendants * dim, cb = state.downlights * dim, cc = state.joinery * dim;
      glCtx.uniform4f(uniforms.k!, state.dusk * GAIN.dusk, ca * GAIN.pendants, cb * GAIN.downlights, cc * GAIN.joinery);
      glCtx.uniform1f(uniforms.expo!, 0.9);
      glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
    }
    if (!inkCtx || !data) return;
    const c = inkCtx;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, data.w, data.h);
    c.lineCap = "round";
    const strength = Math.max(state.drawing, state.xray * 0.8);
    if (strength > 0.005 && state.drawn > 0) {
      c.strokeStyle = `rgba(226,233,240,${strength})`;
      c.lineWidth = 1;
      const n = data.lines.length;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const local = Math.max(0, Math.min(1, state.drawn * (1 + 0.6) - (i / n) * 0.6));
        if (local <= 0) continue;
        const [x0, y0, x1, y1] = data.lines[i];
        c.moveTo(x0, y0);
        c.lineTo(x0 + (x1 - x0) * local, y0 + (y1 - y0) * local);
      }
      c.stroke();
    }
    for (const key of CIRCUITS) {
      const t = state[ROUTE_KEY[key]];
      const vis = Math.max(t > 0 && t < 1 ? 1 : 0, on[key] ? state.xray : state.xray * 0.3);
      if (vis <= 0.004) continue;
      c.strokeStyle = ROUTE_COL[key];
      c.globalAlpha = vis;
      c.lineWidth = 1.6;
      const list = data.routes[key] ?? [];
      const draw = t > 0 && t < 1 ? t : 1;
      for (const pl of list) if (pl.length > 1) strokePartial(c, pl, draw);
      c.globalAlpha = 1;
    }
  }

  function syncSwitch(key: Circuit) {
    const btn = switches.find((b) => b.dataset.circuit === key);
    btn?.setAttribute("aria-checked", String(on[key]));
  }
  function syncMaster() {
    if (master) master.textContent = CIRCUITS.some((k) => on[k]) ? "All off" : "All on";
  }

  function setCircuit(key: Circuit, value: boolean, instant = false, delay = 0) {
    on[key] = value;
    syncSwitch(key);
    syncMaster();
    const rk = ROUTE_KEY[key];
    gsap.killTweensOf(state, `${key},${rk}`);
    if (instant || reduced) {
      state[key] = value ? 1 : 0;
      state[rk] = 0;
      render();
      return;
    }
    if (value) {
      // The route draws from the switch, and the lamp comes up as it arrives.
      state[rk] = 0.001;
      gsap.to(state, { [rk]: 0.999, duration: 0.75, delay, ease: "power1.inOut", onUpdate: render, onComplete: () => { state[rk] = 0; render(); } });
      gsap.to(state, { [key]: 1, duration: 0.8, delay: delay + 0.55, ease: "power2.out", onUpdate: render });
    } else {
      state[rk] = 0;
      gsap.to(state, { [key]: 0, duration: 0.45, delay, ease: "power2.in", onUpdate: render });
    }
  }

  const activate = () => {
    root.classList.add("is-ready");
    switches.forEach((b) => {
      b.disabled = false;
      b.addEventListener("click", () => setCircuit(b.dataset.circuit as Circuit, !on[b.dataset.circuit as Circuit]));
    });
    master?.removeAttribute("disabled");
    master?.addEventListener("click", () => {
      const next = !CIRCUITS.some((k) => on[k]);
      CIRCUITS.forEach((k, i) => setCircuit(k, next, false, next ? i * 0.12 : 0));
    });
  };

  const opening = () => {
    // If the poster was restored, or this isn't a first visit, skip the sequence.
    const opensDark = document.documentElement.classList.contains("room-opening");
    if (reduced || !opensDark) {
      state.drawn = 1; state.dusk = 1; state.drawing = RESTING_LINES;
      CIRCUITS.forEach((k) => { state[k] = 1; });
      render();
      return;
    }
    sessionStorage.setItem("lw-opened", "1");
    CIRCUITS.forEach((k) => { on[k] = false; syncSwitch(k); });
    root.classList.add("is-dark");
    gsap.timeline()
      .to(state, { drawn: 1, duration: 1.5, ease: "power1.inOut", onUpdate: render })
      .to(state, { dusk: 1, duration: 1.4, ease: "power1.inOut", onUpdate: render }, 0.3)
      .call(() => setCircuit("pendants", true), undefined, 1.25)
      .call(() => setCircuit("joinery", true), undefined, 1.65)
      .call(() => setCircuit("downlights", true), undefined, 2.05)
      .to(state, { drawing: RESTING_LINES, duration: 1, ease: "power1.inOut", onUpdate: render }, 2.2)
      .call(() => document.documentElement.classList.remove("room-opening"));
  };

  const scrollPlay = () => {
    const scene = document.querySelector<HTMLElement>("[data-hero-scene]");
    if (!scene || reduced) {
      if (cut) cut.dataset.state = "open";
      return;
    }
    ScrollTrigger.create({
      trigger: scene,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        const p = self.progress;
        const x = gsap.utils.clamp(0, 1, (p - 0.12) / 0.55);
        if (x !== state.xray) { state.xray = x; render(); }
        scene.style.setProperty("--xray", String(x));
      },
    });
  };

  setup()
    .then(() => {
      render();
      activate();
      opening();
      scrollPlay();
    })
    .catch(() => {
      // The poster and text already work, so the switches just stay disabled.
      root.classList.add("is-static");
      document.documentElement.classList.remove("room-opening");
      document.querySelector("[data-circuits]")?.setAttribute("hidden", "");
    });

}
