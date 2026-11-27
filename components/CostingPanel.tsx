"use client";
// v2.2.0: project costing on top of the BOM. Labour per item (% of materials or crew × rate × days),
// equipment per item, then OCM, profit and VAT on the project. Live totals; Save stores it in estimate_projects.costing.
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Material, Inputs } from "@/lib/calc";
import { computeCost, DEFAULT_ITEM, money, withRateSet, type Costing, type ItemCosting } from "@/lib/costing";
import { crewLabel } from "@/lib/labour";
import { TRADES, curSym, type RateSet } from "@/lib/rates";
import { saveCosting } from "@/app/(app)/estimate/actions";

type Item = { id: string; label: string; calcKey: string; materials: Material[]; inputs?: Inputs };

export default function CostingPanel({ projectId, items, prices, initial, sets }: { projectId: string; items: Item[]; prices: Record<string, number>; initial: Costing; sets: RateSet[] }) {
  const [c, setC] = useState<Costing>(initial);
  // v2.8.0: the project's labour rate set decides the trade rates, the currency and whether VAT applies
  const set = sets.find((x) => x.id === c.rateSet) ?? sets[0];
  const labour = set.labour, cur = set.currency, sym = curSym(cur);
  const peso = (x: number) => money(x, cur);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const r = useMemo(() => computeCost(items, prices, withRateSet(c, set), labour), [items, prices, c, set, labour]);

  const setItem = (id: string, patch: Partial<ItemCosting>) => { setC((x) => ({ ...x, items: { ...x.items, [id]: { ...(x.items[id] ?? DEFAULT_ITEM), ...patch } } })); setDirty(true); setMsg(null); };
  const setTop = (k: "ocm" | "profit" | "vat", v: string) => { setC((x) => ({ ...x, [k]: Math.max(0, Number(v) || 0) })); setDirty(true); setMsg(null); };
  const nf = (v: string) => Math.max(0, Number(v) || 0);
  const save = () => start(async () => { const res = await saveCosting(projectId, c); setMsg(res); if (res.ok) setDirty(false); });

  if (!items.length) return null;
  const pct = (x: number) => (r.direct > 0 ? `${((x / r.direct) * 100).toFixed(1)}%` : "–");

  return (
    <section className="panel costing no-print" id="costing">
      <div className="cost-head">
        <div>
          <h2 style={{ margin: 0 }}>Costing</h2>
          <p className="fine" style={{ margin: ".2rem 0 0" }}>Materials come from the saved unit prices above. Labour per item: % of materials, crew-days, or a trade crew with typical output (rates from <Link href="/estimate/rates">My rates</Link>). Then equipment and markups.</p>
        </div>
        <div className="est-actions">
          <Link className="btn ghost" href={`/estimate/projects/${projectId}/quote`}>Quotation →</Link>
          <a className="btn ghost" href={`/estimate/projects/${projectId}/xlsx`}>Excel (.xlsx)</a>
        </div>
      </div>

      <div className="cost-set">
        <label className="fld" style={{ margin: 0 }}><span>Labour rate set</span>
          <select value={set.id} onChange={(e) => { setC((x) => ({ ...x, rateSet: e.target.value })); setDirty(true); setMsg(null); }} aria-label="Labour rate set">
            {sets.map((x) => <option key={x.id} value={x.id}>{x.name} ({curSym(x.currency)}{x.vat ? "" : ", no VAT"})</option>)}
          </select></label>
        <span className="fine">Money in {sym}{set.vat ? "" : " · no VAT on this project's quotation"} · <Link href={`/estimate/rates?set=${set.id}`}>edit rates</Link></span>
      </div>

      {r.unpriced > 0 && <div className="msg warn" style={{ margin: ".6rem 0" }}>{r.unpriced} material line{r.unpriced > 1 ? "s have" : " has"} no unit price yet, so {r.unpriced > 1 ? "they count" : "it counts"} as {sym}0. Enter prices in the bill of materials and click Save prices.</div>}

      <div className="tbl-wrap"><table className="tbl compact cost-tbl">
        <thead><tr><th>#</th><th>Item</th><th className="num">Materials</th><th>Labour</th><th className="num">Labour {sym}</th><th className="num">Equipment {sym}</th><th className="num">Direct cost</th><th className="num">Quoted</th></tr></thead>
        <tbody>
          {r.items.map((it) => {
            const cfg = it.cfg;
            return (
              <tr key={it.id}>
                <td className="c-no">{it.no}</td>
                <td className="c-item"><strong>{it.label}</strong>{it.unpriced > 0 && <span className="fine warn-txt"> · {it.unpriced} unpriced</span>}</td>
                <td className="num" data-l="Materials">{peso(it.materials)}</td>
                <td className="lab-cell" data-l="Labour">
                  <select value={cfg.mode} onChange={(e) => setItem(it.id, { mode: e.target.value as ItemCosting["mode"] })} aria-label={`Labour method for ${it.label}`} title="% of materials, or crew × daily rate × days">
                    <option value="pct">% of mat.</option>
                    <option value="crew">Crew-days</option>
                    <option value="trade" disabled={!it.trade}>Trade crew</option>
                  </select>
                  {cfg.mode === "trade" && it.trade ? (
                    <span className="lab-in lab-trade">
                      {it.trade.qty.toLocaleString("en-US", { maximumFractionDigits: 2 })} {it.trade.unit} ÷
                      <input inputMode="decimal" value={cfg.out || it.trade.presetOutput} onChange={(e) => setItem(it.id, { out: nf(e.target.value) })} aria-label="Output per crew-day" title={`Output per crew-day (preset ${it.trade.presetOutput}: ${it.trade.basis})`} />
                      {it.trade.unit}/d = <b>{it.trade.days} d</b> × {peso(it.trade.dayCost)}
                      <small>{crewLabel(it.trade.crew, TRADES)} · {it.trade.basis}</small>
                    </span>
                  ) : cfg.mode === "pct" ? (
                    <span className="lab-in"><input inputMode="decimal" value={cfg.pct} onChange={(e) => setItem(it.id, { pct: nf(e.target.value) })} aria-label="Labour percent" /> %</span>
                  ) : (
                    <span className="lab-in">
                      <input inputMode="numeric" value={cfg.crew} onChange={(e) => setItem(it.id, { crew: nf(e.target.value) })} aria-label="Crew size" title="Workers" /> ×
                      {sym}<input inputMode="decimal" value={cfg.rate} onChange={(e) => setItem(it.id, { rate: nf(e.target.value) })} aria-label="Daily rate" title="Average daily rate incl. benefits" className="w-rate" /> ×
                      <input inputMode="decimal" value={cfg.days} onChange={(e) => setItem(it.id, { days: nf(e.target.value) })} aria-label="Days" title="Days" /> d
                    </span>
                  )}
                </td>
                <td className="num" data-l={`Labour ${sym}`}>{peso(it.labour)}</td>
                <td className="num" data-l={`Equipment ${sym}`}><input className="price eq" inputMode="decimal" value={cfg.equip} onChange={(e) => setItem(it.id, { equip: nf(e.target.value) })} aria-label={`Equipment for ${it.label}`} /></td>
                <td className="num" data-l="Direct cost">{peso(it.direct)}</td>
                <td className="num" data-l="Quoted"><strong>{peso(it.lump)}</strong></td>
              </tr>
            );
          })}
          <tr className="hl cost-tot"><td className="c-no" /><td className="c-item"><strong>Totals</strong></td><td className="num" data-l="Materials">{peso(r.materials)}</td><td className="m-hide" /><td className="num" data-l={`Labour ${sym}`}>{peso(r.labour)}</td><td className="num" data-l={`Equipment ${sym}`}>{peso(r.equip)}</td><td className="num" data-l="Direct cost"><strong>{peso(r.direct)}</strong></td><td className="num" data-l="Quoted"><strong>{peso(r.subtotal)}</strong></td></tr>
        </tbody>
      </table></div>

      <div className="cost-bottom">
        <div className="cost-marks">
          <label className="fld"><span>OCM (overhead, contingencies, misc.)</span><span className="pct-in"><input inputMode="decimal" value={c.ocm} onChange={(e) => setTop("ocm", e.target.value)} /> %</span></label>
          <label className="fld"><span>Profit</span><span className="pct-in"><input inputMode="decimal" value={c.profit} onChange={(e) => setTop("profit", e.target.value)} /> %</span></label>
          <label className="fld"><span>{set.vat ? "VAT (0 if not VAT-registered)" : `VAT: none (${set.name} rate set)`}</span><span className="pct-in"><input inputMode="decimal" value={set.vat ? c.vat : 0} disabled={!set.vat} onChange={(e) => setTop("vat", e.target.value)} /> %</span></label>
          <p className="fine" style={{ margin: 0 }}>OCM and profit are on the direct cost; VAT on direct cost + OCM + profit. For government work, use the OCM and profit brackets in the current DPWH order.</p>
        </div>
        <table className="tbl compact cost-sum">
          <tbody>
            <tr><td>Materials</td><td className="num">{peso(r.materials)}</td><td className="num fine">{pct(r.materials)}</td></tr>
            <tr><td>Labour</td><td className="num">{peso(r.labour)}</td><td className="num fine">{pct(r.labour)}</td></tr>
            <tr><td>Equipment</td><td className="num">{peso(r.equip)}</td><td className="num fine">{pct(r.equip)}</td></tr>
            <tr className="hl"><td>Direct cost</td><td className="num">{peso(r.direct)}</td><td /></tr>
            <tr><td>OCM {c.ocm}%</td><td className="num">{peso(r.ocm)}</td><td /></tr>
            <tr><td>Profit {c.profit}%</td><td className="num">{peso(r.profit)}</td><td /></tr>
            <tr className="hl"><td>Contract price before VAT</td><td className="num">{peso(r.subtotal)}</td><td /></tr>
            {set.vat && c.vat > 0 && <tr><td>VAT {c.vat}%</td><td className="num">{peso(r.vat)}</td><td /></tr>}
            <tr className="grand"><td><strong>Total contract price</strong></td><td className="num"><strong>{peso(r.total)}</strong></td><td /></tr>
          </tbody>
        </table>
      </div>

      <div className="cost-save">
        <button type="button" className="btn" style={{ width: "auto" }} disabled={pending || !dirty} onClick={save}>{pending ? "Saving…" : dirty ? "Save costing" : "Saved"}</button>
        {dirty && <span className="fine">Unsaved changes</span>}
        {msg?.error && <span className="msg err">{msg.error}</span>}
        {msg?.ok && <span className="fine ok-txt">Costing saved.</span>}
      </div>
    </section>
  );
}
