// Parametric, dimensioned schematic for each estimating calculator (not to scale; proportions follow the inputs).
import type { Inputs } from "@/lib/calc";

const W = 420, H = 260;
const C = { top: "#e7c35a", left: "#b9c4d1", right: "#8e9bab", line: "#1e2b3c", dim: "#e9eef5", bar: "#c2410c", water: "#7cb7e8", bg: "#1e2b3c" };
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const fmt = (v: number) => `${Math.round(v * 1000) / 1000}`;

type P = [number, number];
const iso = (x: number, y: number, z: number): P => [(x - y) * 0.866, (x + y) * 0.5 - z];

/** Isometric box helper: returns face polygons for a box of size a (x) × b (y) × c (z) at origin, scaled to fit. */
function boxFaces(a: number, b: number, c: number, s: number, ox: number, oy: number, minPx = 6) {
  const A = a * s, B = b * s, Cc = Math.max(c * s, minPx);
  const p = (x: number, y: number, z: number): P => { const [u, v] = iso(x, y, z); return [ox + u, oy + v]; };
  const pts = (...q: P[]) => q.map((x) => x.join(",")).join(" ");
  return {
    top: pts(p(0, 0, Cc), p(A, 0, Cc), p(A, B, Cc), p(0, B, Cc)),
    left: pts(p(0, B, 0), p(A, B, 0), p(A, B, Cc), p(0, B, Cc)),
    right: pts(p(A, 0, 0), p(A, B, 0), p(A, B, Cc), p(A, 0, Cc)),
    p, A, B, Cc,
  };
}
/** Scale + origin so that a box a × b × c fits the canvas. */
function fit(a: number, b: number, c: number, pad = 60) {
  const s = Math.min((W - 2 * pad) / ((a + b) * 0.866), (H - 2 * pad + 20) / ((a + b) * 0.5 + c));
  const ox = W / 2 - ((a - b) * 0.866 * s) / 2, oy = H / 2 - (((a + b) * 0.5 - c) * s) / 2 - 4;
  return { s, ox, oy };
}
function Label({ x, y, t, anchor = "middle" }: { x: number; y: number; t: string; anchor?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} textAnchor={anchor} fontSize="12" fill={C.dim} stroke={C.bg} strokeWidth="4" paintOrder="stroke" fontFamily="system-ui, sans-serif">{t}</text>;
}
function DimLine({ a, b, t, off = 14 }: { a: P; b: P; t: string; off?: number }) {
  const [x1, y1] = a, [x2, y2] = b, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * off, ny = (dx / L) * off;
  return (
    <g stroke={C.dim} strokeWidth="1" fill="none">
      <line x1={x1 + nx} y1={y1 + ny} x2={x2 + nx} y2={y2 + ny} markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={(x1 + x2) / 2 + nx * 2.2} y={(y1 + y2) / 2 + ny * 2.2 + 4} textAnchor="middle" fontSize="12" fill={C.dim} stroke={C.bg} strokeWidth="4" paintOrder="stroke" fontFamily="system-ui, sans-serif">{t}</text>
    </g>
  );
}

function IsoBox({ a, b, c, la, lb, lc, extra, grid }: { a: number; b: number; c: number; la: string; lb: string; lc: string; extra?: (f: ReturnType<typeof boxFaces>) => React.ReactNode; grid?: number }) {
  const { s, ox, oy } = fit(a, b, c);
  const f = boxFaces(a, b, c, s, ox, oy);
  const { p, A, B, Cc } = f;
  const lines: React.ReactNode[] = [];
  if (grid && grid > 0) {
    const n = Math.min(14, Math.max(2, Math.round(a / grid)));
    const m = Math.min(14, Math.max(2, Math.round(b / grid)));
    for (let k = 1; k < n; k++) { const [x1, y1] = p((A * k) / n, 0, Cc), [x2, y2] = p((A * k) / n, B, Cc); lines.push(<line key={`a${k}`} x1={x1} y1={y1} x2={x2} y2={y2} />); }
    for (let k = 1; k < m; k++) { const [x1, y1] = p(0, (B * k) / m, Cc), [x2, y2] = p(A, (B * k) / m, Cc); lines.push(<line key={`b${k}`} x1={x1} y1={y1} x2={x2} y2={y2} />); }
  }
  return (
    <g>
      <polygon points={f.left} fill={C.left} stroke={C.line} />
      <polygon points={f.right} fill={C.right} stroke={C.line} />
      <polygon points={f.top} fill={C.top} stroke={C.line} />
      <g stroke={C.bar} strokeWidth="1.2" opacity=".85">{lines}</g>
      {extra?.(f)}
      <DimLine a={p(0, B, 0)} b={p(A, B, 0)} t={la} off={16} />
      <DimLine a={p(A, B, 0)} b={p(A, 0, 0)} t={lb} off={16} />
      <DimLine a={p(0, B, 0)} b={p(0, B, Cc)} t={lc} off={-16} />
    </g>
  );
}

export default function Sketch({ kind, i }: { kind: string; i: Inputs }) {
  let body: React.ReactNode = null, note = "Schematic illustration, not to scale";
  switch (kind) {
    case "footing": {
      const L = num(i.L, 1), Wd = num(i.W, 1), t = num(i.t, .3);
      body = <IsoBox a={L} b={Wd} c={t} la={`L ${fmt(L)} m`} lb={`W ${fmt(Wd)} m`} lc={`t ${fmt(t)} m`} grid={num(i.s, .15)}
        extra={(f) => { const { p, A, B, Cc } = f; const cs = Math.min(A, B) * 0.28; const pts = (q: P[]) => q.map((x) => x.join(",")).join(" ");
          const x0 = A / 2 - cs / 2, y0 = B / 2 - cs / 2, h = Math.min(90, Cc * 3 + 50);
          return <g stroke={C.line}><polygon points={pts([p(x0, y0 + cs, Cc), p(x0 + cs, y0 + cs, Cc), p(x0 + cs, y0 + cs, Cc + h), p(x0, y0 + cs, Cc + h)])} fill={C.left} />
            <polygon points={pts([p(x0 + cs, y0, Cc), p(x0 + cs, y0 + cs, Cc), p(x0 + cs, y0 + cs, Cc + h), p(x0 + cs, y0, Cc + h)])} fill={C.right} />
            <polygon points={pts([p(x0, y0, Cc + h), p(x0 + cs, y0, Cc + h), p(x0 + cs, y0 + cs, Cc + h), p(x0, y0 + cs, Cc + h)])} fill="#cfd8e3" /></g>; }} />;
      note = "Bar grids are spaced both ways after cover";
      break;
    }
    case "strip": { const L = num(i.L, 10), B = num(i.B, .6), t = num(i.t, .25); body = <IsoBox a={Math.min(L, B * 8)} b={B} c={t} la={`L ${fmt(L)} m (shown shortened)`} lb={`B ${fmt(B)} m`} lc={`t ${fmt(t)} m`} grid={num(i.st, .2)} />; break; }
    case "beam": {
      const L = num(i.L, 4), b = num(i.b, .25), h = num(i.h, .4);
      body = <IsoBox a={L} b={b} c={h} la={`L ${fmt(L)} m`} lb={`b ${fmt(b)}`} lc={`h ${fmt(h)}`}
        extra={(f) => { const { p, A, B, Cc } = f; const n = Math.min(24, Math.max(3, Math.round(L / num(i.ss, .15))));
          return <g stroke={C.bar} strokeWidth="1.2">{Array.from({ length: n - 1 }, (_, k) => { const x = (A * (k + 1)) / n; const [x1, y1] = p(x, B, 2), [x2, y2] = p(x, B, Cc - 2); return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} />; })}</g>; }} />;
      note = "Orange lines: stirrups at the entered spacing";
      break;
    }
    case "column": { const b = num(i.b, .3), h = num(i.h, .3), Hh = num(i.H, 3); body = <IsoBox a={b} b={h} c={Hh} la={`b ${fmt(b)}`} lb={`h ${fmt(h)}`} lc={`H ${fmt(Hh)} m`} />; break; }
    case "slab": { const L = num(i.L, 4), Wd = num(i.W, 3), t = num(i.t, .1); body = <IsoBox a={L} b={Wd} c={t} la={`L ${fmt(L)} m`} lb={`W ${fmt(Wd)} m`} lc={`t ${fmt(t)}`} grid={num(i.sx, .2)} />; break; }
    case "wall": { const L = num(i.L, 5), Hh = num(i.H, 2.5), t = num(i.t, .15); body = <IsoBox a={L} b={t} c={Hh} la={`L ${fmt(L)} m`} lb={`t ${fmt(t)}`} lc={`H ${fmt(Hh)} m`} />; break; }
    case "tank": {
      const L = num(i.L, 2), Wd = num(i.W, 1.5), Hh = num(i.H, 1.5), free = num(i.free, .15);
      body = <IsoBox a={L} b={Wd} c={Hh} la={`L ${fmt(L)} m`} lb={`W ${fmt(Wd)} m`} lc={`H ${fmt(Hh)} m`}
        extra={(f) => { const { p, A, B, Cc } = f; const wz = Cc * Math.max(0, (Hh - free) / Hh); const pts = (q: P[]) => q.map((x) => x.join(",")).join(" ");
          return <g><polygon points={pts([p(0, B, 0), p(A, B, 0), p(A, B, wz), p(0, B, wz)])} fill={C.water} opacity=".55" />
            <polygon points={pts([p(A, 0, 0), p(A, B, 0), p(A, B, wz), p(A, 0, wz)])} fill={C.water} opacity=".45" />
            <text {...(() => { const [x, y] = p(A * .5, B, wz * .5); return { x, y }; })()} textAnchor="middle" fontSize="11" fill="#0b2545" fontFamily="system-ui">water</text></g>; }} />;
      note = "Inside dimensions; water to inside height minus freeboard";
      break;
    }
    case "stand": {
      const Hs = num(i.Hs, 1), a = num(i.a, 1), panel = num(i.panel, 1), lv = Math.max(1, Math.ceil(Hs / panel - 1e-9));
      const { s, ox, oy } = fit(a, a, Hs + a * .9, 30); const p = (x: number, y: number, z: number): P => { const [u, v] = iso(x * s, y * s, z * s); return [ox + u, oy + v]; };
      const L = (q: P, r: P, k: string, w = 2.5, col = C.top) => <line key={k} x1={q[0]} y1={q[1]} x2={r[0]} y2={r[1]} stroke={col} strokeWidth={w} />;
      const legs = [[0, 0], [a, 0], [a, a], [0, a]] as const;
      const parts: React.ReactNode[] = legs.map(([x, y], k) => L(p(x, y, 0), p(x, y, Hs), `l${k}`, 3.5));
      for (let k = 1; k <= lv; k++) { const z = (Hs * k) / lv; legs.forEach(([x, y], j) => { const [x2, y2] = legs[(j + 1) % 4]; parts.push(L(p(x, y, z), p(x2, y2, z), `r${k}${j}`, 2, "#cfd8e3")); });
        if (i.brace !== "none") legs.forEach(([x, y], j) => { const [x2, y2] = legs[(j + 1) % 4]; const z0 = (Hs * (k - 1)) / lv; parts.push(L(p(x, y, z0), p(x2, y2, z), `d${k}${j}`, 1.3, "#9fb0c2")); if (i.brace === "X") parts.push(L(p(x2, y2, z0), p(x, y, z), `e${k}${j}`, 1.3, "#9fb0c2")); }); }
      const [cx, cy] = p(a / 2, a / 2, Hs); const rx = a * s * .62, th = Math.min(110, a * s * .85);
      parts.push(<g key="tank"><rect x={cx - rx} y={cy - th} width={2 * rx} height={th} fill={C.water} opacity=".75" stroke={C.line} /><ellipse cx={cx} cy={cy - th} rx={rx} ry={rx * .3} fill="#a9d2f3" stroke={C.line} /><ellipse cx={cx} cy={cy} rx={rx} ry={rx * .3} fill="none" stroke={C.line} />
        <text x={cx} y={cy - th / 2} textAnchor="middle" fontSize="12" fill="#0b2545" fontFamily="system-ui">{num(i.tankL, 500)} L</text></g>);
      body = <g>{parts}<DimLine a={p(0, a, 0)} b={p(0, a, Hs)} t={`H ${fmt(Hs)} m`} off={-18} /><DimLine a={p(0, a, 0)} b={p(a, a, 0)} t={`${fmt(a)} m`} off={16} /></g>;
      note = "Angle-bar legs, ties and bracing; tank shown on the platform";
      break;
    }
    case "chb": {
      const L = num(i.L, 5), Hh = num(i.H, 2.8), open = num(i.open, 0);
      const s = Math.min((W - 120) / L, (H - 80) / Hh), x0 = (W - L * s) / 2, y0 = (H - Hh * s) / 2 + 6, bw = .4 * s, bh = .2 * s;
      const blocks: React.ReactNode[] = [];
      for (let r = 0; r * .2 < Hh - 1e-9; r++) for (let c = -1; c * .4 < L; c++) { const x = x0 + c * bw + (r % 2 ? bw / 2 : 0); const xx = Math.max(x0, x), ww = Math.min(x0 + L * s, x + bw) - xx; if (ww > 1) blocks.push(<rect key={`${r}-${c}`} x={xx} y={y0 + Hh * s - (r + 1) * bh} width={ww} height={Math.min(bh, Hh * s - r * bh)} fill="#cfd8e3" stroke="#7d8b9b" strokeWidth=".6" />); }
      const ow = open > 0 ? Math.min(L * .4, Math.sqrt(open * 1.2)) : 0, oh = open > 0 ? Math.min(Hh * .7, open / Math.max(ow, .01)) : 0;
      const sv = num(i.sv, .6), every = num(i.every, 3);
      const vb = Array.from({ length: Math.floor(L / sv) + 1 }, (_, k) => <line key={`v${k}`} x1={x0 + k * sv * s} y1={y0} x2={x0 + k * sv * s} y2={y0 + Hh * s} stroke={C.bar} strokeWidth="1.4" />);
      const hb = Array.from({ length: Math.floor(Hh / .2 / every) }, (_, k) => <line key={`h${k}`} x1={x0} x2={x0 + L * s} y1={y0 + Hh * s - (k + 1) * every * bh} y2={y0 + Hh * s - (k + 1) * every * bh} stroke={C.bar} strokeWidth="1.4" strokeDasharray="5 3" />);
      body = <g>{blocks}{vb}{hb}{ow > 0 && <rect x={x0 + L * s * .55} y={y0 + Hh * s * .2} width={ow * s} height={oh * s} fill={C.bg} stroke={C.dim} strokeDasharray="4 3" />}
        <DimLine a={[x0, y0 + Hh * s]} b={[x0 + L * s, y0 + Hh * s]} t={`L ${fmt(L)} m`} off={16} /><DimLine a={[x0, y0 + Hh * s]} b={[x0, y0]} t={`H ${fmt(Hh)} m`} off={-16} /></g>;
      note = `Elevation: vertical bars @ ${sv} m, horizontal every ${every} courses${open > 0 ? "; dashed box = openings" : ""}`;
      break;
    }
    case "plaster": {
      const th = num(i.th, 16), faces = num(i.faces, 2), x0 = 150, y0 = 40, h = 180, cw = 70, pw = Math.max(8, th * 1.4);
      body = <g><rect x={x0} y={y0} width={cw} height={h} fill="#cfd8e3" stroke="#7d8b9b" />{Array.from({ length: 9 }, (_, k) => <line key={k} x1={x0} x2={x0 + cw} y1={y0 + k * 20} y2={y0 + k * 20} stroke="#7d8b9b" strokeWidth=".6" />)}
        <rect x={x0 + cw} y={y0} width={pw} height={h} fill={C.top} stroke={C.line} />{faces === 2 && <rect x={x0 - pw} y={y0} width={pw} height={h} fill={C.top} stroke={C.line} />}
        <DimLine a={[x0 + cw, y0 + h]} b={[x0 + cw + pw, y0 + h]} t={`${th} mm`} off={16} /><Label x={x0 + cw / 2} y={y0 - 8} t="CHB / concrete" /><Label x={x0 + cw + pw + 10} y={y0 + h / 2} t="plaster" anchor="start" /></g>;
      note = `Section: ${faces === 2 ? "both faces" : "one face"} plastered`;
      break;
    }
    case "septic": {
      const L = num(i.L, 2.4), Wd = num(i.W, 1.2), ch = num(i.ch, 2);
      const s = Math.min((W - 190) / L, (H - 90) / Wd), x0 = (W - L * s) / 2, y0 = (H - Wd * s) / 2, t = Math.max(6, (num(i.size, 150) / 1000) * s);
      const walls = ch === 3 ? [L * 0.5, L * 0.75] : [L * 2 / 3];
      body = <g><rect x={x0 - t} y={y0 - t} width={L * s + 2 * t} height={Wd * s + 2 * t} fill="#8e9bab" stroke={C.line} /><rect x={x0} y={y0} width={L * s} height={Wd * s} fill={C.water} opacity=".55" />
        {walls.map((w, k) => <rect key={k} x={x0 + w * s - t / 2} y={y0} width={t} height={Wd * s} fill="#8e9bab" stroke={C.line} />)}
        {(ch === 3 ? ["1", "2", "3"] : ["1 (settling)", "2"]).map((c, k, arr) => { const xs = [0, ...walls, L]; return <text key={k} x={x0 + ((xs[k] + xs[k + 1]) / 2) * s} y={y0 + Wd * s / 2 + 4} textAnchor="middle" fontSize="12" fill="#0b2545" fontFamily="system-ui, sans-serif">{c}</text>; })}
        <Label x={x0 - t - 6} y={y0 + Wd * s / 2 - 8} t="inlet →" anchor="end" /><Label x={x0 + L * s + t + 6} y={y0 + Wd * s - 6} t="→ outlet" anchor="start" />
        <DimLine a={[x0, y0 + Wd * s + t]} b={[x0 + L * s, y0 + Wd * s + t]} t={`L ${fmt(L)} m`} off={14} /><DimLine a={[x0 + L * s + t, y0]} b={[x0 + L * s + t, y0 + Wd * s]} t={`W ${fmt(Wd)} m`} off={-14} /></g>;
      note = `Plan: ${ch} chambers, CHB walls; outlet lower than inlet`;
      break;
    }
    case "stairs": {
      const k = Math.max(1, Math.round(num(i.steps, 9))), R = num(i.R, .175), T = num(i.T, .25), tw = num(i.tw, .15);
      const s = Math.min((W - 120) / (k * T), (H - 70) / (k * R + tw)), x0 = 60, y0 = H - 35;
      const pts: P[] = [[x0, y0]]; for (let j = 0; j < k; j++) { const [x, y] = pts[pts.length - 1]; pts.push([x, y - R * s], [x + T * s, y - R * s]); }
      const ang = Math.atan2(k * R, k * T), off = tw * s / Math.cos(ang);
      const [ex, ey] = pts[pts.length - 1];
      body = <g><polygon points={[...pts, [ex, ey + off], [x0, y0 + off]].map((q) => q.join(",")).join(" ")} fill={C.left} stroke={C.line} />
        <line x1={x0 + 6} y1={y0 + off - 5} x2={ex - 6} y2={ey + off - 5} stroke={C.bar} strokeWidth="1.5" />
        <DimLine a={[pts[1][0], pts[1][1]]} b={[pts[0][0], pts[0][1]]} t={`R ${R}`} off={14} /><DimLine a={[pts[1][0], pts[1][1]]} b={[pts[2][0], pts[2][1]]} t={`T ${T}`} off={-12} />
        <Label x={(x0 + ex) / 2 + 40} y={(y0 + ey) / 2 + off + 14} t={`waist ${tw} m · ${k} risers`} anchor="start" /></g>;
      note = "Side view: steps on an inclined waist slab; orange = main bars";
      break;
    }
    case "lumber": {
      body = <g><polygon points="70,150 300,90 350,110 120,170" fill={C.top} stroke={C.line} /><polygon points="120,170 350,110 350,140 120,200" fill={C.right} stroke={C.line} /><polygon points="70,150 120,170 120,200 70,180" fill={C.left} stroke={C.line} />
        <Label x={210} y={95} t="L (ft)" /><Label x={60} y={200} t="t × w (in)" anchor="start" /><Label x={240} y={225} t="Board feet = pcs × t × w × L / 12" /></g>;
      note = "Board foot = 1 in × 12 in × 1 ft";
      break;
    }
  }
  return (
    <figure className="sketch">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Schematic: ${kind}`}>
        <defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={C.dim} /></marker></defs>
        <rect width={W} height={H} fill={C.bg} rx="10" />
        {body}
      </svg>
      <figcaption>{note} · schematic, not to scale</figcaption>
    </figure>
  );
}
