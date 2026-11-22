import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { diffLines, sectionsToLines } from "@/lib/sections";
import { restoreRevision } from "../../editor-actions";

export const metadata = { title: "History" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
type Rev = { id: string; rev_no: number; body: any; diagram: any; change_note: string | null; code_edition: string | null; source: string;
  created_at: string; reviewed_at: string | null; author: any; reviewer: any };

export default async function History({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ a?: string; b?: string; ok?: string; err?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const canEdit = me?.role === "admin" || me?.role === "editor";
  const { data: e } = await supabase.from("entries").select("id,title,current_revision_id").eq("slug", slug).maybeSingle();
  if (!e) notFound();
  const { data } = await supabase.from("entry_revisions")
    .select("id,rev_no,body,diagram,change_note,code_edition,source,created_at,reviewed_at,author:profiles!entry_revisions_author_id_fkey(full_name),reviewer:profiles!entry_revisions_reviewed_by_fkey(full_name)")
    .eq("entry_id", e.id).order("rev_no", { ascending: false });
  const revs = (data ?? []) as Rev[];
  const byNo = (n?: string) => revs.find((r) => String(r.rev_no) === n);
  const B = byNo(sp.b) ?? revs[0];
  const A = byNo(sp.a) ?? revs.find((r) => r.rev_no < (B?.rev_no ?? 0));
  const ops = A && B ? diffLines(
    [`edition: ${A.code_edition ?? "–"}`, ...sectionsToLines(A.body, A.diagram)],
    [`edition: ${B.code_edition ?? "–"}`, ...sectionsToLines(B.body, B.diagram)]) : [];
  const added = ops.filter((o) => o.op === "add").length, removed = ops.filter((o) => o.op === "del").length;

  return (
    <>
      <p className="sub" style={{ marginBottom: ".5rem" }}><Link href={`/entry/${slug}`}>← {e.title}</Link></p>
      <h1>Revision history</h1>
      {sp.ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>Restored as a new revision.</div>}
      {sp.err && <div className="msg err" style={{ marginBottom: "1rem" }}>{sp.err}</div>}
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="tbl-wrap"><table className="tbl compact">
          <thead><tr><th>Rev</th><th>When</th><th>Source</th><th>Author</th><th>Change note</th><th>Reviewed</th><th>Compare</th>{canEdit && <th></th>}</tr></thead>
          <tbody>{revs.map((r) => (
            <tr key={r.id} className={r.id === e.current_revision_id ? "hl" : ""}>
              <td>{r.rev_no}{r.id === e.current_revision_id ? " (current)" : ""}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.source}</td>
              <td>{(one(r.author) as any)?.full_name ?? "–"}</td>
              <td>{r.change_note ?? ""}</td>
              <td>{r.reviewed_at ? `${new Date(r.reviewed_at).toLocaleDateString()} · ${(one(r.reviewer) as any)?.full_name ?? ""}` : "–"}</td>
              <td>
                <Link href={`?a=${r.rev_no}&b=${B?.rev_no ?? r.rev_no}`}>as old</Link>{" · "}
                <Link href={`?a=${A?.rev_no ?? r.rev_no}&b=${r.rev_no}`}>as new</Link>
              </td>
              {canEdit && <td>{r.id !== e.current_revision_id && (
                <form action={restoreRevision}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="rev_id" value={r.id} />
                  <button className="linkbtn plain">restore</button></form>)}</td>}
            </tr>))}
          </tbody>
        </table></div>
      </section>

      {A && B ? (
        <section className="panel">
          <h2>Rev {A.rev_no} → rev {B.rev_no} <span className="fine">(+{added} / −{removed} lines)</span></h2>
          {added + removed === 0 ? <p className="fine">No differences in content.</p> : (
            <pre className="diff">{ops.map((o, i) => <div key={i} className={`d-${o.op}`}>{o.op === "add" ? "+ " : o.op === "del" ? "− " : "  "}{o.text}</div>)}</pre>
          )}
        </section>
      ) : <p className="fine">Only one revision so far: nothing to compare.</p>}
    </>
  );
}
