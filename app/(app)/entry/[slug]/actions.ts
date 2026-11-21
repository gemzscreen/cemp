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
