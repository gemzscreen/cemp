"use client";
// v2.4.0 Critical Path Rush. Find levels: tap the critical activities and enter the project duration against the clock.
// Crash levels: shorten activities to beat the deadline at the lowest total cost (crash + overhead + LDs).
// All CPM math is lib/cpm (pure, works offline). Scores go through the shared game queue (lib/truss/store).
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CPM_LEVELS, cpmLevelById, cpm, planCost, passSteps, LD_NOTE, type Act, type Cpm } from "@/lib/cpm";
import { recordRun, flush, localBests } from "@/lib/truss/store";

const peso = (x: number) => "₱" + Math.round(x).toLocaleString("en-PH");
const W = 150, H = 84, GX = 54, GY = 22, PAD = 30; // node box and gaps (svg units ≈ px)

/** Columns by longest chain of predecessors; rows ordered by the average row of predecessors (fewer crossings). */
function layout(acts: Act[]) {
  const r = cpm(acts), col: Record<string, number> = {};
  for (const id of r.order) { const a = acts.find((x) => x.id === id)!; col[id] = a.pred.length ? 1 + Math.max(...a.pred.map((p) => col[p])) : 0; }
  const cols: string[][] = [];
  for (const id of r.order) (cols[col[id]] ??= []).push(id);
  const row: Record<string, number> = {};
  cols.forEach((ids) => {
    const bary = (id: string) => { const p = acts.find((x) => x.id === id)!.pred; return p.length ? p.reduce((s, q) => s + row[q], 0) / p.length : 0; };
    ids.sort((a, b) => bary(a) - bary(b) || a.localeCompare(b)).forEach((id, i) => (row[id] = i));
  });
  const rows = Math.max(...cols.map((c) => c.length));
  // centre short columns vertically
  const y: Record<string, number> = {}, x: Record<string, number> = {};
  cols.forEach((ids, c) => ids.forEach((id, i) => { x[id] = PAD + 40 + c * (W + GX); y[id] = PAD + (i + (rows - ids.length) / 2) * (H + GY); }));
  return { x, y, width: PAD * 2 + 80 + cols.length * (W + GX) - GX, height: PAD * 2 + rows * (H + GY) - GY, cols: cols.length };
}

type Reveal = { stars: number; correct: boolean; wrong: string[]; missed: string[]; durOk: boolean; secs: number } | null;
type CrashOut = { stars: number; total: number; T: number; meets: boolean } | null;

export default function CpmRush() {
  const sp = useSearchParams();
  const [lvId, setLvId] = useState(() => cpmLevelById(Number(sp.get("l") ?? 1)).id);
  const lv = cpmLevelById(lvId);
  const go = (id: number) => { setLvId(id); try { window.history.replaceState(null, "", `/games/cpm?l=${id}`); } catch {} };
  const L = useMemo(() => layout(lv.acts), [lv]);
  const base = useMemo(() => cpm(lv.acts), [lv]);

  // find mode
  const [started, setStarted] = useState(false);
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(0);
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [dur, setDur] = useState("");
  const [reveal, setReveal] = useState<Reveal>(null);
  // crash mode
  const [crash, setCrash] = useState<Record<string, number>>({});
  const [crashOut, setCrashOut] = useState<CrashOut>(null);
  const [showBest, setShowBest] = useState(false);
  const [best, setBest] = useState<{ stars: number; best_cost: number | null } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setStarted(lv.mode === "crash"); setMarks(new Set()); setDur(""); setReveal(null); setCrash({}); setCrashOut(null); setShowBest(false);
    setT0(Date.now()); setNow(Date.now()); setBest(localBests("cpm")[lv.id] ?? null);
    flush();
  }, [lv.id, lv.mode]);
  useEffect(() => {
    if (tick.current) clearInterval(tick.current);
    if (started && !reveal && !crashOut) tick.current = setInterval(() => setNow(Date.now()), 250);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [started, reveal, crashOut]);
  const secs = Math.max(0, Math.floor((now - t0) / 1000));

  const durs = useMemo(() => Object.fromEntries(lv.acts.map((a) => [a.id, a.d - (crash[a.id] ?? 0)])), [lv, crash]);
  const live: Cpm = useMemo(() => (lv.mode === "crash" ? cpm(lv.acts, durs) : base), [lv, durs, base]);
  const cost = useMemo(() => (lv.terms ? planCost(lv.acts, crash, lv.terms) : null), [lv, crash]);
  const normal = useMemo(() => (lv.terms ? planCost(lv.acts, {}, lv.terms) : null), [lv]);
  const shown: Cpm | null = lv.mode === "crash" ? live : reveal ? base : null; // numbers visible?

  function start() { setStarted(true); setT0(Date.now()); setNow(Date.now()); }
  function toggle(id: string) { if (!started || reveal || lv.mode !== "find") return; setMarks((m) => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function bump(id: string, k: number) {
    if (crashOut) return;
    const a = lv.acts.find((x) => x.id === id)!, max = a.d - (a.min ?? a.d);
    setCrash((c) => ({ ...c, [id]: Math.max(0, Math.min(max, (c[id] ?? 0) + k)) }));
  }
  async function check() {
    const crit = new Set(base.critical), wrong = [...marks].filter((m) => !crit.has(m)), missed = base.critical.filter((c) => !marks.has(c));
    const durOk = Number(dur) === base.T, correct = !wrong.length && !missed.length && durOk, s = Math.max(1, secs);
    const stars = !correct ? 0 : s <= lv.timeLimit! ? 3 : s <= 2 * lv.timeLimit! ? 2 : 1;
    setReveal({ stars, correct, wrong, missed, durOk, secs: s });
    await recordRun({ level: lv.id, passed: correct, stars, cost: s, weight: 0, max_ratio: wrong.length + missed.length + (durOk ? 0 : 1), design: { acts: lv.acts.length, marks: [...marks], duration: Number(dur) || null } as never }, "cpm");
    setBest(localBests("cpm")[lv.id] ?? null);
  }
  async function submitPlan() {
    if (!cost || !lv.best || !lv.terms) return;
    const hardFail = lv.terms.ld == null && !cost.meets;
    const stars = hardFail ? 0 : cost.total <= lv.best.total + 0.5 ? 3 : cost.total <= lv.best.total * 1.1 ? 2 : 1;
    setCrashOut({ stars, total: cost.total, T: cost.T, meets: cost.meets });
    await recordRun({ level: lv.id, passed: stars > 0, stars, cost: Math.round(cost.total), weight: cost.T, max_ratio: 0, design: { crash } as never }, "cpm");
    setBest(localBests("cpm")[lv.id] ?? null);
    setTimeout(() => document.getElementById("cpm-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function retry() { setMarks(new Set()); setDur(""); setReveal(null); setCrashOut(null); setShowBest(false); setStarted(lv.mode === "crash"); setT0(Date.now()); setNow(Date.now()); }

  const steps = useMemo(() => passSteps(lv.acts, base), [lv, base]);
  const succ = useMemo(() => { const m: Record<string, string[]> = {}; lv.acts.forEach((a) => a.pred.forEach((p) => (m[p] ??= []).push(a.id))); return m; }, [lv]);
  const starts = lv.acts.filter((a) => !a.pred.length).map((a) => a.id), ends = lv.acts.filter((a) => !succ[a.id]).map((a) => a.id);
  const sx = PAD, fx = L.width - PAD, my = L.height / 2;
  const critEdge = (a: string, b: string) => shown && shown.byId[a].critical && shown.byId[b].critical && shown.byId[a].ef === shown.byId[b].es;

  return (
    <div className="cpm">
      <div className="tb-head">
        <div>
          <div className="crumbs"><Link href="/games">Games</Link> › Critical Path Rush</div>
          <h1 style={{ margin: ".1rem 0" }}>Level {lv.id}: {lv.name}</h1>
          <p className="sub" style={{ margin: 0 }}>{lv.blurb}</p>
        </div>
        <select className="tb-level" value={lv.id} onChange={(e) => go(Number(e.target.value))} aria-label="Level">
          {CPM_LEVELS.map((l) => <option key={l.id} value={l.id}>Level {l.id}: {l.name} ({l.mode === "find" ? "find the path" : "crash"})</option>)}
        </select>
      </div>

      <div className="tb-facts">
        <span><b>{lv.acts.length}</b> activities</span>
        {lv.mode === "find" ? <><span>Goal: tap every <b>critical</b> activity and enter the project duration</span><span>3★ within <b>{lv.timeLimit} s</b>, 2★ within {2 * lv.timeLimit!} s</span></>
          : <><span>Deadline <b>day {lv.terms!.deadline}</b>{lv.terms!.ld == null ? " (must be met)" : ""}</span>
            {lv.terms!.overhead > 0 && <span>Overhead <b>{peso(lv.terms!.overhead)}</b>/day</span>}
            {lv.terms!.ld != null && <span>LDs <b>{peso(lv.terms!.ld)}</b>/day late</span>}
            <span>3★ = cheapest possible plan, 2★ within 10%</span></>}
        {best && <span>Your best <b>{"★".repeat(best.stars) || "–"}</b>{best.best_cost != null && <> · {lv.mode === "find" ? `${best.best_cost} s` : peso(best.best_cost)}</>}</span>}
      </div>

      {lv.mode === "crash" && cost && normal && (
        <div className={`tb-meter cpm-meter ${cost.meets ? "g3" : lv.terms!.ld == null ? "over" : "g2"}`}>
          <div className="tm-top"><div className="tm-main">
            <span className="tm-lbl">Total cost</span><b className="tm-cost">{peso(cost.total)}</b>
            <span className="fine">normal plan {peso(normal.total)}{normal.total > cost.total ? ` · saving ${peso(normal.total - cost.total)}` : ""}</span>
          </div><div className="cpm-T"><span className="tm-lbl">Finish</span> <b>day {cost.T}</b> <span className="fine">/ deadline {lv.terms!.deadline}</span></div></div>
          <div className="tm-sub">
            <span className="tm-zone">{cost.meets ? "On time" : lv.terms!.ld == null ? `${cost.T - lv.terms!.deadline} day(s) late: not allowed` : `${cost.T - lv.terms!.deadline} day(s) late`}</span>
            <span>Crashing {peso(cost.crashCost)}</span>
            {lv.terms!.overhead > 0 && <span>Overhead {cost.T} × {peso(lv.terms!.overhead)} = {peso(cost.overheadCost)}</span>}
            {lv.terms!.ld != null && <span>LDs {peso(cost.ldCost)}</span>}
          </div>
        </div>
      )}

      <div className="cpm-canvas">
        {lv.mode === "find" && !started && (
          <div className="cpm-start"><p>The clock starts when you press Start.</p><button type="button" className="btn" onClick={start}>▶ Start</button></div>
        )}
        <div className="cpm-scroll">
          <svg viewBox={`0 0 ${L.width} ${L.height}`} width={L.width} height={L.height} className={!started ? "blur" : ""} role="img" aria-label="Activity network">
            <defs><marker id="cpm-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#5b6b80" /></marker>
              <marker id="cpm-arc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#d9443a" /></marker></defs>
            {/* start / finish */}
            <circle cx={sx} cy={my} r={16} className="cpm-sf" /><text x={sx} y={my + 4} textAnchor="middle" className="cpm-sft">S</text>
            <circle cx={fx} cy={my} r={16} className="cpm-sf" /><text x={fx} y={my + 4} textAnchor="middle" className="cpm-sft">F</text>
            {/* links */}
            {starts.map((id) => <path key={`s${id}`} d={`M${sx + 16} ${my} C ${sx + 40} ${my}, ${L.x[id] - 30} ${L.y[id] + H / 2}, ${L.x[id]} ${L.y[id] + H / 2}`} className={`cpm-link ${shown?.byId[id].critical ? "crit" : ""}`} markerEnd={`url(#${shown?.byId[id].critical ? "cpm-arc" : "cpm-ar"})`} />)}
            {lv.acts.flatMap((a) => a.pred.map((p) => {
              const x1 = L.x[p] + W, y1 = L.y[p] + H / 2, x2 = L.x[a.id], y2 = L.y[a.id] + H / 2, c = critEdge(p, a.id);
              return <path key={`${p}${a.id}`} d={`M${x1} ${y1} C ${x1 + GX / 2} ${y1}, ${x2 - GX / 2} ${y2}, ${x2} ${y2}`} className={`cpm-link ${c ? "crit" : ""}`} markerEnd={`url(#${c ? "cpm-arc" : "cpm-ar"})`} />;
            }))}
            {ends.map((id) => <path key={`f${id}`} d={`M${L.x[id] + W} ${L.y[id] + H / 2} C ${L.x[id] + W + 30} ${L.y[id] + H / 2}, ${fx - 40} ${my}, ${fx - 16} ${my}`} className={`cpm-link ${shown?.byId[id].critical && shown.byId[id].ef === shown.T ? "crit" : ""}`} markerEnd={`url(#${shown?.byId[id].critical ? "cpm-arc" : "cpm-ar"})`} />)}
            {/* activity boxes: ES | D | EF / name / LS | TF | LF */}
            {lv.acts.map((a) => {
              const x = L.x[a.id], y = L.y[a.id], row = shown?.byId[a.id], marked = marks.has(a.id);
              const wrong = reveal?.wrong.includes(a.id), missed = reveal?.missed.includes(a.id);
              const cls = ["cpm-node", row?.critical ? "crit" : "", marked ? "marked" : "", wrong ? "wrong" : "", missed ? "missed" : "", lv.mode === "find" && started && !reveal ? "tap" : ""].join(" ");
              const d = durs[a.id], canCrash = lv.mode === "crash" && a.min != null && a.min < a.d;
              return (
                <g key={a.id} className={cls} onClick={() => toggle(a.id)}>
                  <rect x={x} y={y} width={W} height={H} rx={8} />
                  <line x1={x} y1={y + 22} x2={x + W} y2={y + 22} className="cpm-div" />
                  <line x1={x} y1={y + H - 22} x2={x + W} y2={y + H - 22} className="cpm-div" />
                  <text x={x + 8} y={y + 16} className="cpm-n">{row ? row.es : ""}</text>
                  <text x={x + W / 2} y={y + 16} textAnchor="middle" className="cpm-d">{a.id} · {d} d{lv.mode === "crash" && d < a.d ? "*" : ""}</text>
                  <text x={x + W - 8} y={y + 16} textAnchor="end" className="cpm-n">{row ? row.ef : ""}</text>
                  <foreignObject x={x + 4} y={y + 23} width={W - 8} height={H - 46}><div className="cpm-name">{a.name}</div></foreignObject>
                  <text x={x + 8} y={y + H - 7} className="cpm-n">{row ? row.ls : ""}</text>
                  <text x={x + W / 2} y={y + H - 7} textAnchor="middle" className={`cpm-tf ${row && row.tf === 0 ? "z" : ""}`}>{row ? `TF ${row.tf}` : ""}</text>
                  <text x={x + W - 8} y={y + H - 7} textAnchor="end" className="cpm-n">{row ? row.lf : ""}</text>
                  {wrong && <text x={x + W - 6} y={y - 6} textAnchor="end" className="cpm-flag bad">✕ not critical</text>}
                  {missed && <text x={x + W - 6} y={y - 6} textAnchor="end" className="cpm-flag miss">missed</text>}
                  {canCrash && <text x={x + 6} y={y - 6} className="cpm-cc">{peso(a.cost!)}/d · min {a.min}</text>}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="tb-hint">
          {lv.mode === "find" ? (reveal ? "Red boxes and arrows = critical path (total float 0). Box: ES | id · duration | EF, then LS | TF | LF." : "Tap an activity to mark it critical; tap again to unmark. Scroll sideways on a phone.")
            : "Use − / + under the network to crash activities. Red = critical with the current durations. * = crashed."}
        </div>
      </div>

      {lv.mode === "crash" && (
        <div className="cpm-crash">
          {lv.acts.filter((a) => a.min != null && a.min < a.d).map((a) => {
            const c = crash[a.id] ?? 0, crit = live.byId[a.id].critical;
            return (
              <div key={a.id} className={`cpm-cr ${crit ? "crit" : ""}`}>
                <div><b>{a.id}</b> {a.name}<small>{peso(a.cost!)}/day · {a.d} → min {a.min} d · TF {live.byId[a.id].tf}</small></div>
                <div className="cpm-step">
                  <button type="button" onClick={() => bump(a.id, -1)} disabled={!c || !!crashOut} aria-label={`Undo crash ${a.id}`}>+</button>
                  <span>{a.d - c} d</span>
                  <button type="button" onClick={() => bump(a.id, 1)} disabled={c >= a.d - a.min! || !!crashOut} aria-label={`Crash ${a.id} one day`}>−</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="tb-run">
        {lv.mode === "find" ? (
          <>
            <label className="cpm-dur">Project duration <input inputMode="numeric" value={dur} onChange={(e) => setDur(e.target.value.replace(/\D/g, ""))} disabled={!started || !!reveal} placeholder="days" /></label>
            <button type="button" className="btn" style={{ marginTop: 0 }} onClick={check} disabled={!started || !!reveal || !marks.size || !dur}>✓ Check answer</button>
            {started && !reveal && <span className={`cpm-clock ${secs > lv.timeLimit! ? "late" : ""}`}>⏱ {secs} s</span>}
          </>
        ) : (
          <button type="button" className="btn" style={{ marginTop: 0 }} onClick={submitPlan} disabled={!!crashOut}>✓ Submit plan</button>
        )}
        {(reveal || crashOut) && <button type="button" className="btn ghost tb-cross" onClick={retry}>↺ Try again</button>}
      </div>

      {reveal && (
        <section className="panel tb-results" id="cpm-result">
          <div className="tb-verdict">
            <span className={`tb-badge ${reveal.correct ? "ok" : "bad"}`}>{reveal.correct ? "CORRECT" : "NOT YET"}</span>
            <span className="tb-stars">{[1, 2, 3].map((i) => <span key={i} className={i <= reveal.stars ? "on" : ""}>★</span>)}</span>
            <span>Time <b>{reveal.secs} s</b> · project duration <b>{base.T} days</b>{!reveal.durOk && <> (you said {dur || "–"})</>}</span>
          </div>
          {!reveal.correct && <ul className="tb-issues">
            {reveal.wrong.length > 0 && <li>Marked but not critical: {reveal.wrong.join(", ")} (they have float)</li>}
            {reveal.missed.length > 0 && <li>Critical but not marked: {reveal.missed.join(", ")}</li>}
            {!reveal.durOk && <li>Duration: the longest path is {base.T} days</li>}
          </ul>}
          <p>Critical path: <b>{base.critical.join(" → ")}</b>. Activities with float: {base.rows.filter((r) => r.tf > 0).map((r) => `${r.id} (TF ${r.tf}, FF ${r.ff})`).join(", ") || "none"}.</p>
          <Gantt cpmR={base} acts={lv.acts} />
          <details className="tb-loads"><summary>Forward pass (early dates)</summary><ol>{steps.forward.map((s) => <li key={s}>{s}</li>)}</ol></details>
          <details className="tb-loads"><summary>Backward pass (late dates and float)</summary><ol>{steps.backward.map((s) => <li key={s}>{s}</li>)}</ol></details>
        </section>
      )}

      {crashOut && lv.best && lv.terms && normal && (
        <section className="panel tb-results" id="cpm-result">
          <div className="tb-verdict">
            <span className={`tb-badge ${crashOut.stars ? "ok" : "bad"}`}>{crashOut.stars ? "PLAN ACCEPTED" : "LATE"}</span>
            <span className="tb-stars">{[1, 2, 3].map((i) => <span key={i} className={i <= crashOut.stars ? "on" : ""}>★</span>)}</span>
            <span>Your total <b>{peso(crashOut.total)}</b>, finish day {crashOut.T} · cheapest possible <b>{peso(lv.best.total)}</b> (day {lv.best.T})</span>
          </div>
          <p className="fine">{crashOut.total <= lv.best.total + 0.5 ? "You found the optimum." : `${peso(crashOut.total - lv.best.total)} above the optimum (${(((crashOut.total - lv.best.total) / lv.best.total) * 100).toFixed(1)}%).`}
            {" "}Rule of thumb: crash the cheapest activity on every critical path, one day at a time, and stop when a day costs more than it saves{lv.terms.overhead || lv.terms.ld ? ` (overhead ${peso(lv.terms.overhead)}${lv.terms.ld ? ` + LDs ${peso(lv.terms.ld)}` : ""} per day)` : ""}.</p>
          <button type="button" className="chip" onClick={() => setShowBest((v) => !v)}>{showBest ? "Hide" : "Show"} the optimum plan</button>
          {showBest && <p>Optimum: {Object.entries(lv.best.crash).map(([k, v]) => `crash ${k} by ${v} d`).join(", ")}. Finish day {lv.best.T}; total {peso(lv.best.total)}.</p>}
          <Gantt cpmR={live} acts={lv.acts} />
          {lv.terms.ld != null && <p className="fine"><span className="badge b-review">verify</span> {LD_NOTE}</p>}
        </section>
      )}
    </div>
  );
}

/** Bar chart of early dates with total float as a hatched tail; critical bars red. */
function Gantt({ cpmR, acts }: { cpmR: Cpm; acts: Act[] }) {
  const T = cpmR.T, rowH = 22, lab = 170, w = 640, sc = (w - lab - 10) / Math.max(1, T), h = acts.length * rowH + 28;
  return (
    <div className="cpm-gantt"><svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Gantt chart">
      {Array.from({ length: T + 1 }, (_, d) => d).filter((d) => d % (T > 30 ? 5 : T > 15 ? 2 : 1) === 0 || d === T).map((d) => (
        <g key={d}><line x1={lab + d * sc} y1={0} x2={lab + d * sc} y2={h - 18} className="g-grid" /><text x={lab + d * sc} y={h - 4} textAnchor="middle" className="g-t">{d}</text></g>
      ))}
      {cpmR.order.map((id, i) => {
        const r = cpmR.byId[id], a = acts.find((x) => x.id === id)!, y = i * rowH + 4;
        return <g key={id}>
          <text x={4} y={y + 13} className="g-l">{id} {a.name.length > 22 ? a.name.slice(0, 21) + "…" : a.name}</text>
          <rect x={lab + r.es * sc} y={y + 2} width={Math.max(2, r.d * sc)} height={rowH - 8} rx={3} className={r.critical ? "g-bar crit" : "g-bar"} />
          {r.tf > 0 && <rect x={lab + r.ef * sc} y={y + 6} width={r.tf * sc} height={rowH - 16} className="g-float" />}
        </g>;
      })}
    </svg></div>
  );
}
