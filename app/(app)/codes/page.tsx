import Link from "next/link";
import TopicNav from "@/components/TopicNav";
import { getDb } from "@/lib/auth";
import { clauseCategory, groupByCategory } from "@/lib/taxonomy";

export const metadata = { title: "Codes" };

type Ref = { note: string | null; entries: { title: string; slug: string; status: string } | { title: string; slug: string; status: string }[] | null };
type Clause = { id: string; section_no: string; title: string; summary: string | null; formula_latex: string | null; limits: { aci_equivalent?: string } | null; entry_clause_refs: Ref[] };
type Doc = { id: number; short_name: string; title: string; edition: string | null; publisher: string | null; jurisdiction: string; status: string; notes: string | null; code_clauses: Clause[] };
type Row = Clause & { doc: Doc };

const secKey = (s: string) => s.replace(/^\D+/, "").split(".").map((p) => p.padStart(4, "0")).join(".");

export default async function CodesPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; std?: string }> }) {
  const sp = await searchParams;
  const supabase = await getDb();
  const { data, error } = await supabase
    .from("code_documents")
    .select("id,short_name,title,edition,publisher,jurisdiction,status,notes,code_clauses(id,section_no,title,summary,formula_latex,limits,entry_clause_refs(note,entries(title,slug,status)))")
    .order("id");
  const docs = (data ?? []) as unknown as Doc[];
  const rows: Row[] = docs.flatMap((d) => (d.code_clauses ?? []).map((c) => ({ ...c, doc: d })))
    .sort((a, b) => a.doc.short_name.localeCompare(b.doc.short_name) || secKey(a.section_no).localeCompare(secKey(b.section_no)));
  const cat = (r: Row) => clauseCategory(r.doc.short_name, r.section_no);
  const needle = (sp.q ?? "").trim().toLowerCase();
  const stdOf = (j: string) => (j === "PH" ? "ph" : j === "BN" ? "bn" : "intl");
  const std = ["ph", "bn", "intl"].includes(sp.std ?? "") ? sp.std : undefined;
  const filtered = rows.filter((r) => (!std || stdOf(r.doc.jurisdiction) === std) && (!sp.cat || cat(r) === sp.cat || cat(r).startsWith(`${sp.cat}-`))
    && (!needle || `${r.doc.short_name} ${r.section_no} ${r.title} ${r.summary ?? ""}`.toLowerCase().includes(needle)));
  const tree = groupByCategory(rows, cat), groups = groupByCategory(filtered, cat);
  const href = (c?: string, s = std) => { const q = new URLSearchParams(); if (c) q.set("cat", c); if (s) q.set("std", s); const t = q.toString(); return `/codes${t ? `?${t}` : ""}`; };

  return (
    <div className="lib">
      <TopicNav label="Browse code topics">
        <Link href={href()} className={`lib-all ${!sp.cat ? "on" : ""}`}>All clauses <span>{rows.length}</span></Link>
        {tree.map((g) => (
          <div key={g.cat.slug} className="lib-group">
            <Link href={href(g.cat.slug)} className={`lib-parent ${sp.cat === g.cat.slug ? "on" : ""}`}><span className="ico">{g.cat.icon}</span>{g.no}. {g.cat.name} <span>{g.leaves.reduce((s, l) => s + l.items.length, 0)}</span></Link>
            {g.leaves.map((l) => <Link key={l.leaf.slug} href={href(l.leaf.slug)} className={`lib-leaf ${sp.cat === l.leaf.slug ? "on" : ""}`}>{l.no} {l.leaf.name} <span>{l.items.length}</span></Link>)}
          </div>
        ))}
        <a href="#documents" className="lib-leaf archived">Documents indexed ({docs.length})</a>
      </TopicNav>

      <section className="lib-main">
        <div className="lib-head">
          <div>
            <h1>Codes</h1>
            <p className="sub" style={{ margin: 0 }}>A clause <strong>index</strong>, not a copy: section numbers, titles and summaries in our own words, linked to the cards and tools that use them. Open your own copy of the code for the full text.</p>
          </div>
          <form className="lib-filter">{sp.cat && <input type="hidden" name="cat" value={sp.cat} />}{std && <input type="hidden" name="std" value={std} />}<input name="q" defaultValue={sp.q ?? ""} placeholder="Filter: 425.4, lap, welding…" /></form>
        </div>
        <div className="std-filter chips">
          {([[undefined, "All standards"], ["ph", "🇵🇭 Philippines"], ["bn", "🇧🇳 Brunei (BS)"], ["intl", "🌐 International"]] as const).map(([k, label]) => (
            <Link key={label} href={href(sp.cat, k)} className={`chip${std === k ? " on" : ""}`}>{label}</Link>
          ))}
        </div>
        {error && <div className="msg err">{error.message}</div>}
        {groups.length === 0 && <div className="empty"><strong>No clauses match.</strong> <Link href={href()}>Show all</Link></div>}
        {groups.map((g) => (
          <div key={g.cat.slug} className="lib-section">
            <h2 className="lib-h2"><span className="ico">{g.cat.icon}</span> {g.no}. {g.cat.name}</h2>
            {g.leaves.map((l) => (
              <div key={l.leaf.slug}>
                <h3 className="lib-h3">{l.no} {l.leaf.name}</h3>
                {l.items.map((c) => (
                  <div key={c.id} className="clause card-clause" id={`s-${c.section_no}`}>
                    <div>
                      <span className={`docpill ${c.doc.status === "superseded" ? "old" : ""}`}>{c.doc.short_name}{c.doc.edition ? ` ${c.doc.edition.replace(/ \(.*\)/, "")}` : ""}</span>
                      <span className="sec">§{c.section_no}</span><strong>{c.title}</strong>
                      {c.limits?.aci_equivalent && <span className="muted" style={{ fontSize: ".8rem" }}> · {c.limits.aci_equivalent}</span>}
                    </div>
                    {c.summary && <p>{c.summary}</p>}
                    {c.formula_latex && <p><code>{c.formula_latex}</code></p>}
                    {c.entry_clause_refs?.length > 0 && (
                      <div className="chips">
                        {c.entry_clause_refs.map((r, i) => {
                          const e = Array.isArray(r.entries) ? r.entries[0] : r.entries;
                          return e && e.status !== "deprecated" ? <Link key={i} className="chip" href={`/entry/${e.slug}`}>{e.title}{e.status !== "published" ? ` (${e.status})` : ""}</Link> : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        <section className="lib-section" id="documents">
          <h2 className="lib-h2">Documents indexed</h2>
          <div className="list">
            {docs.map((d) => (
              <div key={d.id} className="row">
                <div>
                  <div className="t">{d.short_name} <span className="muted">· {d.title}</span></div>
                  <div className="s">{[d.edition, d.publisher, d.jurisdiction, d.notes, d.code_clauses?.length ? `${d.code_clauses.length} clauses` : null].filter(Boolean).join(" · ")}</div>
                </div>
                <span className={`badge ${d.status === "superseded" ? "b-deprecated" : d.status === "reference" ? "b-draft" : "b-published"}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
