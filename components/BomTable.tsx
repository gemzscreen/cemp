"use client";
// v2.1.0: project bill of materials grouped by item, with live amounts. One unit price per material:
// typing a price in any group fills every line of that material (same input name, shared state), so the
// server action still receives `price:<material key>` exactly as before.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { BomGroup, BomLine } from "@/lib/bom";
import { showQty } from "@/lib/bom";

const peso = (x: number) => `₱${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BomTable({ groups, combined, prices: initial, projectId, calcTitles }: {
  groups: BomGroup[]; combined: BomLine[]; prices: Record<string, number>; projectId: string; calcTitles: Record<string, string>;
}) {
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])));
  const num = (k: string) => { const v = prices[k]; return v != null && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null; };

  const sub = useMemo(() => groups.map((g) => g.lines.reduce((s, l) => s + (num(l.key) ?? 0) * l.show, 0)), [groups, prices]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = sub.reduce((a, b) => a + b, 0);
  const keys = combined.map((b) => b.key);
  const priced = keys.filter((k) => num(k) != null).length;
  const set = (k: string, v: string) => setPrices((p) => ({ ...p, [k]: v }));

  if (!groups.length) return <p className="fine">No items yet. <Link href="/estimate">Open a calculator</Link> and use “Add to BOM”.</p>;

  return (
    <>
      <div className="tbl-wrap"><table className="tbl compact bom bom-grouped">
        <thead><tr><th>#</th><th>Material</th><th className="num">Qty</th><th>Unit</th><th className="num">Unit price (₱)</th><th className="num">Amount</th></tr></thead>
        {groups.map((g, gi) => (
          <tbody key={g.id} className="bom-group">
            <tr className="grp-head">
              <td>{g.no}</td>
              <td colSpan={4}><strong>{g.label}</strong>{(calcTitles[g.calcKey] ?? g.calcKey) !== g.label && <span className="muted"> · {calcTitles[g.calcKey] ?? g.calcKey}</span>}
                <Link className="rv-link no-print" href={`/estimate/${g.calcKey.replace(/^est-/, "")}?p=${projectId}&i=${g.id}`}>revise</Link></td>
              <td className="num" />
            </tr>
            {g.lines.map((l, li) => {
              const pr = num(l.key);
              return (
                <tr key={l.key}>
                  <td className="fine">{g.no}.{li + 1}</td><td>{l.name}</td><td className="num">{l.show.toLocaleString("en-US")}</td><td>{l.unit}</td>
                  <td className="num"><input className="price" name={`price:${l.key}`} value={prices[l.key] ?? ""} onChange={(e) => set(l.key, e.target.value)} inputMode="decimal" placeholder="0.00" aria-label={`Unit price of ${l.name}`} /></td>
                  <td className="num">{pr != null ? peso(pr * l.show) : "–"}</td>
                </tr>
              );
            })}
            <tr className="grp-sub"><td /><td colSpan={4}>Subtotal, {g.label}</td><td className="num"><strong>{peso(sub[gi])}</strong></td></tr>
          </tbody>
        ))}
        <tbody>
          <tr className="hl"><td /><td><strong>Total materials</strong></td><td /><td /><td className="fine num">{priced}/{keys.length} priced</td><td className="num"><strong>{peso(total)}</strong></td></tr>
        </tbody>
      </table></div>

      <details className="bom-combined">
        <summary><strong>Combined by material</strong> <span className="fine">(purchase list across all items)</span></summary>
        <div className="tbl-wrap"><table className="tbl compact bom">
          <thead><tr><th>#</th><th>Material</th><th className="num">Qty</th><th>Unit</th><th className="num">Unit price</th><th className="num">Amount</th><th className="no-print">Used in</th></tr></thead>
          <tbody>
            {combined.map((b, k) => {
              const q = showQty(b.unit, b.qty), pr = num(b.key);
              return <tr key={b.key}><td>{k + 1}</td><td>{b.name}</td><td className="num">{q.toLocaleString("en-US")}</td><td>{b.unit}</td><td className="num">{pr != null ? peso(pr) : "–"}</td><td className="num">{pr != null ? peso(pr * q) : "–"}</td><td className="fine no-print">{b.from.join(", ")}</td></tr>;
            })}
          </tbody>
        </table></div>
        <p className="fine">Here each material is summed before rounding up, so a count can be a little lower than the sum of the item lines above.</p>
      </details>
    </>
  );
}
