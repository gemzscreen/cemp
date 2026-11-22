import Link from "next/link";
import { getDb } from "@/lib/auth";
import { MODULES } from "@/lib/modules";

type Spec = { id: number; grp: string; parent_id: number | null; name: string; slug: string; sort: number };

const GROUP_TO_MODULE: Record<string, string> = {
  structural: "practices", construction_mgmt: "practices", education: "education",
};

export default async function Dashboard() {
  const supabase = await getDb();
  const [{ data: entries }, { data: specs }, { data: release }, { count: unitCount }, { count: tableCount }] = await Promise.all([
    supabase.from("entries").select("module"),
    supabase.from("specializations").select("*").order("sort"),
    supabase.from("releases").select("version,batch_name,notes_md,released_at")
      .not("released_at", "is", null).order("id", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("ref_tables").select("id", { count: "exact", head: true }),
  ]);
  const { count: clauseCount } = await supabase.from("code_clauses").select("id", { count: "exact", head: true });

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

      {release?.notes_md && (
        <div className="whatsnew">
          <span className="tag">What&apos;s new · {release.version}</span>
          <div>
            <strong>{release.batch_name}</strong>
            <pre>{release.notes_md.replace(/\\n/g, "\n")}</pre>
            <Link href="/releases" className="fine">All releases →</Link>
          </div>
        </div>
      )}

      <div className="grid">
        {MODULES.map((m) => (
          <Link key={m.slug} href={`/${m.slug}`} className="tile">
            <span className="icon">{m.icon}</span>
            <span className="name">{m.name}</span>
            <span className="blurb">{m.blurb}</span>
            <span className="meta">
              <span>{m.kind === "conversion"
                ? `${unitCount ?? 0} units · ${tableCount ?? 0} tables`
                : m.kind === "code" ? `${clauseCount ?? 0} clauses indexed`
                : `${counts[m.kind] ?? 0} entries`}</span>
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
