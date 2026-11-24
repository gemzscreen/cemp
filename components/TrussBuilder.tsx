"use client";
// v2.0.0 Truss Builder: tap to place joints, tap two joints to connect, pick sections, run the load test.
// Analysis and code checks run in the browser (lib/truss), so the game works offline.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  evaluate, template, baseNodes, levelById, LEVELS, SECTIONS, FAMILY_LABEL, sectionByKey, LIVE_NOTE, JOINT_COST,
  type Design, type DNode, type Result, type MemberResult,
} from "@/lib/truss";
import { loadDraft, saveDraft, clearDraft, recordRun, flush, pending, localBests } from "@/lib/truss/store";

const S = 100; // svg units per metre
const peso = (x: number) => "₱" + Math.round(x).toLocaleString("en-PH");
const f = (x: number, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString();
const colorOf = (m?: MemberResult) => !m ? "#3b4e66" : !m.slenderOk || m.ratio > 1 ? "#d9443a" : m.ratio >= 0.7 ? "#e0a030" : "#2e9d5b";

type Sel = { kind: "node" | "member"; id: string } | null;

export default function TrussBuilder() {
  const sp = useSearchParams();
  // level lives in state (URL kept in sync without a server round trip, so switching levels works offline)
  const [lvId, setLvId] = useState(() => levelById(Number(sp.get("l") ?? 1)).id);
  const lv = levelById(lvId);
  const goLevel = (id: number) => { setLvId(id); try { window.history.replaceState(null, "", `/games/truss?l=${id}`); } catch {} };
  const [design, setDesign] = useState<Design>({ nodes: baseNodes(lv), members: [] });
  const [hist, setHist] = useState<Design[]>([]);
  const [sel, setSel] = useState<Sel>(null);
  const [sec, setSec] = useState("L75x6");
  const [result, setResult] = useState<Result | null>(null);
  const [showDefl, setShowDefl] = useState(true);
  const [check, setCheck] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [best, setBest] = useState<{ stars: number; best_cost: number | null } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const counter = useRef(1);

  // load draft for this level
  useEffect(() => {
    const d = loadDraft(lv.id);
    const base = baseNodes(lv);
    const ok = d && base.every((b) => d.nodes.some((n) => n.id === b.id && Math.abs(n.x - b.x) < 1e-6));
    setDesign(ok ? d! : { nodes: base, members: [] });
    counter.current = 1 + Math.max(0, ...((ok ? d!.nodes : []).map((n) => Number(n.id.replace(/\D/g, "")) || 0)), ...((ok ? d!.members : []).map((m) => Number(m.id.replace(/\D/g, "")) || 0)));
    setHist([]); setSel(null); setResult(null); setCheck(null);
    setBest(localBests()[lv.id] ?? null);
    flush().then(setQueued);
    const on = () => flush().then(setQueued);
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [lv.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const res = result && result.ok ? result : null;
  const byId = useMemo(() => new Map(design.nodes.map((n) => [n.id, n])), [design]);
  const mres = useMemo(() => new Map((res?.members ?? []).map((m) => [m.id, m])), [res]);

  function commit(next: Design, s: Sel = sel) {
    setHist((h) => [...h.slice(-49), design]);
    setDesign(next); setSel(s); setResult(null); setCheck(null);
    saveDraft(lv.id, next);
  }
  const nid = (p: string) => `${p}${counter.current++}`;

  // --- geometry helpers (world metres) ---
  const tol = Math.max(lv.grid * 0.45, lv.span * 0.025);
  function toWorld(e: React.PointerEvent) {
    const svg = svgRef.current!, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x / S, y: -p.y / S };
  }
  function nearestNode(x: number, y: number) {
    let best: DNode | null = null, d = tol;
    for (const n of design.nodes) { const dd = Math.hypot(n.x - x, n.y - y); if (dd < d) { d = dd; best = n; } }
    return best;
  }
  function nearestMember(x: number, y: number) {
    let best: string | null = null, d = tol * 0.6;
    for (const m of design.members) {
      const a = byId.get(m.a), b = byId.get(m.b); if (!a || !b) continue;
      const vx = b.x - a.x, vy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy)));
      const dd = Math.hypot(a.x + t * vx - x, a.y + t * vy - y);
      if (dd < d) { d = dd; best = m.id; }
    }
    return best;
  }
  const hasMember = (a: string, b: string) => design.members.find((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a));

  function onTap(e: React.PointerEvent) {
    const { x, y } = toWorld(e);
    const node = nearestNode(x, y);
    if (node) {
      if (sel?.kind === "node" && sel.id !== node.id) {
        const ex = hasMember(sel.id, node.id);
        if (ex) { setSel({ kind: "member", id: ex.id }); return; }
        commit({ ...design, members: [...design.members, { id: nid("m"), a: sel.id, b: node.id, sec }] }, { kind: "node", id: node.id });
        return;
      }
      setSel(sel?.kind === "node" && sel.id === node.id ? null : { kind: "node", id: node.id });
      return;
    }
    const mem = nearestMember(x, y);
    if (mem) { setSel({ kind: "member", id: mem }); const m = design.members.find((q) => q.id === mem); if (m) setSec(m.sec); return; }
    const gx = Math.round(x / lv.grid) * lv.grid, gy = Math.round(y / lv.grid) * lv.grid;
    if (gx < 0 || gx > lv.span + 1e-9 || gy > lv.above + 1e-9 || gy < -lv.below - 1e-9) { setSel(null); return; }
    if (Math.abs(gy) < 1e-9) { setSel(null); return; } // deck line: only the given panel points
    const n: DNode = { id: nid("n"), x: +gx.toFixed(3), y: +gy.toFixed(3) };
    const members = sel?.kind === "node" ? [...design.members, { id: nid("m"), a: sel.id, b: n.id, sec }] : design.members;
    commit({ nodes: [...design.nodes, n], members }, { kind: "node", id: n.id });
  }

  function del() {
    if (!sel) return;
    if (sel.kind === "member") return commit({ ...design, members: design.members.filter((m) => m.id !== sel.id) }, null);
    const n = byId.get(sel.id);
    if (n?.kind) return; // supports and deck joints stay
    commit({ nodes: design.nodes.filter((q) => q.id !== sel.id), members: design.members.filter((m) => m.a !== sel.id && m.b !== sel.id) }, null);
  }
  function undo() { const h = [...hist]; const prev = h.pop(); if (!prev) return; setHist(h); setDesign(prev); setSel(null); setResult(null); saveDraft(lv.id, prev); }
  function pickSection(k: string) {
    setSec(k);
    if (sel?.kind === "member") commit({ ...design, members: design.members.map((m) => (m.id === sel.id ? { ...m, sec: k } : m)) });
  }
  function applyAll() { commit({ ...design, members: design.members.map((m) => ({ ...m, sec })) }); }
  function useTemplate(k: "warren" | "pratt" | "howe") { const t = template(lv, k, sec); counter.current = 1000; commit(t, null); }
  function clearAll() { commit({ nodes: baseNodes(lv), members: [] }, null); clearDraft(lv.id); }

  async function test() {
    const r = evaluate(lv, design);
    setResult(r); setSel(null); setCheck(null);
    if (!r.ok) return;
    const left = await recordRun({ level: lv.id, passed: r.passed, stars: r.stars, cost: Math.round(r.cost), weight: Math.round(r.weight), max_ratio: +r.maxRatio.toFixed(3), design });
    setQueued(left); setBest(localBests()[lv.id] ?? null);
    setTimeout(() => document.getElementById("tb-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // --- drawing ---
  const x0 = -1.2, x1 = lv.span + 1.2, yTop = lv.above + 0.8, yBot = -(lv.below + 1.4);
  const vb = `${x0 * S} ${-yTop * S} ${(x1 - x0) * S} ${(yTop - yBot) * S}`;
  const nr = Math.max(0.09, lv.span * 0.012) * S, sw = Math.max(0.05, lv.span * 0.006) * S;
  const maxU = res ? Math.max(1e-9, ...Object.values(res.disp).map(([ux, uy]) => Math.hypot(ux, uy))) : 1;
  const k = res ? (lv.span * 0.05) / maxU : 0;
  const pos = (n: DNode, defl = false) => {
    const d = defl && res ? res.disp[n.id] ?? [0, 0] : [0, 0];
    return [(n.x + d[0] * k) * S, -(n.y + d[1] * k) * S];
  };
  const gridPts: [number, number][] = [];
  for (let gx = 0; gx <= lv.span + 1e-9; gx += lv.grid) for (let gy = -lv.below; gy <= lv.above + 1e-9; gy += lv.grid) if (Math.abs(gy) > 1e-9) gridPts.push([gx, gy]);
  const selMember = sel?.kind === "member" ? design.members.find((m) => m.id === sel.id) : null;
  const checkM = check ? mres.get(check) : null;
  const families = Array.from(new Set(SECTIONS.map((s) => s.family)));

  return (
    <div className="tb">
      <div className="tb-head">
        <div>
          <div className="crumbs"><Link href="/games">Games</Link> › Truss Builder</div>
          <h1 style={{ margin: ".1rem 0" }}>Level {lv.id}: {lv.name}</h1>
          <p className="sub" style={{ margin: 0 }}>{lv.blurb}</p>
        </div>
        <select className="tb-level" value={lv.id} onChange={(e) => goLevel(Number(e.target.value))} aria-label="Level">
          {LEVELS.map((l) => <option key={l.id} value={l.id}>Level {l.id}: {l.name} ({l.span} m)</option>)}
        </select>
      </div>

      <div className="tb-facts">
        <span>Span <b>{lv.span} m</b></span><span>Deck <b>{lv.width} m</b> wide, {lv.panels} panels</span>
        <span>Dead <b>{lv.dl} kPa</b> · Live <b>{lv.ll} kPa</b></span><span>Budget <b>{peso(lv.budget)}</b></span>
        {best && <span>Your best <b>{"★".repeat(best.stars) || "–"}</b>{best.best_cost != null && <> · {peso(best.best_cost)}</>}</span>}
      </div>

      <div className="tb-tools">
        <label className="tb-sec">
          <span>{selMember ? "Section (selected member)" : "Section for new members"}</span>
          <select value={sec} onChange={(e) => pickSection(e.target.value)}>
            {families.map((fam) => (
              <optgroup key={fam} label={FAMILY_LABEL[fam]}>
                {SECTIONS.filter((s) => s.family === fam).map((s) => <option key={s.key} value={s.key}>{s.name} · {f(s.kgm, 1)} kg/m · r {f(s.rmin, 1)} mm</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="tb-btns">
          <button type="button" className="chip" onClick={applyAll} disabled={!design.members.length}>Apply to all</button>
          <button type="button" className="chip" onClick={del} disabled={!sel || (sel.kind === "node" && !!byId.get(sel.id)?.kind)}>Delete</button>
          <button type="button" className="chip" onClick={undo} disabled={!hist.length}>Undo</button>
          <button type="button" className="chip" onClick={clearAll}>Clear</button>
          <span className="tb-sep" />
          <span className="fine">Start from:</span>
          <button type="button" className="chip" onClick={() => useTemplate("pratt")}>Pratt</button>
          <button type="button" className="chip" onClick={() => useTemplate("howe")}>Howe</button>
          <button type="button" className="chip" onClick={() => useTemplate("warren")}>Warren</button>
        </div>
      </div>

      <div className="tb-canvas">
        <div className="tb-zoom" aria-label="Zoom">
          <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} disabled={zoom >= 4} aria-label="Zoom in">+</button>
        </div>
        <div className="tb-scroll">
        <svg ref={svgRef} style={{ width: `${zoom * 100}%`, maxHeight: zoom > 1 ? "none" : undefined }} viewBox={vb} preserveAspectRatio="xMidYMid meet" onPointerDown={onTap} role="img" aria-label="Truss canvas">
          {/* banks and gap */}
          <rect x={x0 * S} y={-yTop * S} width={(x1 - x0) * S} height={(yTop - yBot) * S} fill="#eef3f8" />
          <path d={`M${x0 * S} 0 H0 L${-0.4 * S} ${-yBot * S} H${x0 * S} Z`} fill="#c9b79a" />
          <path d={`M${x1 * S} 0 H${lv.span * S} L${(lv.span + 0.4) * S} ${-yBot * S} H${x1 * S} Z`} fill="#c9b79a" />
          <rect x={0.4 * S} y={(lv.below + 0.9) * S} width={(lv.span - 0.8) * S} height={0.5 * S} fill="#9cc3e6" opacity=".7" />
          {/* build area + grid */}
          <rect x={0} y={-lv.above * S} width={lv.span * S} height={(lv.above + lv.below) * S} fill="none" stroke="#b9c6d6" strokeDasharray={`${sw} ${sw}`} strokeWidth={sw * 0.4} />
          {gridPts.map(([gx, gy]) => <circle key={`${gx}_${gy}`} cx={gx * S} cy={-gy * S} r={nr * 0.22} fill="#b9c6d6" />)}
          {/* deck line */}
          <line x1={0} y1={0} x2={lv.span * S} y2={0} stroke="#8e9bab" strokeWidth={sw * 2.2} strokeLinecap="round" opacity=".35" />
          {/* members */}
          {design.members.map((m) => {
            const a = byId.get(m.a), b = byId.get(m.b); if (!a || !b) return null;
            const [ax, ay] = pos(a), [bx, by] = pos(b), mr = mres.get(m.id), on = sel?.kind === "member" && sel.id === m.id;
            const w = sw * (0.8 + Math.min(2, sectionByKey(m.sec).A / 900));
            return <g key={m.id}>
              {on && <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#f3d98b" strokeWidth={w + sw * 1.6} strokeLinecap="round" />}
              <line x1={ax} y1={ay} x2={bx} y2={by} stroke={colorOf(mr)} strokeWidth={w} strokeLinecap="round" strokeDasharray={mr && !mr.slenderOk ? `${sw * 2} ${sw * 1.2}` : undefined} />
            </g>;
          })}
          {/* deflected shape */}
          {res && showDefl && design.members.map((m) => {
            const a = byId.get(m.a), b = byId.get(m.b); if (!a || !b || !res.disp[a.id] || !res.disp[b.id]) return null;
            const [ax, ay] = pos(a, true), [bx, by] = pos(b, true);
            return <line key={`d${m.id}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="#1e2b3c" strokeWidth={sw * 0.5} strokeDasharray={`${sw} ${sw}`} opacity=".55" />;
          })}
          {/* supports */}
          <path d={`M0 ${nr} l${-nr * 1.6} ${nr * 2.6} h${nr * 3.2} Z`} fill="#1e2b3c" />
          <circle cx={lv.span * S} cy={nr * 2.2} r={nr * 1.2} fill="#1e2b3c" />
          {/* joints */}
          {design.nodes.map((n) => {
            const [cx, cy] = pos(n), on = sel?.kind === "node" && sel.id === n.id;
            return <g key={n.id}>
              {on && <circle cx={cx} cy={cy} r={nr * 2} fill="#f3d98b" opacity=".8" />}
              <circle cx={cx} cy={cy} r={n.kind ? nr * 1.15 : nr} fill={n.kind ? "#1e2b3c" : "#fff"} stroke="#1e2b3c" strokeWidth={sw * 0.6} />
            </g>;
          })}
        </svg>
        </div>
        <div className="tb-hint">
          {sel?.kind === "node" ? "Tap another joint to connect, or an empty grid point to add a joint and a member." :
            sel?.kind === "member" ? "Member selected: change its section above, or Delete." :
              "Tap a grid point to add a joint. Tap two joints to connect them. Dark joints are the deck and supports."}
        </div>
      </div>

      <div className="tb-run">
        <button type="button" className="btn" style={{ marginTop: 0 }} onClick={test}>▶ Run load test</button>
        {res && <label className="fine tb-check-lbl"><input type="checkbox" checked={showDefl} onChange={(e) => setShowDefl(e.target.checked)} /> Show deflected shape (exaggerated)</label>}
        {queued > 0 && <span className="fine">{queued} run(s) saved on this device, waiting to sync</span>}
      </div>

      {result && !result.ok && <div className="msg err" id="tb-results">{result.reason}</div>}

      {res && (
        <section className="panel tb-results" id="tb-results">
          <div className="tb-verdict">
            <span className={`tb-badge ${res.passed ? "ok" : "bad"}`}>{res.passed ? "PASSED" : "FAILED"}</span>
            <span className="tb-stars" aria-label={`${res.stars} stars`}>{[1, 2, 3].map((i) => <span key={i} className={i <= res.stars ? "on" : ""}>★</span>)}</span>
            <span>Cost <b>{peso(res.cost)}</b> <span className="fine">({res.cost <= lv.budget ? "within" : "over"} budget {peso(lv.budget)}; 3★ at ≤ {peso(lv.budget * 0.9)})</span></span>
          </div>
          <div className="tb-stats">
            <div><small>Max ratio</small><b style={{ color: colorOf({ ratio: res.maxRatio, slenderOk: true } as MemberResult) }}>{f(res.maxRatio, 2)}</b></div>
            <div><small>Deflection (live)</small><b>{f(res.defl, 1)} / {f(res.deflLimit, 1)} mm</b></div>
            <div><small>Steel, 2 trusses</small><b>{Math.round(res.weight)} kg</b></div>
            <div><small>Steel + joints</small><b>{peso(res.steelCost)} + {peso(res.jointCost)}</b></div>
          </div>
          {res.issues.length > 0 && <ul className="tb-issues">{res.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
          <p className="fine">Ratio = factored force ÷ design strength. Green &lt; 0.70, amber 0.70–1.00, red &gt; 1.00 or too slender (dashed). Tap a row for the full check.</p>
          <div className="tb-table">
            <table>
              <thead><tr><th>Member</th><th>Section</th><th>L (m)</th><th>Pu (kN)</th><th>φPn (kN)</th><th>Ratio</th></tr></thead>
              <tbody>
                {[...res.members].sort((a, b) => b.ratio - a.ratio).map((m) => (
                  <tr key={m.id} className={check === m.id ? "on" : ""} onClick={() => { setCheck(check === m.id ? null : m.id); setSel({ kind: "member", id: m.id }); }}>
                    <td><span className="tb-dot" style={{ background: colorOf(m) }} />{m.id}</td>
                    <td>{m.sec.name}</td><td>{f(m.L)}</td>
                    <td>{f(Math.abs(m.Pu), 1)} {m.mode === "tension" ? "T" : m.mode === "compression" ? "C" : "0"}</td>
                    <td>{f(m.phiPn, 1)}</td><td><b>{f(m.ratio, 2)}</b>{!m.slenderOk && " ⚠"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {checkM && (
            <div className="tb-check">
              <h3>Real check: {checkM.id} ({checkM.sec.name})</h3>
              <ol>{checkM.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <p className="fine">AISC 360-10 Ch. D and E, as adopted in NSCP 2015 Sections 504–505. Connections are not designed in this game.</p>
            </div>
          )}
          <details className="tb-loads"><summary>How the bridge is loaded</summary>
            <ul>{res.loads.map((l) => <li key={l}>{l}</li>)}</ul>
            <p className="fine"><span className="badge b-review">verify</span> {LIVE_NOTE} Joint cost {peso(JOINT_COST)} each and steel prices (₱/kg) are indicative.</p>
          </details>
        </section>
      )}
    </div>
  );
}
