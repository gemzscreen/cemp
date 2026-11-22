"use server";
// In-app editing (v0.9.0). Every save is a NEW revision (source = 'app'), never an overwrite.
// Editors and admins can edit; a published entry goes back to "review" until the admin re-publishes.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSections } from "@/lib/sections";
import type { Section } from "@/content/types";

export type SavePayload = {
  slug: string; title: string; summary: string; code_edition: string; change_note: string;
  sections: Section[]; diagram: string; refs: string; tags: string;
};
export type SaveResult = { ok?: boolean; error?: string; warnings?: string[] };

async function editorClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  return { supabase, ok: me?.role === "admin" || me?.role === "editor" };
}

/** "NSCP | 425.5.2 | note" per line (doc optional → NSCP). */
async function resolveRefs(supabase: Awaited<ReturnType<typeof createClient>>, text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { refs: [] as { clause_id: string; note: string | null }[], errors: [] as string[] };
  const { data: clauses } = await supabase.from("code_clauses").select("id,section_no,code_documents(short_name)");
  const refs: { clause_id: string; note: string | null }[] = [], errors: string[] = [];
  for (const l of lines) {
    const p = l.split("|").map((x) => x.trim());
    const [doc, sec, note] = p.length === 1 ? ["NSCP", p[0], ""] : p;
    const hit = clauses?.find((c: any) => c.section_no === sec && (Array.isArray(c.code_documents) ? c.code_documents[0] : c.code_documents)?.short_name === doc);
    if (hit) refs.push({ clause_id: hit.id, note: note || null }); else errors.push(`Clause not in the Codes index: ${doc} ${sec}`);
  }
  return { refs, errors };
}

export async function saveRevision(p: SavePayload): Promise<SaveResult> {
  const { supabase, ok } = await editorClient();
  if (!ok) return { error: "Editors and admins only" };
  if (!p.title.trim()) return { error: "Title is required" };
  if (!p.change_note.trim()) return { error: "Describe the change (change note) so the reviewer knows what to check" };
  const sErr = validateSections(p.sections);
  if (sErr.length) return { error: sErr.join(" · ") };
  let diagram: unknown = null;
  if (p.diagram.trim()) { try { diagram = JSON.parse(p.diagram); } catch { return { error: "Diagram JSON is not valid JSON" }; } }

  const { data: entry } = await supabase.from("entries").select("id,status,module").eq("slug", p.slug).maybeSingle();
  if (!entry) return { error: "Entry not found" };
  const { refs, errors: refErr } = await resolveRefs(supabase, p.refs);
  if (refErr.length) return { error: refErr.join(" · ") };
  const tagSlugs = p.tags.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  const { data: tagRows } = tagSlugs.length ? await supabase.from("tags").select("id,slug").in("slug", tagSlugs) : { data: [] as { id: number; slug: string }[] };
  const unknownTags = tagSlugs.filter((t) => !tagRows?.some((x) => x.slug === t));
  if (unknownTags.length) return { error: `Unknown tag(s): ${unknownTags.join(", ")}` };

  const { data: rev, error: re } = await supabase.from("entry_revisions").insert({
    entry_id: entry.id, body: { sections: p.sections }, diagram, code_edition: p.code_edition.trim() || null,
    change_note: p.change_note.trim().slice(0, 500), source: "app",
  }).select("id").single();
  if (re) return { error: re.message };
  const { error: ue } = await supabase.from("entries").update({
    title: p.title.trim(), summary: p.summary.trim() || null, current_revision_id: rev.id,
    status: entry.status === "published" ? "review" : entry.status,
  }).eq("id", entry.id);
  if (ue) return { error: ue.message };

  await supabase.from("entry_clause_refs").delete().eq("entry_id", entry.id);
  if (refs.length) await supabase.from("entry_clause_refs").insert(refs.map((r) => ({ ...r, entry_id: entry.id })));
  await supabase.from("entry_tags").delete().eq("entry_id", entry.id);
  if (tagRows?.length) await supabase.from("entry_tags").insert(tagRows.map((t) => ({ entry_id: entry.id, tag_id: t.id })));

  revalidatePath(`/entry/${p.slug}`); revalidatePath("/admin/review");
  const warnings: string[] = [];
  if (entry.status === "published") warnings.push("This entry was published: it is now back in review until you re-publish it.");
  if ((entry.module === "practice" || entry.module === "code") && !refs.length) warnings.push("Practice/Code entries need at least one clause reference before they can be published.");
  return { ok: true, warnings };
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export async function createEntry(formData: FormData) {
  const { supabase, ok } = await editorClient();
  if (!ok) redirect("/");
  const module = String(formData.get("module"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(String(formData.get("slug") || title));
  const back = (m: string) => redirect(`/entry/new?err=${encodeURIComponent(m)}`);
  if (!["practice", "code", "education"].includes(module)) back("Tools come from the calc library (code); create practice, code or education entries here");
  if (!title || !slug) back("Title is required");
  const { data: spec } = await supabase.from("specializations").select("id").eq("slug", String(formData.get("specialization"))).maybeSingle();
  const { data: ins, error } = await supabase.from("entries").insert({
    module, title, slug, summary: String(formData.get("summary") ?? "").trim() || null, status: "draft", specialization_id: spec?.id ?? null,
  }).select("id").single();
  if (error) back(error.message.includes("duplicate") ? `Slug "${slug}" already exists` : error.message);
  const { data: rev } = await supabase.from("entry_revisions").insert({
    entry_id: ins!.id, body: { sections: [] }, change_note: "Created in app", source: "app", code_edition: module === "education" ? null : "NSCP 2015",
  }).select("id").single();
  if (rev) await supabase.from("entries").update({ current_revision_id: rev.id }).eq("id", ins!.id);
  redirect(`/entry/${slug}/edit`);
}

export async function restoreRevision(formData: FormData) {
  const slug = String(formData.get("slug")), revId = String(formData.get("rev_id"));
  const { supabase, ok } = await editorClient();
  if (!ok) redirect(`/entry/${slug}`);
  const { data: entry } = await supabase.from("entries").select("id,status").eq("slug", slug).single();
  const { data: old } = await supabase.from("entry_revisions").select("rev_no,body,diagram,code_edition").eq("id", revId).eq("entry_id", entry!.id).single();
  if (!old) redirect(`/entry/${slug}/history?err=${encodeURIComponent("Revision not found")}`);
  const { data: rev, error } = await supabase.from("entry_revisions").insert({
    entry_id: entry!.id, body: old!.body, diagram: old!.diagram, code_edition: old!.code_edition,
    change_note: `Restored from rev ${old!.rev_no}`, source: "app",
  }).select("id").single();
  if (error) redirect(`/entry/${slug}/history?err=${encodeURIComponent(error.message)}`);
  await supabase.from("entries").update({ current_revision_id: rev!.id, status: entry!.status === "published" ? "review" : entry!.status }).eq("id", entry!.id);
  revalidatePath(`/entry/${slug}`);
  redirect(`/entry/${slug}/history?ok=restored`);
}
