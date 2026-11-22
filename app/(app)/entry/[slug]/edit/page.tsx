import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EntryEditor from "@/components/EntryEditor";

export const metadata = { title: "Edit entry" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  if (me?.role !== "admin" && me?.role !== "editor") redirect(`/entry/${slug}`);

  const { data: e } = await supabase.from("entries")
    .select(`slug,title,summary,status,module,
      current:entry_revisions!entries_current_revision_fk(rev_no,body,diagram,code_edition,source),
      entry_clause_refs(note, code_clauses(section_no, code_documents(short_name))),
      entry_tags(tags(slug))`)
    .eq("slug", slug).maybeSingle();
  if (!e) notFound();
  const rev = one(e.current as any) as any;
  const refs = ((e.entry_clause_refs as any[]) ?? []).map((r) => {
    const c = one(r.code_clauses) as any; const d = one(c?.code_documents) as any;
    return [d?.short_name ?? "NSCP", c?.section_no, r.note].filter(Boolean).join(" | ");
  }).join("\n");
  const tags = ((e.entry_tags as any[]) ?? []).map((t) => (one(t.tags) as any)?.slug).filter(Boolean).join(", ");

  return (
    <>
      <h1>Edit: {e.title}</h1>
      <p className="sub">
        Editing rev {rev?.rev_no ?? "–"} ({rev?.source === "app" ? "edited in app" : "from content batch"}). Saving creates a new revision; nothing is overwritten.
        {e.module === "tool" && " Tool calculations live in the calc library: here you edit only the text around the calculator."}
        {rev?.source !== "app" && " After an in-app save, content sync keeps your version (copy the change into the batch file to make it permanent in the repo)."}
      </p>
      <EntryEditor init={{
        slug: e.slug, title: e.title, summary: e.summary ?? "", code_edition: rev?.code_edition ?? "", status: e.status, module: e.module,
        sections: rev?.body?.sections ?? [], diagram: rev?.diagram ? JSON.stringify(rev.diagram, null, 2) : "", refs, tags,
      }} />
    </>
  );
}
