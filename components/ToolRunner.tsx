"use client";
import { Fragment, useMemo, useState } from "react";
import { CALCS, defaults, type Inputs } from "@/lib/calc";
import { toCsv } from "@/lib/export";

type HandCheck = { inputs: Inputs; results: { label: string; value: number | string; unit?: string }[]; verified_by?: string; note?: string };

export default function ToolRunner({ calcKey, handCheck }: { calcKey: string; handCheck?: HandCheck | null }) {
  const calc = CALCS[calcKey];
  const [vals, setVals] = useState<Inputs>(() => (calc ? defaults(calc) : {}));
  const out = useMemo(() => {
    if (!calc) return null;
    try {
      const bad = calc.fields.some((f) => f.type === "number" && !Number.isFinite(Number(vals[f.key])));
      return bad ? null : calc.compute(vals);
    } catch { return null; }
  }, [calc, vals]);
  if (!calc) return <div className="msg err">Unknown calculator: {calcKey}</div>;

  return (
    <div className="tool">
      <div className="panel">
        <h2>Inputs</h2>
        <div className="tool-grid">
          {calc.fields.map((f, fi) => (
            <Fragment key={f.key}>
            {f.group && f.group !== calc.fields[fi - 1]?.group && <h3 className="fld-group">{f.group}</h3>}
            <label className="fld">
              <span>{f.label}{f.unit ? <span className="muted"> ({f.unit})</span> : null}</span>
              {f.type === "text" ? (
                <textarea rows={f.rows ?? 6} value={String(vals[f.key])} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              ) : f.type === "number" ? (
                <input inputMode="decimal" value={String(vals[f.key])} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              ) : (
                <select value={String(vals[f.key])} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {f.help && <small className="muted">{f.help}</small>}
            </label>
            </Fragment>
          ))}
        </div>
        <div className="no-print" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button type="button" className="btn ghost" style={{ width: "auto" }} onClick={() => setVals(defaults(calc))}>Reset to example</button>
          <button type="button" className="btn ghost" style={{ width: "auto" }} onClick={() => window.print()}>Print / save as PDF</button>
          <button type="button" className="btn ghost" style={{ width: "auto" }} disabled={!out} onClick={() => {
            if (!out) return;
            const blob = new Blob([toCsv(calc, vals, out, { source: window.location.href })], { type: "text/csv;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = `${calc.key}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
            URL.revokeObjectURL(a.href);
          }}>Download CSV (Excel)</button>
        </div>
      </div>

      {out ? (
        <>
          <div className="panel results">
            <h2>Results</h2>
            <div className="res-grid">
              {out.results.map((x) => (
                <div key={x.label} className={`res ${x.main ? "main" : ""}`}>
                  <span className="lbl">{x.label}</span>
                  <span className="val">{x.value} <small>{x.unit}</small></span>
                </div>
              ))}
            </div>
            {out.table && (
              <div className="tbl-wrap" style={{ marginTop: ".9rem" }}>
                <table className="tbl compact">
                  <thead><tr>{out.table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>{out.table.rows.map((row, ri) => (
                    <tr key={ri} className={out.table!.highlight?.includes(ri) ? "hl" : ""}>
                      {row.map((v, ci) => <td key={ci} className={typeof v === "number" ? "num" : ""}>{v}</td>)}
                    </tr>))}
                  </tbody>
                </table>
              </div>
            )}
            <ul className="checks">
              {out.checks.map((c) => <li key={c.label} className={c.ok ? "ok" : "bad"}>{c.ok ? "✓" : "✕"} <strong>{c.label}</strong>: {c.detail}</li>)}
            </ul>
          </div>
          <details className="panel" open>
            <summary><strong>Step-by-step (for hand checking)</strong></summary>
            <ol className="steps">{out.steps.map((s, i) => <li key={i}><code>{s}</code></li>)}</ol>
          </details>
        </>
      ) : <div className="msg err">Enter valid numbers in all fields.</div>}

      {handCheck && (
        <details className="panel no-print">
          <summary><strong>Recorded hand-check example</strong>{handCheck.verified_by ? ` · ${handCheck.verified_by}` : ""}</summary>
          <p className="fine">Inputs: {Object.entries(handCheck.inputs).map(([k, v]) => `${k} = ${v}`).join(", ")}</p>
          <ul>{handCheck.results.map((r) => <li key={r.label}>{r.label}: <strong>{r.value} {r.unit}</strong></li>)}</ul>
          {handCheck.note && <p className="fine">{handCheck.note}</p>}
        </details>
      )}
    </div>
  );
}
