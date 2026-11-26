import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/auth";
import { CALCS } from "@/lib/calc";
import { aggregate, groupByItem, showQty } from "@/lib/bom";
import BomTable from "@/components/BomTable";
import CostingPanel from "@/components/CostingPanel";
import { normalizeCosting } from "@/lib/costing";
import SubmitButton from "@/components/SubmitButton";
import PrintButton from "@/components/PrintButton";
import { updateProject, removeItem, deleteProject, type EstItem } from "../../actions";

export const metadata = { title: "Estimate BOM" };

export default async function ProjectBom({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await getMe();
  const { data: p } = await supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const items = (p.items ?? []) as EstItem[];
  const prices = (p.prices ?? {}) as Record<string, number>;
  const bom = aggregate(items);
  const revise = (it: EstItem) => `/estimate/${it.calcKey.replace(/^est-/, "")}?p=${id}&i=${it.id}`;
  const groups = groupByItem(items);
  const calcTitles = Object.fromEntries(items.map((it) => [it.calcKey, CALCS[it.calcKey]?.title ?? it.calcKey]));

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
          <Link className="btn" href={`/estimate/projects/${id}/quote`} style={{ width: "auto", margin: 0 }}>Quotation</Link>
          <a className="btn ghost" href={`/estimate/projects/${id}/xlsx`}>Excel (.xlsx)</a>
          <a className="btn ghost" href={`/estimate/projects/${id}/csv`}>CSV</a>
          <PrintButton />
        </div>
      </div>
      {sp.ok && <div className="msg ok no-print" style={{ marginBottom: "1rem" }}>{sp.ok === "updated" ? "Item updated: quantities recomputed." : "Saved."}</div>}
      {sp.err && <div className="msg err" style={{ marginBottom: "1rem" }}>{sp.err}</div>}

      <form action={updateProject} className="print-keep">
        <input type="hidden" name="id" value={id} />
        <section className="panel" style={{ marginBottom: "1rem" }}>
          <h2>Bill of materials <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>by item</span></h2>
          <BomTable groups={groups} combined={bom} prices={prices} projectId={id} calcTitles={calcTitles} />
          <p className="fine">Countable items are rounded up. Materials only: labour, equipment, OCM, profit and VAT are added in Costing below.</p>
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

      <CostingPanel projectId={id} items={items} prices={prices} initial={normalizeCosting(p.costing)} />

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Items ({items.length}) <span className="muted no-print" style={{ fontWeight: 400, fontSize: ".8rem" }}>click an item to revise it</span></h2>
        {items.map((it, k) => {
          const c = CALCS[it.calcKey];
          const dims = c?.fields.filter((f) => f.group === "Dimensions" || f.group?.startsWith("Tank size") || f.group === "Stand").map((f) => `${f.label.replace(/\s*\(.*\)/, "")}: ${it.inputs[f.key]}${f.unit ? ` ${f.unit}` : ""}`).slice(0, 5).join(" · ");
          return (
            <div key={it.id} id={`item-${it.id}`} className="bom-item">
              <div>
                <Link className="item-link" href={revise(it)} title="Open in the calculator to revise"><strong>{k + 1}. {it.label}</strong></Link> <span className="muted">({c?.title ?? it.calcKey})</span>
                {it.updatedAt && <span className="fine"> · revised {new Date(it.updatedAt).toLocaleDateString()}</span>}
                <div className="fine">{dims}</div>
                <div className="fine">{it.materials.map((m) => `${m.name}: ${showQty(m.unit, m.qty)} ${m.unit}`).join(" · ")}</div>
              </div>
              <div className="item-acts no-print">
              <Link className="linkbtn rv" href={revise(it)}>revise</Link>
              <form action={removeItem}><input type="hidden" name="id" value={id} /><input type="hidden" name="item" value={it.id} />
                <SubmitButton className="linkbtn" pending="…">remove</SubmitButton></form>
              </div>
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
