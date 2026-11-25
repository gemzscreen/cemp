"use client";
import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Sketch from "@/components/Sketch";
import { CALCS, defaults, type Inputs } from "@/lib/calc";
import type { Field, Preset } from "@/lib/calc/core";
import { toCsv } from "@/lib/export";
import { useRouter } from "next/navigation";
import { addToProject, updateItem, type AddResult } from "@/app/(app)/estimate/actions";

type Meta = { key: string; group: string; sketch: string; blurb: string; no: number; total: number };
export type EditTarget = { projectId: string; projectName: string; itemId: string; itemNo: number; label: string; inputs: Inputs };

/** Apply every preset whose "from" fields changed (or all, on reset). */
function applyPresets(vals: Inputs, presets: Preset[] = [], changed?: string) {
  let v = { ...vals };
  for (const p of presets) {
    if (changed && !p.from.includes(changed)) continue;
    const hit = p.map[p.from.map((f) => String(v[f])).join("|")];
    if (hit) v = { ...v, ...hit };
  }
  return v;
}
const fmtQty = (u: string, q: number) => (["bags", "pcs", "sheets"].includes(u) ? Math.ceil(q - 1e-9).toLocaleString("en-US") : (Math.round(q * 100) / 100).toLocaleString("en-US"));

export default function EstimatorView({ meta, projects, edit = null }: { meta: Meta; projects: { id: string; name: string }[]; edit?: EditTarget | null }) {
  const calc = CALCS[meta.key];
  // revise mode: saved inputs win over presets (the presets were applied when the item was first made)
  const initial = useMemo(() => edit ? { ...defaults(calc), ...edit.inputs } : applyPresets(defaults(calc), calc.presets), [calc, edit]);
  const [vals, setVals] = useState<Inputs>(initial);
  const [target, setTarget] = useState(edit?.projectId ?? projects[0]?.id ?? "__new");
  const [newName, setNewName] = useState("");
  const [label, setLabel] = useState(edit?.label ?? "");
  const router = useRouter();
  const [res, setRes] = useState<AddResult | null>(null);
  const [pending, start] = useTransition();

  const out = useMemo(() => {
    const bad = calc.fields.some((f) => f.type === "number" && !Number.isFinite(Number(vals[f.key])));
    if (bad) return null;
    try { return calc.compute(vals); } catch { return null; }
  }, [calc, vals]);
  const unit = useMemo(() => {
    if (!("count" in vals) || Number(vals.count) === 1) return null;
    try { return calc.compute({ ...vals, count: 1 }).materials ?? null; } catch { return null; }
  }, [calc, vals]);
  const snap = (unit ?? out?.materials ?? []).slice(0, 6);
  // headline results that are not materials (capacity, net area, board feet, steel weight…)
  const matNames = new Set((out?.materials ?? []).map((m) => m.name.toLowerCase()));
  const keyResults = (out?.results ?? []).filter((x) => x.main && !/cement|sand|gravel|bars \(|^chb|^legs|^ties\/|tie wire/i.test(x.label) && !matNames.has(String(x.label).toLowerCase())).slice(0, 3);
  const set = (k: string, v: string | number) => setVals((cur) => applyPresets({ ...cur, [k]: v }, calc.presets, k));
  const presetNote = calc.presets?.map((p) => p.label).filter(Boolean).join(" · ");

  const add = () => start(async () => {
    setRes(null);
    const r = await addToProject({ projectId: target === "__new" ? undefined : target, newName, label: label || calc.title, calcKey: calc.key, inputs: vals });
    setRes(r);
  });
  const save = () => start(async () => {
    if (!edit) return;
    setRes(null);
    const r = await updateItem({ projectId: edit.projectId, itemId: edit.itemId, label: label || calc.title, calcKey: calc.key, inputs: vals });
    if (r.ok) router.push(`/estimate/projects/${edit.projectId}?ok=updated#item-${edit.itemId}`); else setRes(r);
  });
  const csv = () => {
    if (!out) return;
    const blob = new Blob([toCsv(calc, vals, out, { source: window.location.href })], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${calc.key}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const groups = calc.fields.reduce<{ name: string; fields: Field[] }[]>((acc, f) => {
    const g = f.group ?? "Inputs"; const last = acc[acc.length - 1];
    if (last && last.name === g) last.fields.push(f); else acc.push({ name: g, fields: [f] });
    return acc;
  }, []);

  return (
    <div className="est">
      {edit && (
        <div className="msg revise no-print">
          <span>Revising item {edit.itemNo} <strong>{edit.label}</strong> in <Link href={`/estimate/projects/${edit.projectId}`}>{edit.projectName}</Link>. Change the inputs, then <strong>Update item</strong>.</span>
          <span className="rv-actions">
            <button type="button" className="btn" style={{ width: "auto", margin: 0 }} disabled={pending || !out} onClick={save}>{pending ? <><span className="spin" aria-hidden /> Saving…</> : "Update item"}</button>
            <Link className="btn ghost" href={`/estimate/projects/${edit.projectId}`}>Cancel</Link>
          </span>
        </div>
      )}
      <div className="est-head">
        <div>
          <span className="est-kicker">Calculator {meta.no} of {meta.total} · {meta.group}</span>
          <h1>{calc.title}</h1>
          <p>{meta.blurb}</p>
        </div>
        <div className="est-actions no-print">
          <button type="button" className="btn ghost" onClick={() => setVals(initial)}>Reset</button>
          <button type="button" className="btn ghost" onClick={() => window.print()}>Print / PDF</button>
          <button type="button" className="btn ghost" onClick={csv} disabled={!out}>CSV (Excel)</button>
        </div>
      </div>

      <div className="est-grid">
        <div className="est-left">
          <Sketch kind={meta.sketch} i={vals} />
          {keyResults.length > 0 && (
            <div className="key-results">
              {keyResults.map((x) => <div key={x.label} className="kr"><span className="lbl">{x.label}</span><span className="val">{x.value} <small>{x.unit}</small></span></div>)}
            </div>
          )}
          {snap.length > 0 && (
            <div className="panel est-snap">
              <div className="est-sub"><strong>Material snapshot</strong><span>{unit ? "per 1 unit" : "total"}</span></div>
              <div className="snap-grid">
                {snap.map((m) => <div key={m.key} className="snap"><span className="lbl">{m.name}</span><span className="val">{fmtQty(m.unit, m.qty)} <small>{m.unit}</small></span></div>)}
              </div>
            </div>
          )}
          {out ? (
            <>
              <div className="panel">
                <div className="est-sub"><strong>Bill of materials</strong><span>{"count" in vals ? `${vals.count} unit(s)` : ""}</span></div>
                <table className="tbl compact bom">
                  <thead><tr><th>Material</th><th className="num">Qty</th><th>Unit</th></tr></thead>
                  <tbody>{(out.materials ?? []).map((m) => <tr key={m.key}><td>{m.name}</td><td className="num">{fmtQty(m.unit, m.qty)}</td><td>{m.unit}</td></tr>)}</tbody>
                </table>
                <ul className="checks">{out.checks.map((c) => <li key={c.label} className={c.ok ? "ok" : "bad"}>{c.ok ? "✓" : "✕"} <strong>{c.label}</strong>: {c.detail}</li>)}</ul>
              </div>
              {out.table && (
                <details className="panel">
                  <summary><strong>Cutting list / breakdown</strong></summary>
                  <div className="tbl-wrap"><table className="tbl compact">
                    <thead><tr>{out.table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>{out.table.rows.map((row, ri) => <tr key={ri}>{row.map((v, ci) => <td key={ci} className={typeof v === "number" ? "num" : ""}>{v}</td>)}</tr>)}</tbody>
                  </table></div>
                </details>
              )}
              <details className="panel">
                <summary><strong>Step-by-step (for checking by hand)</strong></summary>
                <ol className="steps">{out.steps.map((s, k) => <li key={k}><code>{s}</code></li>)}</ol>
              </details>
            </>
          ) : <div className="msg err">Enter valid numbers in all fields.</div>}
        </div>

        <div className="est-right">
          {presetNote && <div className="est-preset">Presets: {presetNote}. Orange fields are filled by the preset and can be edited.</div>}
          {groups.map((g) => (
            <div key={g.name} className="panel est-fields">
              <h3>{g.name}</h3>
              <div className="tool-grid">
                {g.fields.map((f) => {
                  const fromPreset = calc.presets?.some((p) => Object.values(p.map)[0] && f.key in Object.values(p.map)[0]);
                  return (
                    <Fragment key={f.key}>
                      <label className={`fld ${fromPreset ? "preset" : ""}`}>
                        <span>{f.label}{f.unit ? <span className="muted"> ({f.unit})</span> : null}</span>
                        {f.type === "text" ? <textarea rows={f.rows ?? 5} value={String(vals[f.key])} onChange={(e) => set(f.key, e.target.value)} />
                          : f.type === "number" ? <input inputMode="decimal" value={String(vals[f.key])} onChange={(e) => set(f.key, e.target.value)} />
                          : <select value={String(vals[f.key])} onChange={(e) => set(f.key, e.target.value)}>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
                        {f.help && <small className="muted">{f.help}</small>}
                      </label>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="panel est-add no-print">
            <h3>{edit ? `Save item ${edit.itemNo} in ${edit.projectName}` : "Add to a project BOM"}</h3>
            <div className="tool-grid">
              <label className="fld"><span>Item label</span><input value={label} placeholder={`e.g. F-1 footings (${calc.title})`} onChange={(e) => setLabel(e.target.value)} /></label>
              {!edit && <label className="fld"><span>Project</span>
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="__new">+ New project…</option>
                </select></label>}
              {!edit && target === "__new" && <label className="fld"><span>New project name</span><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Mahilum water tank" /></label>}
            </div>
            {edit ? (
              <div className="rv-actions">
                <button type="button" className="btn" style={{ width: "auto" }} disabled={pending || !out} onClick={save}>{pending ? <><span className="spin" aria-hidden /> Saving…</> : "Update item"}</button>
                <button type="button" className="btn ghost" style={{ width: "auto" }} disabled={pending || !out} onClick={add} title="Keep the original and add this as another item">Save as new item</button>
              </div>
            ) : (
              <button type="button" className="btn" style={{ width: "auto" }} disabled={pending || !out} onClick={add}>{pending ? <><span className="spin" aria-hidden /> Adding…</> : "Add to BOM"}</button>
            )}
            {res?.error && <div className="msg err" style={{ marginTop: ".5rem" }}>{res.error}</div>}
            {res?.ok && <div className="msg ok" style={{ marginTop: ".5rem" }}>Added to <strong>{res.projectName}</strong>. <Link href={`/estimate/projects/${res.projectId}`}>Open BOM →</Link></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
