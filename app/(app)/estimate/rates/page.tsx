// v2.5.0: My rates: labour trade rates and the materials price list reused across projects.
import Link from "next/link";
import { getMe } from "@/lib/auth";
import { normalizeRates, TRADES, WAGE_NOTE, type Trade } from "@/lib/rates";
import SubmitButton from "@/components/SubmitButton";
import { saveLabour, saveMaterialRates } from "./actions";

export const metadata = { title: "My rates" };
const peso = (x: number) => `₱${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function RatesPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getMe();
  const { data } = user ? await supabase.from("user_rates").select("materials,labour,updated_at").eq("user_id", user.id).maybeSingle() : { data: null };
  const r = normalizeRates(data);
  const mats = Object.entries(r.materials).sort((a, b) => a[1].name.localeCompare(b[1].name));
  return (
    <>
      <p className="sub no-print" style={{ marginBottom: ".5rem" }}><Link href="/estimate/projects">← My projects</Link> · <Link href="/estimate">Calculators</Link></p>
      <div className="lib-head"><div>
        <h1>My rates</h1>
        <p className="sub" style={{ margin: 0 }}>Your labour rates and material prices, reused in every project. {data?.updated_at ? `Updated ${new Date(data.updated_at).toLocaleDateString("en-PH")}.` : "Not saved yet: defaults shown."}</p>
      </div></div>
      {sp.ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>{sp.ok === "labour" ? "Labour rates saved." : "Price list saved."}</div>}

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Labour rates <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>₱ per day, including benefits</span></h2>
        <form action={saveLabour}>
          <div className="rate-grid">
            {(Object.keys(TRADES) as Trade[]).map((t) => (
              <label key={t} className="fld"><span>{TRADES[t].name}</span>
                <span className="pct-in">₱ <input name={`rate:${t}`} inputMode="decimal" defaultValue={r.labour[t]} /></span>
                {r.labour[t] !== TRADES[t].rate && <small className="fine">default {peso(TRADES[t].rate)}</small>}</label>
            ))}
          </div>
          <p className="fine"><span className="badge b-review">verify</span> {WAGE_NOTE} Trade-crew labour in Costing uses these rates.</p>
          <SubmitButton style={{ width: "auto" }} pending="Saving…">Save labour rates</SubmitButton>
        </form>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Material price list <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>{mats.length} item(s)</span></h2>
        <p className="fine" style={{ marginTop: 0 }}>Add prices from a project with <b>⇡ Save prices to my list</b>, and fill a new project's blanks with <b>⇣ Fill blanks from my price list</b> (both above the bill of materials).</p>
        {mats.length ? (
          <form action={saveMaterialRates}>
            <div className="tbl-wrap"><table className="tbl compact">
              <thead><tr><th>Material</th><th>Unit</th><th className="num">Unit price (₱)</th><th>Note / supplier</th><th>Updated</th><th>Remove</th></tr></thead>
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
        ) : <p className="fine">No prices yet. Open a project, enter unit prices and click ⇡ Save prices to my list.</p>}
      </section>
    </>
  );
}
