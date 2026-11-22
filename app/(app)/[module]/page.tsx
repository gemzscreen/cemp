import Link from "next/link";
import TopicNav from "@/components/TopicNav";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/auth";
import { moduleBySlug } from "@/lib/modules";
import { categoryOf, groupByCategory } from "@/lib/taxonomy";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const m = moduleBySlug((await params).module);
  return { title: m?.name ?? "Not found" };
}

type Row = { slug: string; title: string; summary: string | null; status: string; category: string | null; spec: string | null; tags: string[] };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function ModulePage({ params, searchParams }: {
  params: Promise<{ module: string }>; searchParams: Promise<{ cat?: string; q?: string; archived?: string; deleted?: string }>;
}) {
  const { module } = await params;
  const sp = await searchParams;
  const m = moduleBySlug(module);
  if (!m) notFound();
  const { supabase, role } = await getMe();
  const showArchived = sp.archived === "1" && role === "admin";

  let q = supabase.from("entries")
    .select("slug,title,summary,status,category, specializations(slug), entry_tags(tags(slug))")
    .eq("module", m.kind).order("title");
  q = showArchived ? q.eq("status", "deprecated") : q.neq("status", "deprecated");
  const { data, error } = await q;
  const rows: Row[] = (data ?? []).map((e: any) => ({
    slug: e.slug, title: e.title, summary: e.summary, status: e.status, category: e.category,
    spec: (one(e.specializations) as any)?.slug ?? null, tags: (e.entry_tags ?? []).map((t: any) => (one(t.tags) as any)?.slug).filter(Boolean),
  }));
  const cat = (r: Row) => categoryOf(r);
  const needle = (sp.q ?? "").trim().toLowerCase();
  const filtered = rows.filter((r) => (!sp.cat || cat(r) === sp.cat || cat(r).startsWith(`${sp.cat}-`))
    && (!needle || r.title.toLowerCase().includes(needle) || (r.summary ?? "").toLowerCase().includes(needle)));
  const tree = groupByCategory(rows, cat);
  const groups = groupByCategory(filtered, cat);
  const href = (c?: string) => `/${m.slug}${c ? `?cat=${c}` : ""}`;

  return (
    <div className="lib">
      <TopicNav label="Browse topics">
        <Link href={href()} className={`lib-all ${!sp.cat ? "on" : ""}`}>All {m.name.toLowerCase()} <span>{rows.length}</span></Link>
        {tree.map((g) => (
          <div key={g.cat.slug} className="lib-group">
            <Link href={href(g.cat.slug)} className={`lib-parent ${sp.cat === g.cat.slug ? "on" : ""}`}>
              <span className="ico">{g.cat.icon}</span>{g.no}. {g.cat.name} <span>{g.leaves.reduce((s, l) => s + l.items.length, 0)}</span>
            </Link>
            {g.leaves.map((l) => (
              <Link key={l.leaf.slug} href={href(l.leaf.slug)} className={`lib-leaf ${sp.cat === l.leaf.slug ? "on" : ""}`}>
                {l.no} {l.leaf.name} <span>{l.items.length}</span>
              </Link>
            ))}
          </div>
        ))}
        {role === "admin" && <Link href={showArchived ? `/${m.slug}` : `/${m.slug}?archived=1`} className="lib-leaf archived">{showArchived ? "← Back to active" : "Archived entries"}</Link>}
      </TopicNav>

      <section className="lib-main">
        <div className="lib-head">
          <div>
            <h1>{m.name}{showArchived ? " (archived)" : ""}</h1>
            <p className="sub" style={{ margin: 0 }}>{m.blurb}</p>
          </div>
          <form className="lib-filter">
            {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}
            <input name="q" defaultValue={sp.q ?? ""} placeholder={`Filter ${m.name.toLowerCase()}…`} />
          </form>
        </div>
        {sp.deleted && <div className="msg ok" style={{ marginBottom: "1rem" }}>Deleted “{sp.deleted}”.</div>}
        {error && <div className="msg err">{error.message}</div>}
        {groups.length === 0 && <div className="empty"><strong>Nothing here{needle ? ` for “${sp.q}”` : ""}.</strong> {rows.length ? <Link href={href()}>Show all</Link> : `The first ${m.name} batch is planned for ${m.batch}.`}</div>}
        {groups.map((g) => (
          <div key={g.cat.slug} className="lib-section">
            <h2 className="lib-h2"><span className="ico">{g.cat.icon}</span> {g.no}. {g.cat.name}</h2>
            {g.leaves.map((l) => (
              <div key={l.leaf.slug}>
                <h3 className="lib-h3">{l.no} {l.leaf.name}</h3>
                <div className="cardgrid">
                  {l.items.map((e) => (
                    <Link key={e.slug} href={`/entry/${e.slug}`} className="ecard">
                      <span className="t">{e.title}</span>
                      {e.summary && <span className="s">{e.summary}</span>}
                      {e.status !== "published" && <span className={`badge b-${e.status}`}>{e.status === "deprecated" ? "archived" : e.status}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
