import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CALCS } from "@/lib/calc";
import { moduleByKind } from "@/lib/modules";

export const metadata = { title: "Search" };

type Hit = { slug: string; title: string; summary: string | null; module: string; status: string; in_body: boolean };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  let hits: Hit[] = [], clauses: any[] = [], err: string | null = null;
  if (q.length >= 2) {
    const safe = q.replace(/[%_,()]/g, " ");
    const [e, c] = await Promise.all([
      supabase.rpc("search_entries", { q, max_rows: 60 }),
      supabase.from("code_clauses").select("section_no,title,summary,code_documents(short_name,edition)")
        .or(`section_no.ilike.%${safe}%,title.ilike.%${safe}%,summary.ilike.%${safe}%`).limit(30),
    ]);
    hits = (e.data ?? []) as Hit[]; clauses = c.data ?? [];
    err = e.error?.message ?? c.error?.message ?? null;
  }
  const lq = q.toLowerCase();
  const calcs = q.length >= 2 ? Object.values(CALCS).filter((c) => c.title.toLowerCase().includes(lq) || c.clauses.some((x) => x.toLowerCase().includes(lq))) : [];

  return (
    <>
      <h1>Search</h1>
      <form action="/search" className="search-big">
        <input name="q" defaultValue={q} placeholder="e.g. lap splice, 425.4, PERT, scaffold, Item 405" autoFocus />
        <button className="btn" style={{ width: "auto", marginTop: 0 }}>Search</button>
      </form>
      {q.length > 0 && q.length < 2 && <p className="fine">Type at least 2 characters.</p>}
      {err && <div className="msg err">{err}</div>}

      {q.length >= 2 && (
        <>
          <section className="panel" style={{ marginBottom: "1rem" }}>
            <h2>Entries ({hits.length})</h2>
            {hits.length ? (
              <div className="list">
                {hits.map((h) => (
                  <Link key={h.slug} href={`/entry/${h.slug}`} className="row">
                    <div>
                      <div className="t">{h.title}</div>
                      <div className="s">{[moduleByKind(h.module)?.name, h.in_body ? "match in content" : null, h.summary].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span className={`badge b-${h.status}`}>{h.status}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="fine">No entries match.</p>}
          </section>

          <section className="panel" style={{ marginBottom: "1rem" }}>
            <h2>Code clauses ({clauses.length})</h2>
            {clauses.length ? (
              <ul className="refs">
                {clauses.map((c, i) => {
                  const d = Array.isArray(c.code_documents) ? c.code_documents[0] : c.code_documents;
                  return <li key={i}><Link href="/codes"><code>{d?.short_name} §{c.section_no}</code></Link> {c.title}</li>;
                })}
              </ul>
            ) : <p className="fine">No clauses match.</p>}
          </section>

          {calcs.length > 0 && (
            <section className="panel">
              <h2>Calculators &amp; checklists in the library ({calcs.length})</h2>
              <p className="fine" style={{ marginTop: 0 }}>Open the matching tool entry above to run them.</p>
              <ul>{calcs.map((c) => <li key={c.key}>{c.title} <span className="muted">({c.key})</span></li>)}</ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
