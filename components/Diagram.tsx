// SVG diagram engine for Practice cards. Pure render (no client JS) so it works in
// server components, static export and the future API.
import type { BoltsSpec, ColumnSpec, DiagramSpec, SectionSpec, SpanSpec, ZoneStatus } from "@/lib/diagram";
import { STATUS_LABEL } from "@/lib/diagram";

const C = {
  ink: "#1f2a37", muted: "#6b7280", line: "#cbd2d9",
  safe: "#dbe9f7", safeS: "#2f6fb3",
  avoid: "#fbe3cc", avoidS: "#c56a1d",
  confine: "#f3d98b", confineS: "#9a7413",
  neutral: "#f1efe9", neutralS: "#b8b2a3",
  concrete: "#e9e6df", bar: "#1e2b3c", joint: "#2f6fb3",
};
const fill = (s: ZoneStatus = "neutral") =>
  s === "avoid" ? "url(#hatch-avoid)" : s === "safe" ? C.safe : s === "confine" ? "url(#hatch-confine)" : C.neutral;
const stroke = (s: ZoneStatus = "neutral") =>
  s === "avoid" ? C.avoidS : s === "safe" ? C.safeS : s === "confine" ? C.confineS : C.neutralS;

function Defs() {
  return (
    <defs>
      <pattern id="hatch-avoid" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="10" height="10" fill={C.avoid} />
        <line x1="0" y1="0" x2="0" y2="10" stroke="#e9a46a" strokeWidth="4" />
      </pattern>
      <pattern id="hatch-confine" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" fill="#fbf1d2" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#e8c96a" strokeWidth="3" />
      </pattern>
      <pattern id="hatch-support" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#eef0f4" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#aab3c2" strokeWidth="1.5" />
      </pattern>
    </defs>
  );
}

const T = (p: React.SVGProps<SVGTextElement> & { children: React.ReactNode }) => (
  <text fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fill={C.ink} {...p} />
);

function DimLine({ x1, x2, y, label }: { x1: number; x2: number; y: number; label?: string }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.ink} strokeWidth="1" />
      {[x1, x2].map((x, i) => <line key={i} x1={x - 5} y1={y + 5} x2={x + 5} y2={y - 5} stroke={C.ink} strokeWidth="1.2" />)}
      {[x1, x2].map((x, i) => <line key={`v${i}`} x1={x} y1={y - 8} x2={x} y2={y + 8} stroke={C.ink} strokeWidth=".8" />)}
      {label && (
        <>
          <rect x={(x1 + x2) / 2 - label.length * 4.6 - 6} y={y - 11} width={label.length * 9.2 + 12} height="22" fill="#fff" />
          <T x={(x1 + x2) / 2} y={y + 5} textAnchor="middle" fontSize="15" fontWeight="700">{label}</T>
        </>
      )}
    </g>
  );
}

function Legend({ y, items }: { y: number; items: ZoneStatus[] }) {
  const names: Record<ZoneStatus, string> = { safe: "Safe zone", avoid: "Avoid", confine: "Confinement zone", neutral: "" };
  let x = 30;
  return (
    <g>
      {items.map((s) => {
        const g = (
          <g key={s}>
            <rect x={x} y={y - 10} width="26" height="12" rx="3" fill={fill(s)} stroke={stroke(s)} />
            <T x={x + 32} y={y} fontSize="12" fill={C.muted}>{names[s]}</T>
          </g>
        );
        x += 40 + names[s].length * 7;
        return g;
      })}
      <line x1={x} y1={y - 4} x2={x + 26} y2={y - 4} stroke={C.bar} strokeWidth="3" />
      <T x={x + 32} y={y} fontSize="12" fill={C.muted}>Main rebar</T>
    </g>
  );
}

/* ---------------- SPAN ---------------- */
function Span({ s }: { s: SpanSpec }) {
  const W = 800, x0 = 120, x1 = 700, L = x1 - x0;
  const top = 62, hM = s.bands === "top-bottom" ? 76 : 50, bot = top + hM;
  const mid = top + hM / 2;
  const colW = 34;
  let acc = 0;
  const zx = s.zones.map((z) => { const a = x0 + acc * L; acc += z.w; return { a, b: x0 + acc * L, z }; });
  const usedStatuses = new Set<ZoneStatus>();
  s.zones.forEach((z) => [z.top, z.bottom, z.status].forEach((v) => v && v !== "neutral" && usedStatuses.add(v)));

  const dimY = bot + (s.support === "beam" ? 70 : 40);
  const chipY = dimY + 34;
  const rowsH = s.bands === "top-bottom" ? 2 * 30 : 30;
  const diaTop = chipY + rowsH + 26;
  const diaH = s.diagram ? 90 : 0;
  const H = diaTop + diaH + (s.diagram ? 30 : 0) + 30;

  // moment / shear curve
  let curve: React.ReactNode = null;
  if (s.diagram) {
    const base = diaTop + diaH / 2, k = s.diagram === "shear" ? 70 : 260;
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const v = s.diagram === "shear" ? (0.5 - t) : (t * (1 - t) - 1 / 6); // fixed-end: −1/12 ends, +1/24 mid (×2)
      const y = s.diagram === "shear" ? base - k * v * 0.9 : base + k * v * 0.55;
      pts.push(`${x0 + t * L},${y.toFixed(1)}`);
    }
    curve = (
      <g>
        <polygon points={`${x0},${base} ${pts.join(" ")} ${x1},${base}`} fill="#d5dbe5" stroke="#5b6b82" strokeWidth="1.5" />
        <line x1={x0} y1={base} x2={x1} y2={base} stroke={C.ink} strokeWidth="1" />
        <T x={30} y={base + 4} fontSize="12" fontWeight="700" fill={C.muted}>{s.diagram === "shear" ? "V" : "M"}</T>
        {s.diagram === "moment-continuous" ? (
          <>
            <T x={x0 + L / 2} y={base + 32} textAnchor="middle" fontSize="12" fill={C.muted}>+ midspan: bottom in tension</T>
            <T x={x1} y={base - 50} textAnchor="end" fontSize="12" fill={C.muted}>− at supports: top in tension</T>
          </>
        ) : (
          <T x={x0 + L / 2} y={diaTop - 4} textAnchor="middle" fontSize="12" fill={C.muted}>Highest at supports, lowest at midspan</T>
        )}
      </g>
    );
  }

  const bandRows: { key: "top" | "bottom" | "status"; y: number; h: number; label: string }[] =
    s.bands === "top-bottom"
      ? [{ key: "top", y: top, h: hM / 2, label: "TOP BARS" }, { key: "bottom", y: mid, h: hM / 2, label: "BOTTOM BARS" }]
      : [{ key: "status", y: top, h: hM, label: "" }];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.caption ?? "Span diagram"} style={{ width: "100%", height: "auto" }}>
      <Defs />
      {/* zone fills */}
      {bandRows.map((r) => zx.map(({ a, b, z }, i) => {
        const st = (r.key === "status" ? z.status : z[r.key]) as ZoneStatus | undefined;
        return <rect key={`${r.key}${i}`} x={a} y={r.y} width={b - a} height={r.h} fill={fill(st)} />;
      }))}
      {zx.slice(1).map(({ a }, i) => <line key={`d${i}`} x1={a} y1={top - 8} x2={a} y2={dimY} stroke={C.muted} strokeDasharray="4 4" strokeWidth="1" />)}
      {s.bands === "top-bottom" && <line x1={x0} y1={mid} x2={x1} y2={mid} stroke={C.muted} strokeDasharray="3 3" />}
      <rect x={x0} y={top} width={L} height={hM} fill="none" stroke={C.ink} strokeWidth="2" />

      {/* bars */}
      {s.bands === "top-bottom" ? (
        <>
          <line x1={x0 - 10} y1={top + 12} x2={x1 + 10} y2={top + 12} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
          <line x1={x0 - 10} y1={bot - 12} x2={x1 + 10} y2={bot - 12} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1={x0 - 10} y1={top + 10} x2={x1 + 10} y2={top + 10} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
          <line x1={x0 - 10} y1={bot - 10} x2={x1 + 10} y2={bot - 10} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {s.lap?.map((l, i) => {
        const cx = x0 + l.at * L, y = l.band === "top" ? top + 22 : bot - 22, len = 70;
        return (
          <g key={`lap${i}`}>
            <line x1={cx - len / 2} y1={y} x2={cx + len / 2} y2={y} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
            <line x1={cx - len / 2} y1={l.band === "top" ? top - 6 : bot + 6} x2={cx + len / 2} y2={l.band === "top" ? top - 6 : bot + 6} stroke={C.ink} />
            <T x={cx} y={l.band === "top" ? top - 12 : bot + 20} textAnchor="middle" fontSize="11" fontWeight="700">LAP</T>
          </g>
        );
      })}
      {s.joint && (
        <g>
          <line x1={x0 + s.joint.at * L} y1={top - 18} x2={x0 + s.joint.at * L} y2={bot + 18} stroke={C.joint} strokeWidth="6" strokeLinecap="round" />
          <T x={x0 + s.joint.at * L} y={top - 24} textAnchor="middle" fontSize="12" fontWeight="700" fill={C.joint}>{s.joint.label ?? "Construction joint"}</T>
        </g>
      )}

      {/* supports */}
      {s.support === "beam"
        ? [x0, x1].map((x, i) => (
            <g key={i}>
              <rect x={x - 26 + (i === 0 ? 10 : -10)} y={bot} width="52" height="44" fill="url(#hatch-support)" stroke={C.ink} strokeWidth="1.5" />
              <T x={x + (i === 0 ? 10 : -10)} y={bot + 62} textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="2">BEAM</T>
            </g>
          ))
        : [x0 - colW, x1].map((x, i) => (
            <g key={i}>
              <rect x={x} y={top - 28} width={colW} height={hM + 56} fill="url(#hatch-support)" stroke={C.ink} strokeWidth="1.5" />
              <T x={x + colW / 2} y={top - 36} textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="1">COL</T>
            </g>
          ))}
      {s.bands === "top-bottom" && (
        <>
          <T x={x0 + L / 2} y={14} textAnchor="middle" fontSize="11" fill={C.muted}>Upper band: top bars · Lower band: bottom bars</T>
        </>
      )}

      {/* dimensions */}
      {zx.map(({ a, b }, i) => <DimLine key={`dim${i}`} x1={a} x2={b} y={dimY} label={s.dims?.[i]} />)}
      {s.spanLabel && <T x={x0 + L / 2} y={dimY + 22} textAnchor="middle" fontSize="11" fill={C.muted}>{s.spanLabel}</T>}

      {/* status chips per zone */}
      {bandRows.map((r, ri) => (
        <g key={`row${ri}`}>
          {r.label && <T x={8} y={chipY + ri * 30 + 16} fontSize="10.5" fontWeight="800" letterSpacing=".5">{r.label}</T>}
          {zx.map(({ a, b, z }, i) => {
            const st = (r.key === "status" ? z.status : z[r.key]) as ZoneStatus | undefined;
            if (!st || st === "neutral") return null;
            return (
              <g key={i}>
                <rect x={a + 4} y={chipY + ri * 30} width={b - a - 8} height="24" rx="4" fill={fill(st)} stroke={stroke(st)} strokeWidth="1.5" />
                <T x={(a + b) / 2} y={chipY + ri * 30 + 16} textAnchor="middle" fontSize="12" fontWeight="800" fill={stroke(st)}>
                  {st === "safe" ? "✓ " : st === "avoid" ? "✕ " : ""}{STATUS_LABEL[st]}
                </T>
              </g>
            );
          })}
        </g>
      ))}

      {curve}
      <Legend y={H - 12} items={[...usedStatuses]} />
    </svg>
  );
}

/* ---------------- COLUMN ---------------- */
function Column({ s }: { s: ColumnSpec }) {
  const W = 800, H = 600, cx = 400, cw = 90, y0 = 70, y1 = 490, Hc = y1 - y0;
  let acc = 0;
  const zy = s.zones.map((z) => { const a = y0 + acc * Hc; acc += z.h; return { a, b: y0 + acc * Hc, z }; });
  const used = new Set<ZoneStatus>(s.zones.map((z) => z.status).filter((x) => x !== "neutral"));
  const hoopYs: number[] = [];
  zy.forEach(({ a, b, z }) => {
    const step = s.hoops === "confined-ends" && z.status === "confine" ? 14 : 30;
    for (let y = a + step / 2; y < b; y += step) hoopYs.push(y);
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.caption ?? "Column diagram"} style={{ width: "100%", height: "auto" }}>
      <Defs />
      {/* slabs/beams above and below */}
      <rect x={cx - 230} y={y0 - 46} width="460" height="46" fill="url(#hatch-support)" stroke={C.ink} strokeWidth="1.5" />
      <rect x={cx - 230} y={y1} width="460" height="46" fill="url(#hatch-support)" stroke={C.ink} strokeWidth="1.5" />
      <T x={cx - 222} y={y0 - 18} fontSize="11" fontWeight="800" letterSpacing="2">BEAM / SLAB</T>
      <T x={cx - 222} y={y1 + 28} fontSize="11" fontWeight="800" letterSpacing="2">BEAM / SLAB</T>
      {zy.map(({ a, b, z }, i) => <rect key={i} x={cx - cw / 2} y={a} width={cw} height={b - a} fill={fill(z.status)} />)}
      <rect x={cx - cw / 2} y={y0} width={cw} height={Hc} fill="none" stroke={C.ink} strokeWidth="2" />
      {hoopYs.map((y, i) => <line key={i} x1={cx - cw / 2 + 8} y1={y} x2={cx + cw / 2 - 8} y2={y} stroke="#5b6b82" strokeWidth="1.6" />)}
      {[cx - cw / 2 + 14, cx + cw / 2 - 14].map((x, i) => <line key={i} x1={x} y1={y0 - 40} x2={x} y2={y1 + 40} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />)}
      {s.lap && (
        <g>
          <line x1={cx - cw / 2 + 22} y1={y0 + s.lap.from * Hc} x2={cx - cw / 2 + 22} y2={y0 + s.lap.to * Hc} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
          <line x1={cx + cw / 2 - 22} y1={y0 + s.lap.from * Hc} x2={cx + cw / 2 - 22} y2={y0 + s.lap.to * Hc} stroke={C.bar} strokeWidth="4" strokeLinecap="round" />
          <T x={cx} y={y0 + ((s.lap.from + s.lap.to) / 2) * Hc + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" stroke="#fff" strokeWidth="3">LAP</T>
          <T x={cx} y={y0 + ((s.lap.from + s.lap.to) / 2) * Hc + 4} textAnchor="middle" fontSize="11" fontWeight="800">LAP</T>
        </g>
      )}
      {/* dims left */}
      {zy.map(({ a, b }, i) => (
        <g key={`d${i}`}>
          <line x1={cx - 150} y1={a} x2={cx - 150} y2={b} stroke={C.ink} />
          {[a, b].map((y, j) => <line key={j} x1={cx - 156} y1={y + 6} x2={cx - 144} y2={y - 6} stroke={C.ink} strokeWidth="1.2" />)}
          {s.dims?.[i] && <T x={cx - 160} y={(a + b) / 2 + 5} textAnchor="end" fontSize="15" fontWeight="700">{s.dims[i]}</T>}
          <line x1={cx - 150} y1={a} x2={cx - cw / 2} y2={a} stroke={C.muted} strokeDasharray="4 4" />
        </g>
      ))}
      {/* chips right */}
      {zy.map(({ a, b, z }, i) => z.status !== "neutral" && (
        <g key={`c${i}`}>
          <rect x={cx + cw / 2 + 30} y={(a + b) / 2 - 14} width="190" height="28" rx="4" fill={fill(z.status)} stroke={stroke(z.status)} strokeWidth="1.5" />
          <T x={cx + cw / 2 + 40} y={(a + b) / 2 + 5} fontSize="12" fontWeight="800" fill={stroke(z.status)}>
            {z.status === "safe" ? "✓ " : z.status === "avoid" ? "✕ " : ""}{STATUS_LABEL[z.status]}{z.label ? ` · ${z.label}` : ""}
          </T>
        </g>
      ))}
      <T x={cx - 150} y={y1 + 72} fontSize="11" fill={C.muted}>Clear height = face of beam/slab to face of beam/slab</T>
      <Legend y={H - 6} items={[...used]} />
    </svg>
  );
}

/* ---------------- SECTION ---------------- */
function Section({ s }: { s: SectionSpec }) {
  const W = 800, H = 420, box = 300;
  const sc = box / Math.max(s.b, s.h);
  const bw = s.b * sc, bh = s.h * sc, x = 250 - bw / 2, y = 40 + (box - bh) / 2;
  const cov = 26, r = 9;
  const bars: [number, number][] = [];
  const row = (n: number, yy: number) => {
    for (let i = 0; i < n; i++) bars.push([x + cov + r + (n === 1 ? (bw - 2 * cov - 2 * r) / 2 : (i * (bw - 2 * cov - 2 * r)) / (n - 1)), yy]);
  };
  if (s.shape === "column") {
    const n = s.barsPerSide ?? 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1)
        bars.push([x + cov + r + (i * (bw - 2 * cov - 2 * r)) / (n - 1), y + cov + r + (j * (bh - 2 * cov - 2 * r)) / (n - 1)]);
    }
  } else {
    if (s.barsTop) row(s.barsTop, y + cov + r);
    if (s.barsBottom) row(s.barsBottom, y + bh - cov - r);
  }
  const call = (k: string) => s.callouts.find((c) => c.kind === k)?.label;
  const marks: React.ReactNode[] = [];
  const notes: { ax: number; ay: number; text: string; color: string }[] = [];
  if (call("cover-top")) {
    marks.push(<line key="ct" x1={x + bw / 2 - 30} y1={y} x2={x + bw / 2 - 30} y2={y + cov} stroke={C.avoidS} strokeWidth="3" />);
    notes.push({ ax: x + bw / 2 - 30, ay: y + cov / 2, text: call("cover-top")!, color: C.avoidS });
  }
  if (call("cover-side")) {
    marks.push(<line key="cs" x1={x + bw} y1={y + bh / 2} x2={x + bw - cov} y2={y + bh / 2} stroke={C.avoidS} strokeWidth="3" />);
    notes.push({ ax: x + bw - cov / 2, ay: y + bh / 2, text: call("cover-side")!, color: C.avoidS });
  }
  if (call("clear-spacing") && bars.length > 1) {
    const [a, b] = s.shape === "column" ? [bars[0], bars[1]] : [bars[bars.length - 2], bars[bars.length - 1]];
    const yy = s.shape === "column" ? a[1] : a[1] - 18;
    marks.push(<line key="sp" x1={a[0] + r} y1={yy} x2={b[0] - r} y2={yy} stroke={C.safeS} strokeWidth="3" />);
    notes.push({ ax: (a[0] + b[0]) / 2, ay: yy, text: call("clear-spacing")!, color: C.safeS });
  }
  if (call("cover-bottom")) {
    marks.push(<line key="cb" x1={x + bw / 2 + 30} y1={y + bh} x2={x + bw / 2 + 30} y2={y + bh - cov} stroke={C.avoidS} strokeWidth="3" />);
    notes.push({ ax: x + bw / 2 + 30, ay: y + bh - cov / 2, text: call("cover-bottom")!, color: C.avoidS });
  }
  notes.sort((p, q2) => p.ay - q2.ay);
  let ly = 0;
  const items = notes.map((n, i) => {
    ly = Math.max(ly + 44, n.ay);
    return (
      <g key={i}>
        <polyline points={`${n.ax},${n.ay} ${x + bw + 40},${ly} 470,${ly}`} fill="none" stroke={n.color} strokeWidth="1.2" />
        <circle cx={n.ax} cy={n.ay} r="3" fill={n.color} />
        <T x={478} y={ly + 5} fontSize="14" fontWeight="700" fill={n.color}>{n.text}</T>
      </g>
    );
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.caption ?? "Section diagram"} style={{ width: "100%", height: "auto" }}>
      <Defs />
      <rect x={x} y={y} width={bw} height={bh} fill={C.concrete} stroke={C.ink} strokeWidth="2" />
      <rect x={x + cov - 6} y={y + cov - 6} width={bw - 2 * cov + 12} height={bh - 2 * cov + 12} rx="8" fill="none" stroke="#5b6b82" strokeWidth="2.5" />
      {bars.map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={r} fill={C.bar} />)}
      {marks}
      {items}
      <T x={x} y={y + bh + 34} fontSize="12" fill={C.muted}>{s.shape.toUpperCase()} SECTION · tie/stirrup shown in grey</T>
    </svg>
  );
}

/* ---------------- BOLTS ---------------- */
function Bolts({ s }: { s: BoltsSpec }) {
  const W = 800, H = 430, gap = 80, edge = 50, r = 14;
  const pw = (s.cols - 1) * gap + 2 * edge, ph = (s.rows - 1) * gap + 2 * edge;
  const x0 = 260 - pw / 2, y0 = 40 + (300 - ph) / 2;
  const holes: [number, number][] = [];
  for (let c = 0; c < s.cols; c++) for (let w = 0; w < s.rows; w++) holes.push([x0 + edge + c * gap, y0 + edge + w * gap]);
  const lbl = (x: number, y: number, t?: string, anchor: "start" | "middle" | "end" = "middle") =>
    t ? <T x={x} y={y} textAnchor={anchor} fontSize="14" fontWeight="700">{t}</T> : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.caption ?? "Bolt pattern"} style={{ width: "100%", height: "auto" }}>
      <Defs />
      <rect x={x0} y={y0} width={pw} height={ph} fill="#eef0f4" stroke={C.ink} strokeWidth="2" />
      {holes.map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r={r} fill="#fff" stroke={C.ink} strokeWidth="2" /><circle cx={x} cy={y} r={r - 5} fill={C.bar} /></g>
      ))}
      {s.rows > 1 && (
        <g>
          <line x1={x0 - 24} y1={y0 + edge} x2={x0 - 24} y2={y0 + edge + gap} stroke={C.ink} />
          {[y0 + edge, y0 + edge + gap].map((y, i) => <line key={i} x1={x0 - 30} y1={y + 6} x2={x0 - 18} y2={y - 6} stroke={C.ink} strokeWidth="1.2" />)}
          {lbl(x0 - 34, y0 + edge + gap / 2 + 5, s.labels.pitch, "end")}
        </g>
      )}
      {s.cols > 1 && <><line x1={x0 + edge} y1={y0 + ph + 26} x2={x0 + edge + gap} y2={y0 + ph + 26} stroke={C.ink} />{lbl(x0 + edge + gap / 2, y0 + ph + 46, s.labels.gauge)}</>}
      <line x1={x0} y1={y0 - 16} x2={x0 + edge} y2={y0 - 16} stroke={C.avoidS} strokeWidth="2" />
      {lbl(x0 + edge / 2, y0 - 24, s.labels.edge)}
      <line x1={x0 + pw + 16} y1={y0} x2={x0 + pw + 16} y2={y0 + edge} stroke={C.avoidS} strokeWidth="2" />
      {lbl(x0 + pw + 24, y0 + edge / 2 + 5, s.labels.end, "start")}
      {s.load && (
        <g>
          <line x1={x0 + pw / 2} y1={y0 + ph / 2} x2={x0 + pw + 170} y2={y0 + ph / 2} stroke={C.muted} strokeDasharray="5 4" />
          <line x1={x0 + pw + 170} y1={y0 + ph / 2 - 60} x2={x0 + pw + 170} y2={y0 + ph / 2 + 50} stroke={C.joint} strokeWidth="4" />
          <polygon points={`${x0 + pw + 162},${y0 + ph / 2 + 44} ${x0 + pw + 178},${y0 + ph / 2 + 44} ${x0 + pw + 170},${y0 + ph / 2 + 62}`} fill={C.joint} />
          <T x={x0 + pw + 180} y={y0 + ph / 2 - 64} fontSize="14" fontWeight="800" fill={C.joint}>P</T>
          {lbl(x0 + pw + 85, y0 + ph / 2 - 10, s.load.e)}
        </g>
      )}
      <T x={x0} y={H - 14} fontSize="12" fill={C.muted}>Plate with {s.rows * s.cols} bolts · distances to hole centers</T>
    </svg>
  );
}

export default function Diagram({ spec }: { spec: DiagramSpec }) {
  if (!spec || typeof spec !== "object") return null;
  switch (spec.type) {
    case "span": return <Span s={spec} />;
    case "column": return <Column s={spec} />;
    case "section": return <Section s={spec} />;
    case "bolts": return <Bolts s={spec} />;
    default: return null;
  }
}
