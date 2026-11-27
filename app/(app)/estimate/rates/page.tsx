// v2.5.0: My rates: labour trade rates and the materials price list reused across projects.
import Link from "next/link";
import { getMe } from "@/lib/auth";
import { normalizeRates, rateSetOf, TRADES, WAGE_NOTE, CURRENCIES, curSym, type Trade } from "@/lib/rates";
import SubmitButton from "@/components/SubmitButton";
import { saveLabour, saveMaterialRates, addRateSet, deleteRateSet } from "./actions";

export const metadata = { title: "My rates" };
const peso = (x: number) => `₱${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function RatesPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; set?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getMe();
  const { data } = user ? await supabase.from("user_rates").select("materials,labour,sets,updated_at").eq("user_id", user.id).maybeSingle() : { data: null };
  const r = normalizeRates(data);
  const set = rateSetOf(r, sp.set), sym = curSym(set.currency);
  const okMsg: Record<string, string> = { labour: `Rate set "${set.name}" saved.`, added: `Rate set "${set.name}" added: copied rates, edit them for this area.`, deleted: "Rate set deleted.", keep: "Keep at least one rate set.", materials: "Price list saved." };
  const mats = Object.entries(set.materials).sort((a, b) => a[1].name.localeCompare(b[1].name));
  return (
    <>
      <p className="sub no-print" style={{ marginBottom: ".5rem" }}><Link href="/estimate/projects">← My projects</Link> · <Link href="/estimate">Calculators</Link></p>
      <div className="lib-head"><div>
        <h1>My rates</h1>
        <p className="sub" style={{ margin: 0 }}>Your labour rates and material prices, reused in every project. {data?.updated_at ? `Updated ${new Date(data.updated_at).toLocaleDateString("en-PH")}.` : "Not saved yet: defaults shown."}</p>
      </div></div>
      {sp.ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>{okMsg[sp.ok] ?? "Saved."}</div>}
      {sp.err && <div className="msg err" style={{ marginBottom: "1rem" }}>{sp.err}</div>}

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Labour rate sets <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>per day, including benefits · each project picks one in Costing</span></h2>
        <div className="rs-tabs" role="tablist">
          {r.sets.map((x, i) => (
            <Link key={x.id} href={`/estimate/rates?set=${x.id}`} role="tab" aria-selected={x.id === set.id} className={`rs-tab ${x.id === set.id ? "on" : ""}`}>
              <b>{x.name}</b><small>{curSym(x.currency)} · {x.vat ? "VAT" : "no VAT"} · {Object.keys(x.materials).length} prices{i === 0 ? " · default" : ""}</small>
            </Link>
          ))}
        </div>
        <form action={saveLabour} key={set.id}>
          <input type="hidden" name="set" value={set.id} />
          <div className="rs-meta">
            <label className="fld"><span>Name</span><input name="name" defaultValue={set.name} maxLength={60} required /></label>
            <label className="fld"><span>Currency</span><select name="currency" defaultValue={set.currency}>{(Object.keys(CURRENCIES) as (keyof typeof CURRENCIES)[]).map((c) => <option key={c} value={c}>{CURRENCIES[c].name}</option>)}</select></label>
            <label className="fld rs-vat"><span>VAT on quotations</span><span><input type="checkbox" name="vat" value="1" defaultChecked={set.vat} /> VAT applies (untick for Brunei: no VAT)</span></label>
          </div>
          <div className="rate-grid">
            {(Object.keys(TRADES) as Trade[]).map((t) => (
              <label key={t} className="fld"><span>{TRADES[t].name}</span>
                <span className="pct-in">{sym} <input name={`rate:${t}`} inputMode="decimal" defaultValue={set.labour[t]} /></span>
                {set.currency === "PHP" && set.labour[t] !== TRADES[t].rate && <small className="fine">default {peso(TRADES[t].rate)}</small>}</label>
            ))}
          </div>
          <label className="fld"><span>Note (source, area, date)</span><input name="note" defaultValue={set.note ?? ""} maxLength={200} placeholder="e.g. Region IX wage order + 20% benefits, Nov 2026" /></label>
          <p className="fine"><span className="badge b-review">verify</span> {set.currency === "PHP" ? WAGE_NOTE : "Brunei rates are yours to enter: check current market day rates and employer contributions (TAP/SCP) for your trades."} Trade-crew labour in Costing uses the set the project picks.</p>
          <div className="est-actions">
            <SubmitButton style={{ width: "auto", marginTop: 0 }} pending="Saving…">Save {set.name}</SubmitButton>
            {r.sets.length > 1 && <button formAction={deleteRateSet} className="btn ghost" style={{ width: "auto" }} title="Projects using this set fall back to the default set">Delete this set</button>}
          </div>
        </form>
        <details className="rs-add">
          <summary>＋ Add a rate set</summary>
          <form action={addRateSet} className="rs-meta">
            <label className="fld"><span>Name</span><input name="name" placeholder="e.g. PH Region IX, Brunei" maxLength={60} required /></label>
            <label className="fld"><span>Currency</span><select name="currency" defaultValue="PHP">{(Object.keys(CURRENCIES) as (keyof typeof CURRENCIES)[]).map((c) => <option key={c} value={c}>{CURRENCIES[c].name}</option>)}</select></label>
            <label className="fld"><span>Start from</span><select name="from" defaultValue={set.id}>{r.sets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label className="fld rs-vat"><span>Material prices</span><span><input type="checkbox" name="prices" value="1" /> copy prices (same currency only)</span></label>
            <SubmitButton style={{ width: "auto", alignSelf: "end", marginTop: 0 }} pending="Adding…">Add set</SubmitButton>
          </form>
          <p className="fine">Brunei dollar sets start with VAT off. Labour rates are copied from the set you start from, so edit every trade afterwards; material prices start empty unless you copy them.</p>
        </details>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Material price list: {set.name} <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>{mats.length} item(s) · prices in {sym} · each rate set has its own list</span></h2>
        <p className="fine" style={{ marginTop: 0 }}>Prices follow the rate set a project uses (Costing → Labour rate set). <b>⇡ Save prices to my list</b> stores them in that project's set, and <b>⇣ Fill blanks from my price list</b> reads from it (both above the bill of materials). Changing a set's currency does not convert its prices.</p>
        {mats.length ? (
          <form action={saveMaterialRates} key={set.id}>
            <input type="hidden" name="set" value={set.id} />
            <div className="tbl-wrap"><table className="tbl compact">
              <thead><tr><th>Material</th><th>Unit</th><th className="num">Unit price ({sym})</th><th>Note / supplier</th><th>Updated</th><th>Remove</th></tr></thead>
              <tbody>
                {mats.map(([k, m]) => (
                  <tr key={k}>
                    <td>{m.name}</td><td>{m.unit}</td>
                    <td className="num"><input className="price" name={`price:${k}`} defaultValue={m.price} inputMode="decimal" aria-label={`Price of ${m.name}`} /></td>
                    <td><input className="rate-note" name={`note:${k}`} defaultValue={m.note ?? ""} maxLength={120} placeholder="e.g. Iligan hardware, Nov 2026" /></td>
                    <td className="fine">{m.at}</td>
                    <td><label className="fine"><input type="checkbox" name={`del:${k}`} value="1" /> remove</label></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <SubmitButton style={{ width: "auto" }} pending="Saving…">Save price list</SubmitButton>
          </form>
        ) : <p className="fine">No prices in "{set.name}" yet. Open a project that uses this rate set, enter unit prices and click ⇡ Save prices to my list.</p>}
      </section>
    </>
  );
}
