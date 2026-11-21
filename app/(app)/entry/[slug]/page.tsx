import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moduleByKind } from "@/lib/modules";
import Diagram from "@/components/Diagram";
import { reviewAndPublish, sendBackToDraft } from "./actions";

type Section = { heading?: string; kind?: "safe" | "avoid" | "text" | "list"; text?: string; items?: string[] };

export default async function EntryPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { slug } = await params;
  const { ok, err } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const isAdmin = me?.role === "admin";

  const { data: entry } = await supabase
    .from("entries")
    .select(`id,module,title,slug,summary,status,published_at,updated_at,
      specializations(name),
      current:entry_revisions!entries_current_revision_fk(rev_no,body,diagram,code_edition,reviewed_at,change_note,created_at),
      entry_clause_refs(note, code_clauses(section_no,title,code_documents(short_name,edition))),
      entry_tags(tags(name,kind))`)
    .eq("slug", slug)
    .maybeSingle();
  if (!entry) notFound();

  // Supabase returns to-one joins as objects; normalise defensively.
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const rev = one(entry.current as any) as any;
  const spec = one(entry.specializations as any) as any;
  const mod = moduleByKind(entry.module);
  const sections: Section[] = rev?.body?.sections ?? [];

  return (
    <article>
      <p className="sub" style={{ marginBottom: ".5rem" }}>
        <Link href={`/${mod?.slug}`}>{mod?.name}</Link>{spec?.name ? ` · ${spec.name}` : ""}
      </p>
      <h1>{entry.title} <span className={`badge b-${entry.status}`}>{entry.status}</span></h1>
      {entry.summary && <p className="sub">{entry.summary}</p>}

      {(entry.entry_tags as any[])?.length > 0 && (
        <div className="chips" style={{ marginBottom: "1rem" }}>
          {(entry.entry_tags as any[]).map((t, i) => { const tag = one(t.tags) as any; return <span key={i} className="chip">{tag?.name}</span>; })}
        </div>
      )}

      {ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>{ok === "published" ? "Reviewed and published." : "Moved back to draft."}</div>}
      {err && <div className="msg err" style={{ marginBottom: "1rem" }}>{err}</div>}

      {rev?.diagram && (
        <div className="panel diagram" style={{ marginBottom: "1rem" }}>
          <Diagram spec={rev.diagram} />
        </div>
      )}

      {sections.length > 0 ? sections.map((s, i) => (
        <div key={i} className="panel" style={{
          marginBottom: ".8rem",
          borderColor: s.kind === "safe" ? "var(--safe)" : s.kind === "avoid" ? "var(--avoid)" : undefined,
          background: s.kind === "safe" ? "#f3f8fd" : s.kind === "avoid" ? "#fff7ef" : undefined,
        }}>
          {s.heading && <h2>{s.kind === "safe" ? "✓ " : s.kind === "avoid" ? "✕ " : ""}{s.heading}</h2>}
          {s.text && <p style={{ margin: 0 }}>{s.text}</p>}
          {s.items && <ul style={{ margin: ".3rem 0 0" }}>{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul>}
        </div>
      )) : <div className="empty"><strong>No content in this revision yet.</strong></div>}

      {(entry.entry_clause_refs as any[])?.length > 0 && (
        <div className="panel">
          <h2>Code references</h2>
          <ul className="refs">
            {(entry.entry_clause_refs as any[]).map((r, i) => {
              const c = one(r.code_clauses) as any; const d = one(c?.code_documents) as any;
              return <li key={i}><code>{d?.short_name} {d?.edition ? `(${d.edition}) ` : ""}§{c?.section_no}</code> {c?.title}{r.note ? ` · ${r.note}` : ""}</li>;
            })}
          </ul>
        </div>
      )}

      {isAdmin && (
        <div className="panel admin-bar">
          <strong>Admin</strong>
          {entry.status !== "published" ? (
            <form action={reviewAndPublish}>
              <input type="hidden" name="slug" value={entry.slug} />
              <button className="btn" style={{ width: "auto", marginTop: 0 }}>✓ Mark reviewed &amp; publish</button>
            </form>
          ) : (
            <form action={sendBackToDraft}>
              <input type="hidden" name="slug" value={entry.slug} />
              <button className="btn ghost" style={{ width: "auto", marginTop: 0 }}>Unpublish (back to draft)</button>
            </form>
          )}
          <span className="fine" style={{ margin: 0 }}>Publishing stamps this revision as reviewed by you. Check the values against your NSCP copy first.</span>
        </div>
      )}

      <div className="stamp">
        <span>rev {rev?.rev_no ?? "–"}</span>
        <span>code edition: {rev?.code_edition ?? "–"}</span>
        <span>{rev?.reviewed_at ? `reviewed ${new Date(rev.reviewed_at).toLocaleDateString()}` : "not yet reviewed"}</span>
        <span>updated {new Date(entry.updated_at).toLocaleDateString()}</span>
      </div>
    </article>
  );
}
