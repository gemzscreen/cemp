"use client";
// v2.7.0 Beam Optimizer. Size a singly reinforced RC beam (b, h, bars, stirrups) for the level's span and loads at the
// lowest cost that passes NSCP 2015 bending, shear, bar fit and deflection. All math is lib/beam (pure, works offline).
// Scores go through the shared game queue (lib/truss/store, game "beam").
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BEAM_LEVELS, beamLevelById, evaluate, costOf, budgetOf, starsOf, hOptions, OPTIONS, PRICES, PRICE_NOTE, ASSUME_NOTE, COVER, HANGER, FY, FYT, type BeamLevel, type Design, type Result } from "@/lib/beam";
import { recordRun, flush, localBests } from "@/lib/truss/store";

const peso = (x: number) => "₱" + Math.round(x).toLocaleString("en-PH");
const DKEY = (l: number) => `cemp-beam-draft-${l}`;
const loadDraft = (l: number): Design | null => { try { const v = localStorage.getItem(DKEY(l)); return v ? JSON.parse(v) : null; } catch { return null; } };
const saveDraft = (l: number, x: Design) => { try { localStorage.setItem(DKEY(l), JSON.stringify(x)); } catch {} };
const same = (a: Design, b: Design) => (Object.keys(a) as (keyof Design)[]).every((k) => a[k] === b[k]);

type Out = { res: Result; stars: number; design: Design } | null;

export default function BeamOptimizer() {
  const sp = useSearchParams();
  const [lvId, setLvId] = useState(() => beamLevelById(Number(sp.get("l") ?? 1)).id);
  const lv = beamLevelById(lvId);
  const go = (id: number) => { setLvId(id); try { window.history.replaceState(null, "", `/games/beam?l=${id}`); } catch {} };
  const [x, setX] = useState<Design>(lv.start);
  const [out, setOut] = useState<Out>(null);
  const [showBest, setShowBest] = useState(false);
  const [best, setBest] = useState<{ stars: number; best_cost: number | null } | null>(null);

  useEffect(() => { setX(loadDraft(lv.id) ?? lv.start); setOut(null); setShowBest(false); setBest(localBests("beam")[lv.id] ?? null); flush(); }, [lv.id, lv.start]);
  useEffect(() => { saveDraft(lv.id, x); }, [lv.id, x]);

  const cost = useMemo(() => costOf(lv, x), [lv, x]);
  const budget = budgetOf(lv);
  const stale = out && !same(out.design, x);
  const hs = hOptions(lv);

  function setK<K extends keyof Design>(k: K, v: Design[K]) { setX((p) => ({ ...p, [k]: v })); }
  function step(k: keyof Design, list: readonly number[], dir: number) {
    setX((p) => { const i = list.indexOf(p[k]), j = Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + dir)); return { ...p, [k]: list[j] }; });
  }
  async function test() {
    const res = evaluate(lv, x), stars = starsOf(lv, res);
    setOut({ res, stars, design: x }); setShowBest(false);
    await recordRun({ level: lv.id, passed: res.pass, stars, cost: res.cost.total, weight: Math.round(res.cost.kg * 10) / 10, max_ratio: Math.round(res.maxRatio * 1000) / 1000, design: x as never, std: true }, "beam");
    setBest(localBests("beam")[lv.id] ?? null);
    setTimeout(() => document.getElementById("bo-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const zone = cost.total <= budget ? "g3" : "g2";
  const pct = Math.min(100, (cost.total / (budget * 1.5)) * 100), mark = (1 / 1.5) * 100;
  const sup = lv.support === "simple" ? "simple span" : "cantilever";
  const pt = lv.PD || lv.PL ? ` + point ${lv.PD ?? 0} D / ${lv.PL ?? 0} L kN at ${lv.support === "simple" ? "midspan" : "the tip"}` : "";

  return (
    <div className="bo">
      <div className="tb-head">
        <div>
          <div className="crumbs"><Link href="/games">Games</Link> › Beam Optimizer</div>
          <h1 style={{ margin: ".1rem 0" }}>Level {lv.id}: {lv.name}</h1>
          <p className="sub" style={{ margin: 0 }}>{lv.blurb}</p>
        </div>
        <select className="tb-level" value={lv.id} onChange={(e) => go(Number(e.target.value))} aria-label="Level">
          {BEAM_LEVELS.map((l) => <option key={l.id} value={l.id}>Level {l.id}: {l.name}</option>)}
        </select>
      </div>

      <div className="tb-facts">
        <span><b>{lv.L} m</b> {sup}</span>
        <span>D <b>{lv.wD}</b> kN/m + self-weight, L <b>{lv.wL}</b> kN/m{pt}</span>
        <span>f&apos;c <b>{lv.fc}</b> MPa · fy {FY} · fyt {FYT} MPa · cover {COVER} mm</span>
        {lv.hMax && <span>Headroom: h ≤ <b>{lv.hMax} mm</b></span>}
        <span>Budget <b>{peso(budget)}</b> (2★) · 3★ within 2% of the cheapest passing beam</span>
        {best && <span>Your best <b>{"★".repeat(best.stars) || "–"}</b>{best.best_cost != null && <> · {peso(best.best_cost)}</>}</span>}
      </div>

      <div className={`tb-meter cpm-meter ${zone}`}>
        <div className="tm-top"><div className="tm-main">
          <span className="tm-lbl">Beam cost</span><b className="tm-cost">{peso(cost.total)}</b>
          <span className="fine">{cost.total <= budget ? `${peso(budget - cost.total)} under budget` : `${peso(cost.total - budget)} over budget`}</span>
        </div></div>
        <div className="tm-bar"><i style={{ width: `${pct}%` }} /><span className="tm-mark" style={{ left: `${mark}%` }}><em>budget</em></span></div>
        <div className="tm-sub">
          <span>Concrete {cost.vol.toFixed(3)} m³ × {peso(PRICES[lv.fc])} = {peso(cost.concrete)}</span>
          <span>Formwork {cost.area.toFixed(2)} m² × {peso(PRICES.form)} = {peso(cost.formwork)}</span>
          <span>Rebar {cost.kg.toFixed(1)} kg × {peso(PRICES.steel)} = {peso(cost.steel)}</span>
        </div>
      </div>

      <div className="bo-draw">
        <div className="bo-elev"><Elevation lv={lv} x={x} nStir={cost.nStir} /></div>
        <div className="bo-sec"><Section lv={lv} x={x} /></div>
      </div>

      <div className="bo-ctrl">
        <Stepper label="Width b" unit="mm" value={x.b} onDown={() => step("b", OPTIONS.b, -1)} onUp={() => step("b", OPTIONS.b, 1)} min={x.b === OPTIONS.b[0]} max={x.b === OPTIONS.b.at(-1)} />
        <Stepper label="Depth h" unit="mm" value={x.h} onDown={() => step("h", hs, -1)} onUp={() => step("h", hs, 1)} min={x.h === hs[0]} max={x.h === hs.at(-1)} />
        <Stepper label={`${lv.support === "simple" ? "Bottom" : "Top"} bars n`} unit="pcs" value={x.n} onDown={() => step("n", OPTIONS.n, -1)} onUp={() => step("n", OPTIONS.n, 1)} min={x.n === OPTIONS.n[0]} max={x.n === OPTIONS.n.at(-1)} />
        <Chips label="Bar size (mm)" list={OPTIONS.db} value={x.db} on={(v) => setK("db", v)} />
        <Chips label="Stirrup size (mm)" list={OPTIONS.ds} value={x.ds} on={(v) => setK("ds", v)} />
        <Stepper label="Stirrup spacing s" unit="mm" value={x.s} onDown={() => step("s", OPTIONS.s, -1)} onUp={() => step("s", OPTIONS.s, 1)} min={x.s === OPTIONS.s[0]} max={x.s === OPTIONS.s.at(-1)} />
      </div>
      <p className="fine bo-sum">Design: {x.b} × {x.h} mm, {x.n} – {x.db} mm {lv.support === "simple" ? "bottom" : "top"} bars, 2 – {HANGER} mm hangers, {x.ds} mm stirrups @ {x.s} mm ({cost.nStir} pcs).</p>

      <div className="tb-run">
        <button type="button" className="btn" style={{ marginTop: 0 }} onClick={test} disabled={!!out && !stale}>▶ Load test</button>
        <button type="button" className="btn ghost tb-cross" onClick={() => { setX(lv.start); setOut(null); }}>↺ Start design</button>
        {stale && <span className="fine">Design changed since the last test: test again.</span>}
      </div>

      {out && (
        <section className={`panel tb-results ${stale ? "bo-stale" : ""}`} id="bo-result">
          <div className="tb-verdict">
            <span className={`tb-badge ${out.res.pass ? "ok" : "bad"}`}>{out.res.pass ? "PASSED" : "FAILED"}</span>
            <span className="tb-stars">{[1, 2, 3].map((i) => <span key={i} className={i <= out.stars ? "on" : ""}>★</span>)}</span>
            <span>Cost <b>{peso(out.res.cost.total)}</b> · budget {peso(budget)} · Mu {out.res.Mu.toFixed(1)} kN·m, Vu {out.res.Vu.toFixed(1)} kN ({out.res.combo} governs bending)</span>
          </div>
          {out.res.pass && lv.best && <p className="fine">{out.stars === 3 ? "Within 2% of the cheapest passing beam: optimum found." : `${peso(out.res.cost.total - lv.best.cost)} above the cheapest passing beam (${(((out.res.cost.total - lv.best.cost) / lv.best.cost) * 100).toFixed(1)}%). Look at the lowest ratio below: that is where material is wasted.`}</p>}
          <div className="bo-checks">
            {out.res.checks.map((c) => (
              <details key={c.key} className={`bo-chk ${c.ok ? "ok" : "bad"}`} open={!c.ok}>
                <summary>
                  <span className="bo-cl"><b>{c.ok ? "✓" : "✕"} {c.label}</b><small>{c.clause}</small></span>
                  <span className="bo-ratio" title="demand / capacity"><i style={{ width: `${Math.min(100, (c.ratio / 1.5) * 100)}%` }} /><em style={{ left: `${100 / 1.5}%` }} /></span>
                  <span className="bo-rv">{c.ratio.toFixed(2)}</span>
                </summary>
                <p className="bo-det">{c.detail}</p>
                <ol>{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </details>
            ))}
          </div>
          <details className="tb-loads"><summary>Quantities</summary>
            <div className="tbl-wrap"><table><tbody>
              <tr><td>Concrete</td><td>{out.res.cost.vol.toFixed(3)} m³</td></tr>
              <tr><td>Formwork (soffit + 2 sides)</td><td>{out.res.cost.area.toFixed(2)} m²</td></tr>
              <tr><td>Main bars</td><td>{out.res.cost.kgMain.toFixed(1)} kg</td></tr>
              <tr><td>Hangers 2 – {HANGER} mm</td><td>{out.res.cost.kgHang.toFixed(1)} kg</td></tr>
              <tr><td>Stirrups ({out.res.cost.nStir} pcs)</td><td>{out.res.cost.kgStir.toFixed(1)} kg</td></tr>
            </tbody></table></div>
          </details>
          {out.res.pass && lv.best && <>
            <button type="button" className="chip" onClick={() => setShowBest((v) => !v)}>{showBest ? "Hide" : "Show"} the cheapest passing beam</button>
            {showBest && <p>Cheapest: {lv.best.design.b} × {lv.best.design.h} mm, {lv.best.design.n} – {lv.best.design.db} mm bars, {lv.best.design.ds} mm stirrups @ {lv.best.design.s} mm: {peso(lv.best.cost)}.
              {" "}<button type="button" className="chip" onClick={() => { setX(lv.best!.design); setOut(null); }}>Load it</button></p>}
          </>}
          <p className="fine"><span className="badge b-review">verify</span> {ASSUME_NOTE} {PRICE_NOTE}</p>
        </section>
      )}
    </div>
  );
}

function Stepper({ label, unit, value, onDown, onUp, min, max }: { label: string; unit: string; value: number; onDown: () => void; onUp: () => void; min: boolean; max: boolean }) {
  return (
    <div className="bo-field"><span className="bo-lab">{label}</span>
      <div className="cpm-step">
        <button type="button" onClick={onDown} disabled={min} aria-label={`${label} down`}>−</button>
        <span>{value}<small> {unit}</small></span>
        <button type="button" onClick={onUp} disabled={max} aria-label={`${label} up`}>+</button>
      </div>
    </div>
  );
}
function Chips({ label, list, value, on }: { label: string; list: readonly number[]; value: number; on: (v: number) => void }) {
  return (
    <div className="bo-field"><span className="bo-lab">{label}</span>
      <div className={`bo-chips ${list.length <= 2 ? "c2" : ""}`}>{list.map((v) => <button key={v} type="button" className={v === value ? "on" : ""} onClick={() => on(v)} aria-pressed={v === value}>{v}</button>)}</div>
    </div>
  );
}

/** Elevation: supports, loads, stirrups at the chosen spacing and the main bars on the tension face. */
function Elevation({ lv, x, nStir }: { lv: BeamLevel; x: Design; nStir: number }) {
  const W = 640, x0 = 50, x1 = 600, len = x1 - x0, top = 78, dh = Math.max(22, x.h * 0.1), cant = lv.support === "cantilever";
  const k = len / (lv.L * 1000), cy = (COVER + x.ds) * 0.1 + 2;
  const stir = Array.from({ length: nStir }, (_, i) => x0 + (50 + i * x.s) * k).filter((p) => p <= x1 - 2);
  const arrows = Array.from({ length: 12 }, (_, i) => x0 + (i + 0.5) * (len / 12));
  const px = cant ? x1 : (x0 + x1) / 2, hasP = !!(lv.PD || lv.PL);
  return (
    <svg viewBox={`0 0 ${W} 200`} width="100%" role="img" aria-label="Beam elevation">
      <defs><marker id="bo-ar" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L5 10 L10 0 z" fill="#3b4e66" /></marker>
        <pattern id="bo-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#7d8da3" strokeWidth="2" /></pattern></defs>
      {/* UDL */}
      <line x1={x0} y1={top - 30} x2={x1} y2={top - 30} className="bo-udl" />
      {arrows.map((a) => <line key={a} x1={a} y1={top - 30} x2={a} y2={top - 4} className="bo-arw" markerEnd="url(#bo-ar)" />)}
      <text x={x0} y={top - 36} className="bo-t">w: D {lv.wD} + self-weight, L {lv.wL} kN/m</text>
      {hasP && <><line x1={px} y1={10} x2={px} y2={top - 3} className="bo-arw p" markerEnd="url(#bo-ar)" /><text x={px - 6} y={22} textAnchor="end" className="bo-t b">P {lv.PD ?? 0} D + {lv.PL ?? 0} L kN</text></>}
      {/* beam */}
      <rect x={x0} y={top} width={len} height={dh} className="bo-beam" />
      {stir.map((p) => <line key={p} x1={p} y1={top + 2} x2={p} y2={top + dh - 2} className="bo-stir" />)}
      <line x1={x0 + 3} x2={x1 - 3} y1={cant ? top + cy : top + dh - cy} y2={cant ? top + cy : top + dh - cy} className="bo-main" />
      <line x1={x0 + 3} x2={x1 - 3} y1={cant ? top + dh - cy : top + cy} y2={cant ? top + dh - cy : top + cy} className="bo-hang" />
      {/* supports */}
      {cant ? <rect x={x0 - 30} y={top - 40} width={30} height={dh + 80} fill="url(#bo-hatch)" stroke="#3b4e66" />
        : <><path d={`M${x0} ${top + dh} l-11 18 h22 z`} className="bo-sup" /><path d={`M${x1} ${top + dh} l-11 18 h22 z`} className="bo-sup" /><circle cx={x1} cy={top + dh + 22} r={3} className="bo-sup" /></>}
      {/* dimension */}
      <line x1={x0} y1={180} x2={x1} y2={180} className="bo-dim" /><line x1={x0} y1={174} x2={x0} y2={186} className="bo-dim" /><line x1={x1} y1={174} x2={x1} y2={186} className="bo-dim" />
      <text x={(x0 + x1) / 2} y={176} textAnchor="middle" className="bo-t b">{cant ? "cantilever" : "span"} L = {lv.L.toFixed(1)} m · stirrups @ {x.s} mm</text>
    </svg>
  );
}

/** Cross-section at a fixed scale, so a bigger beam looks bigger. */
function Section({ lv, x }: { lv: BeamLevel; x: Design }) {
  const k = 0.32, bw = x.b * k, hh = x.h * k, ox = (260 - bw) / 2, oy = 22, cant = lv.support === "cantilever";
  const c = COVER * k, sd = x.ds * k, rr = Math.max(2.2, (x.db / 2) * k), rh = Math.max(1.8, (HANGER / 2) * k);
  const inner = bw - 2 * c - 2 * sd - 2 * rr, yT = cant ? oy + c + sd + rr : oy + hh - c - sd - rr, yH = cant ? oy + hh - c - sd - rh : oy + c + sd + rh;
  const bars = Array.from({ length: x.n }, (_, i) => ox + c + sd + rr + (x.n > 1 ? (inner * i) / (x.n - 1) : inner / 2));
  return (
    <svg viewBox={`0 0 260 ${Math.max(150, oy + hh + 30)}`} width="100%" role="img" aria-label="Beam cross-section">
      <rect x={ox} y={oy} width={bw} height={hh} className="bo-conc" />
      <rect x={ox + c + sd / 2} y={oy + c + sd / 2} width={bw - 2 * c - sd} height={hh - 2 * c - sd} rx={4} className="bo-stirr" style={{ strokeWidth: Math.max(1.5, sd) }} />
      {bars.map((bx) => <circle key={bx} cx={bx} cy={yT} r={rr} className="bo-bar" />)}
      {[ox + c + sd + rh, ox + bw - c - sd - rh].map((hx) => <circle key={hx} cx={hx} cy={yH} r={rh} className="bo-hbar" />)}
      <text x={ox + bw / 2} y={oy - 7} textAnchor="middle" className="bo-t b">b = {x.b}</text>
      <text x={ox + bw + 8} y={oy + hh / 2} className="bo-t b" transform={`rotate(90 ${ox + bw + 8} ${oy + hh / 2})`} textAnchor="middle">h = {x.h}</text>
      <text x={130} y={oy + hh + 20} textAnchor="middle" className="bo-t">{x.n} – {x.db} mm {cant ? "top" : "bottom"} · ⌀{x.ds} @ {x.s}</text>
    </svg>
  );
}
