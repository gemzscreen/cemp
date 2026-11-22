import Link from "next/link";
import { getMe } from "@/lib/auth";
import { CALCS } from "@/lib/calc";
import { ESTIMATOR_META } from "@/lib/calc/estimate";
import EstimateIcon from "@/components/EstimateIcon";

export const metadata = { title: "Estimate" };

export default async function EstimateHome() {
  const { supabase } = await getMe();
  const { data: projects } = await supabase.from("estimate_projects").select("id,name,client,items,updated_at").order("updated_at", { ascending: false }).limit(6);
  const groups = [...new Set(ESTIMATOR_META.map((m) => m.group))];
  return (
    <div className="est-home">
      <div className="lib-head">
        <div>
          <h1>Estimate</h1>
          <p className="sub" style={{ margin: 0 }}>{ESTIMATOR_META.length} quantity calculators with dimensioned sketches, Fajardo factors (editable) and bar-by-bar rebar cutting. Add each result to a project to build its bill of materials.</p>
        </div>
        <Link href="/estimate/projects" className="btn" style={{ width: "auto", marginTop: 0 }}>∑ My estimates ({projects?.length ?? 0}{(projects?.length ?? 0) >= 6 ? "+" : ""})</Link>
      </div>

      <div className="est-home-grid">
        <div>
          {groups.map((g, gi) => (
            <section key={g} className="lib-section">
              <h2 className="lib-h2">{gi + 1}. {g}</h2>
              <div className="calc-grid">
                {ESTIMATOR_META.filter((m) => m.group === g).map((m) => (
                  <Link key={m.key} href={`/estimate/${m.key.replace(/^est-/, "")}`} className="calc-card">
                    <span className="calc-ico"><EstimateIcon kind={m.icon} /></span>
                    <span><strong>{CALCS[m.key].title}</strong><small>{m.blurb}</small></span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="panel est-recent">
          <h3>Recent estimates</h3>
          {projects?.length ? (
            <ul>{projects.map((p) => (
              <li key={p.id}><Link href={`/estimate/projects/${p.id}`}><strong>{p.name}</strong></Link>
                <small>{[p.client, `${(p.items as unknown[]).length} item(s)`, new Date(p.updated_at).toLocaleDateString()].filter(Boolean).join(" · ")}</small></li>
            ))}</ul>
          ) : <p className="fine">No estimates yet. Open a calculator and use “Add to BOM”, or create a project first.</p>}
          <Link href="/estimate/projects" className="fine">All estimates & new project →</Link>
          <hr />
          <p className="fine"><strong>Factors:</strong> concrete per m³ and mortar per m² follow Fajardo, <em>Simplified Construction Estimate</em> (40 kg bags). Change them per job if your mix design, supplier or Brunei 50 kg bags differ.</p>
        </aside>
      </div>
    </div>
  );
}
