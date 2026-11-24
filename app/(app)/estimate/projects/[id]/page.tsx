import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/auth";
import { CALCS } from "@/lib/calc";
import { aggregate, showQty } from "@/lib/bom";
import SubmitButton from "@/components/SubmitButton";
import PrintButton from "@/components/PrintButton";
import { updateProject, removeItem, deleteProject, type EstItem } from "../../actions";

export const metadata = { title: "Estimate BOM" };
const peso = (x: number) => `₱${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ProjectBom({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getMe();
  const { data: p } = await supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const items = (p.items ?? []) as EstItem[];
  const prices = (p.prices ?? {}) as Record<string, number>;
  const bom = aggregate(items);
  const total = bom.reduce((s, b) => s + (prices[b.key] ?? 0) * showQty(b.unit, b.qty), 0);
  const priced = bom.filter((b) => prices[b.key] != null).length;

  return (
    <>
      <p className="sub no-print" style={{ marginBottom: ".5rem" }}><Link href="/estimate/projects">← My estimates</Link> · <Link href="/estimate">Calculators</Link></p>
      <p className="print-only fine" style={{ margin: "0 0 .3rem" }}>CEMP · Construction Estimating and Management Platform · printed {new Date().toLocaleDateString("en-PH")}</p>
      <div className="lib-head">
        <div>
          <h1>{p.name}</h1>
          <p className="sub" style={{ margin: 0 }}>{[p.client && `Client: ${p.client}`, p.location && `Location: ${p.location}`, `${items.length} item(s)`, `updated ${new Date(p.updated_at).toLocaleString()}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="est-actions no-print">
          <a className="btn ghost" href={`/estimate/projects/${id}/csv`}>CSV (Excel)</a>
          <PrintButton />
        </div>
      </div>
      {sp.ok && <div className="msg ok no-print" style={{ marginBottom: "1rem" }}>Saved.</div>}
      {sp.err && <div className="msg err" style={{ marginBottom: "1rem" }}>{sp.err}</div>}

      <form action={updateProject} className="print-keep">
        <input type="hidden" name="id" value={id} />
        <section className="panel" style={{ marginBottom: "1rem" }}>
          <h2>Bill of materials</h2>
          {bom.length ? (
            <div className="tbl-wrap"><table className="tbl compact bom">
              <thead><tr><th>#</th><th>Material</th><th className="num">Qty</th><th>Unit</th><th className="num">Unit price (₱)</th><th className="num">Amount</th><th className="no-print">From</th></tr></thead>
              <tbody>
                {bom.map((b, k) => {
                  const q = showQty(b.unit, b.qty), pr = prices[b.key];
                  return (
                    <tr key={b.key}>
                      <td>{k + 1}</td><td>{b.name}</td><td className="num">{q.toLocaleString("en-US")}</td><td>{b.unit}</td>
                      <td className="num"><input className="price" name={`price:${b.key}`} defaultValue={pr ?? ""} inputMode="decimal" placeholder="0.00" aria-label={`Unit price of ${b.name}`} /></td>
                      <td className="num">{pr != null ? peso(pr * q) : "–"}</td>
                      <td className="fine no-print">{b.from.join(", ")}</td>
                    </tr>
                  );
                })}
                <tr className="hl"><td /><td><strong>Total materials</strong></td><td /><td /><td className="fine">{priced}/{bom.length} priced</td><td className="num"><strong>{peso(total)}</strong></td><td className="no-print" /></tr>
              </tbody>
            </table></div>
          ) : <p className="fine">No items yet. <Link href="/estimate">Open a calculator</Link> and use “Add to BOM”.</p>}
          <p className="fine">Countable items are rounded up. Quantities exclude labor, equipment, OCM, profit and VAT: use the Cost build-up tool for unit prices.</p>
        </section>

        <section className="panel no-print" style={{ marginBottom: "1rem" }}>
          <h2>Project details</h2>
          <div className="tool-grid">
            <label className="fld"><span>Name</span><input name="name" defaultValue={p.name} required /></label>
            <label className="fld"><span>Client</span><input name="client" defaultValue={p.client ?? ""} /></label>
            <label className="fld"><span>Location</span><input name="location" defaultValue={p.location ?? ""} /></label>
          </div>
          <SubmitButton style={{ width: "auto" }} pending="Saving…">Save prices &amp; details</SubmitButton>
        </section>
      </form>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Items ({items.length})</h2>
        {items.map((it, k) => {
          const c = CALCS[it.calcKey];
          const dims = c?.fields.filter((f) => f.group === "Dimensions" || f.group?.startsWith("Tank size") || f.group === "Stand").map((f) => `${f.label.replace(/\s*\(.*\)/, "")}: ${it.inputs[f.key]}${f.unit ? ` ${f.unit}` : ""}`).slice(0, 5).join(" · ");
          return (
            <div key={it.id} className="bom-item">
              <div>
                <strong>{k + 1}. {it.label}</strong> <span className="muted">({c?.title ?? it.calcKey})</span>
                <div className="fine">{dims}</div>
                <div className="fine">{it.materials.map((m) => `${m.name}: ${showQty(m.unit, m.qty)} ${m.unit}`).join(" · ")}</div>
              </div>
              <form action={removeItem} className="no-print"><input type="hidden" name="id" value={id} /><input type="hidden" name="item" value={it.id} />
                <SubmitButton className="linkbtn" pending="…">remove</SubmitButton></form>
            </div>
          );
        })}
      </section>

      <details className="no-print"><summary className="fine">Delete this project…</summary>
        <form action={deleteProject} style={{ marginTop: ".5rem" }}><input type="hidden" name="id" value={id} />
          <SubmitButton className="btn danger" style={{ width: "auto" }} pending="Deleting…">Delete project permanently</SubmitButton></form>
      </details>
    </>
  );
}
