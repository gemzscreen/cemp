"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Admin only: stamp the current revision as reviewed by the signed-in admin, then publish.
 *  The DB publish_gate trigger enforces admin role, clause refs and hand-checks. */
export async function reviewAndPublish(formData: FormData) {
  const slug = String(formData.get("slug"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entry, error: e1 } = await supabase
    .from("entries").select("id,current_revision_id").eq("slug", slug).single();
  if (e1 || !entry?.current_revision_id) redirect(`/entry/${slug}?err=${encodeURIComponent(e1?.message ?? "No current revision")}`);

  const { error: e2 } = await supabase.from("entry_revisions")
    .update({ reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", entry.current_revision_id);
  if (e2) redirect(`/entry/${slug}?err=${encodeURIComponent(e2.message)}`);

  const { error: e3 } = await supabase.from("entries").update({ status: "published" }).eq("id", entry.id);
  if (e3) redirect(`/entry/${slug}?err=${encodeURIComponent(e3.message)}`);

  revalidatePath(`/entry/${slug}`);
  revalidatePath("/practices");
  redirect(`/entry/${slug}?ok=published`);
}

export async function sendBackToDraft(formData: FormData) {
  const slug = String(formData.get("slug"));
  const supabase = await createClient();
  const { error } = await supabase.from("entries").update({ status: "draft" }).eq("slug", slug);
  revalidatePath(`/entry/${slug}`);
  redirect(`/entry/${slug}?${error ? `err=${encodeURIComponent(error.message)}` : "ok=draft"}`);
}

/* v1.1.0: archive (hide, restorable) and permanent delete (admin). */
async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  return { supabase, ok: me?.role === "admin" };
}

export async function archiveEntry(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { supabase, ok } = await adminClient();
  if (!ok) redirect(`/entry/${slug}?err=${encodeURIComponent("Admin only")}`);
  const { error } = await supabase.from("entries").update({ status: "deprecated" }).eq("slug", slug);
  revalidatePath("/", "layout");
  redirect(`/entry/${slug}?${error ? `err=${encodeURIComponent(error.message)}` : "ok=archived"}`);
}

export async function restoreEntry(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { supabase, ok } = await adminClient();
  if (!ok) redirect(`/entry/${slug}?err=${encodeURIComponent("Admin only")}`);
  const { error } = await supabase.from("entries").update({ status: "review" }).eq("slug", slug);
  revalidatePath("/", "layout");
  redirect(`/entry/${slug}?${error ? `err=${encodeURIComponent(error.message)}` : "ok=restored"}`);
}

/** Permanent: removes the entry with its revisions, refs, tags, tool row, bookmarks and notes (FK cascade).
 *  A tombstone stops content sync from recreating it from a batch file. */
export async function deleteEntry(formData: FormData) {
  const slug = String(formData.get("slug"));
  const { supabase, ok } = await adminClient();
  if (!ok) redirect(`/entry/${slug}?err=${encodeURIComponent("Admin only")}`);
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") redirect(`/entry/${slug}?err=${encodeURIComponent("Type DELETE to confirm permanent deletion")}`);
  const { data: e } = await supabase.from("entries").select("id,title,module").eq("slug", slug).maybeSingle();
  if (!e) redirect("/");
  const { error: te } = await supabase.from("entry_tombstones").upsert({ slug, title: e!.title }, { onConflict: "slug" });
  if (te) redirect(`/entry/${slug}?err=${encodeURIComponent(te.message)}`);
  const { error } = await supabase.from("entries").delete().eq("id", e!.id);
  if (error) {
    await supabase.from("entry_tombstones").delete().eq("slug", slug);
    redirect(`/entry/${slug}?err=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/", "layout");
  const mod = e!.module === "education" ? "education" : e!.module === "tool" ? "tools" : e!.module === "code" ? "codes" : e!.module === "conversion" ? "conversions" : "practices";
  redirect(`/${mod}?deleted=${encodeURIComponent(e!.title)}`);
}
