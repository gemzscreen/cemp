import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Codes" };

type Ref = { note: string | null; entries: { title: string; slug: string; status: string } | { title: string; slug: string; status: string }[] | null };
type Clause = { id: string; section_no: string; title: string; summary: string | null; formula_latex: string | null; limits: { aci_equivalent?: string } | null; entry_clause_refs: Ref[] };
type Doc = { id: number; short_name: string; title: string; edition: string | null; publisher: string | null; jurisdiction: string; status: string; notes: string | null; code_clauses: Clause[] };

const secKey = (s: string) => s.split(".").map((p) => p.padStart(4, "0")).join(".");

export default async function CodesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("code_documents")
    .select("id,short_name,title,edition,publisher,jurisdiction,status,notes,code_clauses(id,section_no,title,summary,formula_latex,limits,entry_clause_refs(note,entries(title,slug,status)))")
    .order("id");
  const docs = (data ?? []) as unknown as Doc[];
  const withClauses = docs.filter((d) => d.code_clauses?.length);
  const others = docs.filter((d) => !d.code_clauses?.length);
  const total = withClauses.reduce((n, d) => n + d.code_clauses.length, 0);

  return (
    <>
      <h1>Codes</h1>
      <p className="sub">
        A clause <strong>index</strong>, not a copy: section numbers, titles and summaries in our own words, linked to the cards and tools that use them.
        Open your own copy of the code for the full text. {total} clauses indexed.
      </p>
      {error && <div className="msg err">{error.message}</div>}

      {withClauses.map((d) => (
        <section key={d.id} className="panel doc">
          <h2>{d.short_name} <span className="muted" style={{ fontSize: ".85rem" }}>{d.title}{d.edition ? ` · ${d.edition}` : ""}</span></h2>
          {[...d.code_clauses].sort((a, b) => secKey(a.section_no).localeCompare(secKey(b.section_no))).map((c) => (
            <div key={c.id} className="clause" id={`s-${c.section_no}`}>
              <div><span className="sec">§{c.section_no}</span><strong>{c.title}</strong>
                {c.limits?.aci_equivalent && <span className="muted" style={{ fontSize: ".8rem" }}> · {c.limits.aci_equivalent}</span>}</div>
              {c.summary && <p>{c.summary}</p>}
              {c.formula_latex && <p><code>{c.formula_latex}</code></p>}
              {c.entry_clause_refs?.length > 0 && (
                <div className="chips">
                  {c.entry_clause_refs.map((r, i) => {
                    const e = Array.isArray(r.entries) ? r.entries[0] : r.entries;
                    return e ? <Link key={i} className="chip" href={`/entry/${e.slug}`}>{e.title}{e.status !== "published" ? ` (${e.status})` : ""}</Link> : null;
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}

      <section className="section">
        <h2>Other documents indexed</h2>
        <div className="list">
          {others.map((d) => (
            <div key={d.id} className="row">
              <div>
                <div className="t">{d.short_name} <span className="muted">· {d.title}</span></div>
                <div className="s">{[d.edition, d.publisher, d.jurisdiction, d.notes].filter(Boolean).join(" · ")}</div>
              </div>
              <span className={`badge ${d.status === "superseded" ? "b-deprecated" : d.status === "reference" ? "b-draft" : "b-published"}`}>{d.status}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
