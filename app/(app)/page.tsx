import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";

type Spec = { id: number; grp: string; parent_id: number | null; name: string; slug: string; sort: number };

const GROUP_TO_MODULE: Record<string, string> = {
  structural: "practices", construction_mgmt: "practices", education: "education",
};

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: entries }, { data: specs }, { data: release }] = await Promise.all([
    supabase.from("entries").select("module"),
    supabase.from("specializations").select("*").order("sort"),
    supabase.from("releases").select("version,batch_name,released_at")
      .order("released_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
  ]);

  const counts: Record<string, number> = {};
  (entries ?? []).forEach((e) => { counts[e.module] = (counts[e.module] ?? 0) + 1; });
  const all = (specs ?? []) as Spec[];
  const parents = all.filter((s) => !s.parent_id);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="sub">
        Civil Engineering practices library
        {release && <> · current release <strong>{release.version}</strong> ({release.batch_name})</>}
      </p>

      <div className="grid">
        {MODULES.map((m) => (
          <Link key={m.slug} href={`/${m.slug}`} className="tile">
            <span className="icon">{m.icon}</span>
            <span className="name">{m.name}</span>
            <span className="blurb">{m.blurb}</span>
            <span className="meta">
              <span>{counts[m.kind] ?? 0} entries</span>
              <span>first batch {m.batch}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="section">
        <h2>Specializations</h2>
        <div className="panel">
          {parents.map((p) => (
            <div className="spec-group" key={p.id}>
              <h3>{p.name}</h3>
              <div className="chips">
                {all.filter((c) => c.parent_id === p.id).map((c) => (
                  <Link key={c.id} className="chip" href={`/${GROUP_TO_MODULE[c.grp]}?spec=${c.slug}`}>{c.name}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
