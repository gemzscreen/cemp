"use client";
// v2.0.0 Truss Builder: tap to place joints, tap two joints to connect, pick sections, run the load test.
// v2.3.0: drag joints (Select/Joints mode; on touch, drag the highlighted joint), deck type and design code menus
// (own calibrated budgets), crowd patch loading, and an animated crowd crossing.
// Analysis and code checks run in the browser (lib/truss), so the game works offline.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  evaluate, template, baseNodes, levelById, LEVELS, SECTIONS, FAMILY_LABEL, sectionByKey, LIVE_NOTE, JOINT_COST, costOf, memberCost,
  crossing, budgetFor, defaultSettings, isDefault, dlOf, DECKS, CODES,
  type Design, type DNode, type Result, type MemberResult, type Settings, type DeckKey, type CodeKey, type Frame,
} from "@/lib/truss";
import { loadDraft, saveDraft, clearDraft, recordRun, flush, pending, localBests, loadSettings, saveSettings } from "@/lib/truss/store";

const S = 100; // svg units per metre
const peso = (x: number) => "₱" + Math.round(x).toLocaleString("en-PH");
const f = (x: number, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString();
const colorOf = (m?: MemberResult) => !m ? "#3b4e66" : !m.slenderOk || m.ratio > 1 ? "#d9443a" : m.ratio >= 0.7 ? "#e0a030" : "#2e9d5b";
const colorRatio = (r: number) => r > 1 ? "#d9443a" : r >= 0.7 ? "#e0a030" : "#2e9d5b";
const FRAME_MS = 520; // crowd advances one panel per frame

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
  const [mode, setMode] = useState<"joint" | "member" | "select">("joint");
  const [ppm, setPpm] = useState(40); // screen pixels per metre (for touch-friendly hit areas)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const down = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const [best, setBest] = useState<{ stars: number; best_cost: number | null } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // v2.1.1 live cost meter: updates on every joint, member and section change; flashes the change
  const drag = useRef<{ id: string; pointer: number; x: number; y: number; moved: boolean } | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const shown = useMemo<Design>(() => dragPos ? { ...design, nodes: design.nodes.map((n) => (n.id === dragPos.id ? { ...n, x: dragPos.x, y: dragPos.y } : n)) } : design, [design, dragPos]);
  const live = useMemo(() => costOf(shown), [shown]); // follows a joint while it is dragged
  const prevCost = useRef<number | null>(null);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  const [preview, setPreview] = useState<number | null>(null); // mouse: cost of the member about to be added
  const counter = useRef(1);
  // v2.3.0 settings (deck, code), per level
  const [settings, setSettingsState] = useState<Settings>(() => defaultSettings(lv));
  const budget = budgetFor(lv, settings);
  // v2.3.0 drag: id of the joint being dragged and its snapped preview position
  // v2.3.0 crowd crossing animation
  const [anim, setAnim] = useState<{ frames: Frame[]; t: number; playing: boolean; worst: number } | null>(null);
  const raf = useRef<number | null>(null);

  // load draft for this level
  useEffect(() => {
    const d = loadDraft(lv.id);
    const base = baseNodes(lv);
    const ok = d && base.every((b) => d.nodes.some((n) => n.id === b.id && Math.abs(n.x - b.x) < 1e-6));
    setDesign(ok ? d! : { nodes: base, members: [] });
    counter.current = 1 + Math.max(0, ...((ok ? d!.nodes : []).map((n) => Number(n.id.replace(/\D/g, "")) || 0)), ...((ok ? d!.members : []).map((m) => Number(m.id.replace(/\D/g, "")) || 0)));
    prevCost.current = null; setDelta(null); setPreview(null);
    setHist([]); setSel(null); setResult(null); setCheck(null);
    if (!d?.members.length) setMode("joint");
    setZoom(window.innerWidth < 600 && lv.span >= 9 ? (lv.span >= 18 ? 2 : 1.5) : 1);
    setBest(localBests()[lv.id] ?? null);
    setSettingsState(loadSettings(lv.id) ?? defaultSettings(lv)); stopAnim();
    flush().then(setQueued);
    const on = () => flush().then(setQueued);
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [lv.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = () => { const ctm = svgRef.current?.getScreenCTM(); if (ctm && ctm.a > 0) setPpm(ctm.a * S); };
    m(); const t = setTimeout(m, 120);
    window.addEventListener("resize", m);
    return () => { clearTimeout(t); window.removeEventListener("resize", m); };
  }, [zoom, lv.id]);

  useEffect(() => {
    if (dragPos) return; // no flash mid-drag (it can wrap the meter and shift the canvas under the finger); the drop flashes the net change
    const p = prevCost.current; prevCost.current = live.cost;
    if (p == null || Math.abs(live.cost - p) < 0.5) return;
    setDelta({ v: live.cost - p, k: Date.now() });
    const t = setTimeout(() => setDelta(null), 1800);
    return () => clearTimeout(t);
  }, [live.cost, dragPos]);

  const res = result && result.ok ? result : null;
  const byId = useMemo(() => new Map(shown.nodes.map((n) => [n.id, n])), [shown]);
  const mres = useMemo(() => new Map((res?.members ?? []).map((m) => [m.id, m])), [res]);

  // Touch drag handle: an HTML div over the selected joint with touch-action: none (Chrome ignores touch-action on
  // shapes inside an SVG, so an SVG handle would still scroll the page). Positioned in the scroll box's content coords.
  const [grab, setGrab] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const n = sel?.kind === "node" ? byId.get(sel.id) : null, svg = svgRef.current;
    if (!n || n.kind || anim || !(mode === "select" || mode === "joint") || !svg) { setGrab(null); return; }
    const ctm = svg.getScreenCTM(), box = svg.parentElement;
    if (!ctm || !box) { setGrab(null); return; }
    const pt = svg.createSVGPoint(); pt.x = n.x * S; pt.y = -n.y * S;
    const q = pt.matrixTransform(ctm), rb = box.getBoundingClientRect();
    setGrab({ x: q.x - rb.left + box.scrollLeft, y: q.y - rb.top + box.scrollTop });
  }, [sel, byId, mode, anim, zoom, ppm]);
  function onGrabDown(e: React.PointerEvent) {
    if (sel?.kind !== "node") return;
    e.stopPropagation();
    down.current = null;
    drag.current = { id: sel.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch {}
  }

  function commit(next: Design, s: Sel = sel) {
    setHist((h) => [...h.slice(-49), design]);
    setDesign(next); setSel(s); setResult(null); setCheck(null); setPreview(null); stopAnim();
    saveDraft(lv.id, next);
  }
  function setSettings(st: Settings) { setSettingsState(st); saveSettings(lv.id, st); setResult(null); setCheck(null); stopAnim(); }

  // --- crowd crossing animation ---
  function stopAnim() { if (raf.current != null) cancelAnimationFrame(raf.current); raf.current = null; setAnim(null); }
  function playCrossing() {
    const c = crossing(lv, design, settings);
    if (!c.ok) { setResult({ ok: false, reason: c.reason }); return; }
    if (raf.current != null) cancelAnimationFrame(raf.current);
    const frames = c.frames, start = performance.now(), end = (frames.length - 1) * FRAME_MS;
    setSel(null); setCheck(null);
    const tick = (now: number) => {
      const el = Math.min(end, now - start), t = el / FRAME_MS, upto = frames.slice(0, Math.floor(t) + 1);
      const worst = Math.max(0, ...upto.flatMap((fr) => Object.values(fr.ratio)));
      setAnim({ frames, t, playing: el < end, worst });
      raf.current = el < end ? requestAnimationFrame(tick) : null;
    };
    raf.current = requestAnimationFrame(tick);
    setTimeout(() => document.querySelector(".tb-canvas")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  }
  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);
  const nid = (p: string) => `${p}${counter.current++}`;

  // --- geometry helpers (world metres) ---
  const tol = Math.max(lv.grid * 0.35, 24 / ppm); // ≈ fingertip radius on screen
  function toWorld(e: { clientX: number; clientY: number }) {
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
    let best: string | null = null, d = Math.max(lv.grid * 0.25, 16 / ppm);
    for (const m of design.members) {
      const a = byId.get(m.a), b = byId.get(m.b); if (!a || !b) continue;
      const vx = b.x - a.x, vy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy)));
      const dd = Math.hypot(a.x + t * vx - x, a.y + t * vy - y);
      if (dd < d) { d = dd; best = m.id; }
    }
    return best;
  }
  const hasMember = (a: string, b: string) => design.members.find((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a));

  const snap = (x: number, y: number) => ({ x: +(Math.round(x / lv.grid) * lv.grid).toFixed(3), y: +(Math.round(y / lv.grid) * lv.grid).toFixed(3) });
  const inArea = (p: { x: number; y: number }) => p.x >= -1e-9 && p.x <= lv.span + 1e-9 && p.y <= lv.above + 1e-9 && p.y >= -lv.below - 1e-9 && Math.abs(p.y) > 1e-9;
  const occupied = (p: { x: number; y: number }) => design.nodes.some((n) => Math.abs(n.x - p.x) < 1e-6 && Math.abs(n.y - p.y) < 1e-6);

  function handleTap(x: number, y: number) {
    const node = nearestNode(x, y);
    if (mode === "joint") {
      if (node) { setSel({ kind: "node", id: node.id }); return; }
      const p = snap(x, y);
      if (!inArea(p) || occupied(p)) { setSel(null); return; }
      const n: DNode = { id: nid("n"), ...p };
      commit({ ...design, nodes: [...design.nodes, n] }, { kind: "node", id: n.id });
      return;
    }
    if (mode === "member") {
      if (!node) { setSel(null); return; } // tapping empty space ends the chain
      if (sel?.kind === "node" && sel.id !== node.id) {
        const ex = hasMember(sel.id, node.id);
        if (ex) { setSel({ kind: "node", id: node.id }); return; }
        commit({ ...design, members: [...design.members, { id: nid("m"), a: sel.id, b: node.id, sec }] }, { kind: "node", id: node.id });
        return;
      }
      setSel(sel?.kind === "node" && sel.id === node.id ? null : { kind: "node", id: node.id });
      return;
    }
    // select mode
    if (node) { setSel({ kind: "node", id: node.id }); return; }
    const mem = nearestMember(x, y);
    if (mem) { setSel({ kind: "member", id: mem }); const m = design.members.find((q) => q.id === mem); if (m) setSec(m.sec); return; }
    setSel(null);
  }
  // A tap acts on release, and only if the finger did not move: scrolling or panning never adds joints.
  // Drag: mouse drags any free joint (Select or Joints mode); touch drags only the highlighted joint, whose
  // handle has touch-action: none so the page doesn't scroll. Everywhere else a swipe still scrolls.
  const canDrag = (n: DNode | null, e: React.PointerEvent) => !!n && !n.kind && !anim && (mode === "select" || mode === "joint") && e.pointerType === "mouse";
  function onDown(e: React.PointerEvent) {
    down.current = e.isPrimary ? { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId } : null;
    if (!e.isPrimary) return;
    const w = toWorld(e), n = nearestNode(w.x, w.y);
    if (canDrag(n, e)) {
      drag.current = { id: n!.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch {}
    }
  }
  function onMove(e: React.PointerEvent) {
    const dr = drag.current;
    if (dr && dr.pointer === e.pointerId) {
      if (!dr.moved && Math.hypot(e.clientX - dr.x, e.clientY - dr.y) > 6) { dr.moved = true; down.current = null; } // select on drop: a bar appearing mid-drag would shift the canvas
      if (dr.moved) {
        const w = toWorld(e), p = snap(w.x, w.y);
        const free = !design.nodes.some((n) => n.id !== dr.id && Math.abs(n.x - p.x) < 1e-6 && Math.abs(n.y - p.y) < 1e-6);
        if (inArea(p) && free) setDragPos((cur) => (cur && cur.x === p.x && cur.y === p.y ? cur : { id: dr.id, ...p }));
        return;
      }
    }
    if (down.current && Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 10) down.current = null;
    if (e.pointerType === "mouse" && mode === "joint") { const w = toWorld(e), p = snap(w.x, w.y); setHover(inArea(p) && !occupied(p) && !nearestNode(w.x, w.y) ? p : null); }
    if (e.pointerType === "mouse" && mode === "member") {
      const w = toWorld(e), n = nearestNode(w.x, w.y), a = sel?.kind === "node" ? byId.get(sel.id) : null;
      setPreview(a && n && n.id !== a.id && !hasMember(a.id, n.id) ? memberCost(sectionByKey(sec), Math.hypot(n.x - a.x, n.y - a.y)).cost : null);
    }
  }
  function endDrag(commitIt: boolean) {
    const dr = drag.current; drag.current = null;
    const dp = dragPos; setDragPos(null);
    if (!commitIt || !dr?.moved || !dp) return false;
    const n = design.nodes.find((q) => q.id === dp.id);
    if (n && (n.x !== dp.x || n.y !== dp.y)) commit({ ...design, nodes: design.nodes.map((q) => (q.id === dp.id ? { ...q, x: dp.x, y: dp.y } : q)) }, { kind: "node", id: dp.id });
    return true;
  }
  function onUp(e: React.PointerEvent) {
    if (drag.current?.pointer === e.pointerId && endDrag(true)) { down.current = null; return; }
    drag.current = null;
    const d = down.current; down.current = null;
    if (!d || d.id !== e.pointerId || Date.now() - d.t > 700 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    const w = toWorld(e); handleTap(w.x, w.y);
  }
  function nudge(dx: number, dy: number) {
    if (sel?.kind !== "node") return;
    const n = byId.get(sel.id); if (!n || n.kind) return;
    const p = { x: +(n.x + dx * lv.grid).toFixed(3), y: +(n.y + dy * lv.grid).toFixed(3) };
    if (!inArea(p) || occupied(p)) return;
    commit({ ...design, nodes: design.nodes.map((q) => (q.id === n.id ? { ...q, ...p } : q)) });
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
  function useTemplate(k: "warren" | "pratt" | "howe") { const t = template(lv, k, sec); counter.current = 1000; commit(t, null); setMode("select"); }
  function clearAll() { commit({ nodes: baseNodes(lv), members: [] }, null); clearDraft(lv.id); }

  async function test() {
    stopAnim();
    const r = evaluate(lv, design, settings, budget);
    setResult(r); setSel(null); setCheck(null);
    if (!r.ok) return;
    const left = await recordRun({ level: lv.id, passed: r.passed, stars: r.stars, cost: Math.round(r.cost), weight: Math.round(r.weight), max_ratio: +r.maxRatio.toFixed(3), design,
      deck: settings.deck, code: settings.code, std: isDefault(lv, settings) });
    setQueued(left); setBest(localBests()[lv.id] ?? null);
    setTimeout(() => document.getElementById("tb-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // --- drawing ---
  const x0 = -1.2, x1 = lv.span + 1.2, yTop = lv.above + 0.8, yBot = -(lv.below + 1.4);
  const vb = `${x0 * S} ${-yTop * S} ${(x1 - x0) * S} ${(yTop - yBot) * S}`;
  const nr = Math.max(0.09, lv.span * 0.012, 7 / ppm) * S, sw = Math.max(0.05, lv.span * 0.006) * S;
  const maxU = res ? Math.max(1e-9, ...Object.values(res.disp).map(([ux, uy]) => Math.hypot(ux, uy))) : 1;
  const k = res ? (lv.span * 0.05) / maxU : 0;
  // crowd crossing: interpolate displacements between frames; one exaggeration scale for the whole crossing
  const af = anim ? Math.min(anim.frames.length - 1, Math.floor(anim.t)) : 0;
  const frame = anim ? anim.frames[af] : null, nextF = anim ? anim.frames[Math.min(anim.frames.length - 1, af + 1)] : null, fr = anim ? anim.t - af : 0;
  const kA = useMemo(() => anim ? (lv.span * 0.05) / Math.max(1e-9, ...anim.frames.flatMap((q) => Object.values(q.disp).map(([ux, uy]) => Math.hypot(ux, uy)))) : 0, [anim?.frames, lv.span]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = (n: DNode, defl = false) => {
    if (anim && frame && nextF) {
      const a = frame.disp[n.id] ?? [0, 0], b = nextF.disp[n.id] ?? a;
      const dx = a[0] + (b[0] - a[0]) * fr, dy = a[1] + (b[1] - a[1]) * fr;
      return [(n.x + dx * kA) * S, -(n.y + dy * kA) * S];
    }
    const d = defl && res ? res.disp[n.id] ?? [0, 0] : [0, 0];
    return [(n.x + d[0] * k) * S, -(n.y + d[1] * k) * S];
  };
  // crowd: walkers spread over the loaded panels; while walking on, the front moves smoothly
  const pw = lv.span / lv.panels;
  const crowd: number[] = [];
  if (anim && frame) {
    const onIn = af < lv.panels; // first half: walking on from the left; second half: walking off to the right
    const from = onIn ? 0 : (frame.pattern.from + (nextF && af < anim.frames.length - 1 ? fr : 0)) * pw;
    const to = onIn ? Math.min(lv.span, (frame.pattern.to + fr) * pw) : lv.span;
    for (let x = from + 0.25; x < to; x += 0.55) crowd.push(x);
  }
  const gridPts: [number, number][] = [];
  for (let gx = 0; gx <= lv.span + 1e-9; gx += lv.grid) for (let gy = -lv.below; gy <= lv.above + 1e-9; gy += lv.grid) if (Math.abs(gy) > 1e-9) gridPts.push([gx, gy]);
  const selMember = sel?.kind === "member" ? design.members.find((m) => m.id === sel.id) : null;
  const checkM = check ? mres.get(check) : null;
  const families = Array.from(new Set(SECTIONS.map((s) => s.family)));
  const barMax = budget * 1.25;
  const meterState = live.cost <= 0.9 * budget ? "g3" : live.cost <= budget ? "g2" : "over";

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
        <span>Dead <b>{dlOf(lv, settings.deck)} kPa</b> · Live <b>{lv.ll} kPa</b></span><span>Budget <b>{peso(budget)}</b></span>
        {best && <span>Your best <b>{"★".repeat(best.stars) || "–"}</b>{best.best_cost != null && <> · {peso(best.best_cost)}</>}</span>}
      </div>

      <div className="tb-settings">
        <label><span>Deck</span>
          <select value={settings.deck} onChange={(e) => setSettings({ ...settings, deck: e.target.value as DeckKey })}>
            {(Object.keys(DECKS) as DeckKey[]).map((k) => <option key={k} value={k}>{DECKS[k].name} · {DECKS[k].dl} kPa{k === lv.deck ? " (standard)" : ""}</option>)}
          </select></label>
        <label><span>Design code</span>
          <select value={settings.code} onChange={(e) => setSettings({ ...settings, code: e.target.value as CodeKey })}>
            {(Object.keys(CODES) as CodeKey[]).map((k) => <option key={k} value={k}>{CODES[k].name}{k === "aisc" ? " (standard)" : ""}</option>)}
          </select></label>
        <span className="fine">{isDefault(lv, settings) ? "Standard setting: best cost counts on the Games page." : "Practice setting: own budget; stars count, best cost doesn't."}{lv.extra ? ` Includes ${lv.extra} kPa other dead load (${lv.id === 4 ? "water mains" : "railings and services"}).` : ""}</span>
      </div>

      <div className="tb-tools">
        <label className="tb-sec">
          <span>{selMember ? "Section (selected member)" : "Section for new members"}</span>
          <select value={sec} onChange={(e) => pickSection(e.target.value)}>
            {families.map((fam) => (
              <optgroup key={fam} label={FAMILY_LABEL[fam]}>
                {SECTIONS.filter((s) => s.family === fam).map((s) => <option key={s.key} value={s.key}>{s.name} · {f(s.kgm, 1)} kg/m · {peso(s.kgm * s.pricekg)}/m · r {f(s.rmin, 1)} mm</option>)}
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

      <div className="tb-modes" role="tablist" aria-label="Tool">
        {([["joint", "✚ Joints", "add joints"], ["member", "⟋ Members", "connect joints"], ["select", "☝ Select", "edit or delete"]] as const).map(([k, label, sub]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => { setMode(k); setSel(null); setHover(null); setPreview(null); }}>
            <span>{label}</span><small>{sub}</small>
          </button>
        ))}
      </div>
      {sel?.kind === "node" && !byId.get(sel.id)?.kind && (
        <div className="tb-nudge">
          <span className="fine">Move joint:</span>
          <button type="button" onClick={() => nudge(-1, 0)} aria-label="Move left">←</button>
          <button type="button" onClick={() => nudge(0, 1)} aria-label="Move up">↑</button>
          <button type="button" onClick={() => nudge(0, -1)} aria-label="Move down">↓</button>
          <button type="button" onClick={() => nudge(1, 0)} aria-label="Move right">→</button>
          <button type="button" className="tb-del" onClick={del}>Delete joint</button>
        </div>
      )}
      {mode === "member" && sel?.kind === "node" && <div className="tb-nudge"><span className="fine">Chain from the highlighted joint. Tap a joint to add a member.</span><button type="button" onClick={() => setSel(null)}>Done</button></div>}
      {selMember && (() => {
        const a = byId.get(selMember.a), b = byId.get(selMember.b), sc = sectionByKey(selMember.sec);
        if (!a || !b) return null;
        const L = Math.hypot(b.x - a.x, b.y - a.y), mc = memberCost(sc, L);
        return <div className="tb-nudge tb-meminfo"><span><b>{selMember.id}</b> · {sc.name} · L {f(L)} m · {f(mc.kg, 1)} kg · <b>{peso(mc.cost)}</b> <span className="fine">(both trusses)</span></span><button type="button" className="tb-del" onClick={del}>Delete member</button></div>;
      })()}
      <div className="tb-canvas">
        <div className={`tb-meter ${meterState}`} aria-live="polite">
          <div className="tm-top">
            <div className="tm-main">
              <span className="tm-lbl">Bridge cost</span>
              <b className="tm-cost">{peso(live.cost)}</b>
              {delta && <span key={delta.k} className={`tm-delta ${delta.v > 0 ? "up" : "down"}`}>{delta.v > 0 ? "+" : "−"}{peso(Math.abs(delta.v))}</span>}
              {preview != null && <span className="tm-preview">next member +{peso(preview)}</span>}
            </div>
            <div className="tb-zoom" aria-label="Zoom">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Zoom out">−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} disabled={zoom >= 4} aria-label="Zoom in">+</button>
            </div>
          </div>
          <div className="tm-bar" role="meter" aria-valuemin={0} aria-valuemax={Math.round(budget)} aria-valuenow={Math.round(live.cost)} aria-label="Cost against budget">
            <i style={{ width: `${Math.min(100, (live.cost / barMax) * 100)}%` }} />
            <span className="tm-mark" style={{ left: `${(0.9 * budget / barMax) * 100}%` }} title={`3★ at ≤ ${peso(budget * 0.9)}`}><em>3★</em></span>
            <span className="tm-mark" style={{ left: `${(budget / barMax) * 100}%` }} title={`Budget ${peso(budget)}`}><em>2★</em></span>
          </div>
          <div className="tm-sub">
            <span className="tm-zone">{live.cost <= 0.9 * budget ? "3★ zone" : live.cost <= budget ? "2★ zone" : "Over budget: 1★ max"}</span>
            <span>{live.cost <= budget ? `${peso(budget - live.cost)} left of ${peso(budget)}` : `${peso(live.cost - budget)} over ${peso(budget)}`}</span>
            <span>Steel {Math.round(live.weight)} kg = {peso(live.steelCost)}</span>
            <span>Joints {live.joints} × {peso(2 * JOINT_COST)} = {peso(live.jointCost)}</span>
            {live.loose > 0 && <span className="tm-warn">{live.loose} loose joint{live.loose > 1 ? "s" : ""}</span>}
          </div>
        </div>
        <div className="tb-scroll">
        <svg ref={svgRef} style={{ width: `${zoom * 100}%`, maxHeight: zoom > 1 ? "none" : undefined }} viewBox={vb} preserveAspectRatio="xMidYMid meet" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { down.current = null; endDrag(false); }} onPointerLeave={() => { setHover(null); setPreview(null); }} role="img" aria-label="Truss canvas">
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
          {hover && <circle cx={hover.x * S} cy={-hover.y * S} r={nr} fill="none" stroke="#1e2b3c" strokeWidth={sw * 0.5} strokeDasharray={`${sw} ${sw}`} />}
          {/* members */}
          {design.members.map((m) => {
            const a = byId.get(m.a), b = byId.get(m.b); if (!a || !b) return null;
            const [ax, ay] = pos(a), [bx, by] = pos(b), mr = anim ? undefined : mres.get(m.id), on = sel?.kind === "member" && sel.id === m.id;
            const animColor = frame ? colorRatio(frame.ratio[m.id] ?? 0) : null;
            const w = sw * (0.8 + Math.min(2, sectionByKey(m.sec).A / 900));
            return <g key={m.id}>
              {on && <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#f3d98b" strokeWidth={w + sw * 1.6} strokeLinecap="round" />}
              <line x1={ax} y1={ay} x2={bx} y2={by} stroke={animColor ?? colorOf(mr)} strokeWidth={w} strokeLinecap="round" strokeDasharray={mr && !mr.slenderOk ? `${sw * 2} ${sw * 1.2}` : undefined} />
            </g>;
          })}
          {/* deflected shape */}
          {res && showDefl && !anim && design.members.map((m) => {
            const a = byId.get(m.a), b = byId.get(m.b); if (!a || !b || !res.disp[a.id] || !res.disp[b.id]) return null;
            const [ax, ay] = pos(a, true), [bx, by] = pos(b, true);
            return <line key={`d${m.id}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="#1e2b3c" strokeWidth={sw * 0.5} strokeDasharray={`${sw} ${sw}`} opacity=".55" />;
          })}
          {/* crowd */}
          {crowd.map((x, i) => {
            const bob = Math.sin((anim?.t ?? 0) * 9 + i) * 0.03, h = 0.42 + (i % 3) * 0.04, deckY = -pos({ id: "", x, y: 0 })[1] / S;
            const dkL = Math.floor(x / pw), u = Math.min(1, x / pw - dkL);
            const ya = byId.get(`d${dkL}`), yb = byId.get(`d${Math.min(lv.panels, dkL + 1)}`);
            const yDeck = ya && yb ? -((pos(ya)[1] * (1 - u) + pos(yb)[1] * u)) / S : deckY;
            return <g key={i} transform={`translate(${x * S} ${-(yDeck + bob) * S})`} opacity=".9">
              <path d={`M${-(Math.sin((anim?.t ?? 0) * 9 + i) * 0.07) * S} 0 L0 ${-h * 0.36 * S} L${(Math.sin((anim?.t ?? 0) * 9 + i) * 0.07) * S} 0`} fill="none" stroke="#7a4fa0" strokeWidth={sw * 0.8} strokeLinecap="round" strokeLinejoin="round" />
              <line x1={0} y1={-h * 0.36 * S} x2={0} y2={-h * 0.78 * S} stroke="#7a4fa0" strokeWidth={sw * 1.1} strokeLinecap="round" />
              <circle cx={0} cy={-h * S} r={0.085 * S} fill="#7a4fa0" />
            </g>;
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
        {grab && <div className="tb-grab" style={{ left: grab.x, top: grab.y }} onPointerDown={onGrabDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={() => { down.current = null; endDrag(false); }} aria-label="Drag to move the joint" role="button" />}
        </div>
        <div className="tb-hint">
          {anim && frame ? <span className="tb-anim-cap"><b>{frame.pattern.label}</b> · worst member now {f(Math.max(0, ...Object.values(frame.ratio)), 2)} · worst so far <b style={{ color: colorRatio(anim.worst) }}>{f(anim.worst, 2)}</b></span> :
          dragPos ? "Drop the joint on a grid point. The cost meter follows the move." :
          mode === "joint" ? "Tap a grid point to add a joint. Drag a joint to move it (on touch: tap it first, then drag). Swipe to scroll." :
            mode === "member" ? (sel?.kind === "node" ? "Tap the next joint to connect. Tap empty space or Done to stop." : "Tap a joint, then another joint, to add a member.") :
              sel?.kind === "member" ? "Member selected: change its section above, or Delete." : sel?.kind === "node" ? "Drag the highlighted joint to move it, or use the arrows." : "Tap a member to change its section, or a joint to move or delete it. Drag joints to move them."}
        </div>
      </div>

      <div className="tb-run">
        <button type="button" className="btn" style={{ marginTop: 0 }} onClick={test}>▶ Run load test</button>
        {anim?.playing ? <button type="button" className="btn ghost tb-cross" onClick={stopAnim}>■ Stop crossing</button>
          : <button type="button" className="btn ghost tb-cross" onClick={anim ? stopAnim : playCrossing} disabled={design.members.length < 3}>{anim ? "✕ Close crossing" : "🚶 Crowd crossing"}</button>}
        {res && <label className="fine tb-check-lbl"><input type="checkbox" checked={showDefl} onChange={(e) => setShowDefl(e.target.checked)} /> Show deflected shape (exaggerated)</label>}
        {queued > 0 && <span className="fine">{queued} run(s) saved on this device, waiting to sync</span>}
      </div>

      {result && !result.ok && <div className="msg err" id="tb-results">{result.reason}</div>}

      {res && (
        <section className="panel tb-results" id="tb-results">
          <div className="tb-verdict">
            <span className={`tb-badge ${res.passed ? "ok" : "bad"}`}>{res.passed ? "PASSED" : "FAILED"}</span>
            <span className="tb-stars" aria-label={`${res.stars} stars`}>{[1, 2, 3].map((i) => <span key={i} className={i <= res.stars ? "on" : ""}>★</span>)}</span>
            <span>Cost <b>{peso(res.cost)}</b> <span className="fine">({res.cost <= budget ? "within" : "over"} budget {peso(budget)}; 3★ at ≤ {peso(budget * 0.9)})</span></span>
          </div>
          <div className="tb-stats">
            <div><small>Max ratio</small><b style={{ color: colorOf({ ratio: res.maxRatio, slenderOk: true } as MemberResult) }}>{f(res.maxRatio, 2)}</b></div>
            <div><small>Deflection (live)</small><b>{f(res.defl, 1)} / {f(res.deflLimit, 1)} mm</b></div>
            <div><small>Steel, 2 trusses</small><b>{Math.round(res.weight)} kg</b></div>
            <div><small>Steel + joints</small><b>{peso(res.steelCost)} + {peso(res.jointCost)}</b></div>
          </div>
          {res.issues.length > 0 && <ul className="tb-issues">{res.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
          {res.notes.length > 0 && <ul className="tb-notes">{res.notes.map((i) => <li key={i}>{i}</li>)}</ul>}
          <p className="fine">{res.settings.code === "bs" ? "BS 5950" : "NSCP / AISC"} · {DECKS[res.settings.deck].name}. Each member is checked for the worst crowd position (any run of panels from either end), so diagonals see their partial-loading peak. Ratio = factored force ÷ design strength. Green &lt; 0.70, amber 0.70–1.00, red &gt; 1.00 or too slender (dashed). Tap a row for the full check.</p>
          <div className="tb-table">
            <table>
              <thead><tr><th>Member</th><th>Section</th><th>L (m)</th><th>{res.settings.code === "bs" ? "F (kN)" : "Pu (kN)"}</th><th>{res.settings.code === "bs" ? "Pc / Pt (kN)" : "φPn (kN)"}</th><th>Ratio</th><th>Cost</th></tr></thead>
              <tbody>
                {[...res.members].sort((a, b) => b.ratio - a.ratio).map((m) => (
                  <tr key={m.id} className={check === m.id ? "on" : ""} onClick={() => { setCheck(check === m.id ? null : m.id); setSel({ kind: "member", id: m.id }); }}>
                    <td><span className="tb-dot" style={{ background: colorOf(m) }} />{m.id}</td>
                    <td>{m.sec.name}</td><td>{f(m.L)}</td>
                    <td>{f(Math.abs(m.Pu), 1)} {m.mode === "tension" ? "T" : m.mode === "compression" ? "C" : "0"}</td>
                    <td>{f(m.phiPn, 1)}</td><td><b>{f(m.ratio, 2)}</b>{!m.slenderOk && " ⚠"}</td><td>{peso(memberCost(m.sec, m.L).cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {checkM && (
            <div className="tb-check">
              <h3>Real check: {checkM.id} ({checkM.sec.name})</h3>
              <ol>{checkM.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <p className="fine">{res.settings.code === "bs"
                ? <><span className="badge b-review">verify</span> BS 5950-1:2000 clauses 4.6 (tension) and 4.7 with Annex C (compression), using the game assumptions listed in the steps. Connections are not designed in this game.</>
                : "AISC 360-10 Ch. D and E, as adopted in NSCP 2015 Sections 504–505. Connections are not designed in this game."}</p>
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
