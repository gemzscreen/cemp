"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Bulk review & publish (admin). Each entry still passes the DB publish_gate; failures are reported, not hidden. */
export async function bulkAction(formData: FormData) {
  const slugs = formData.getAll("slug").map(String).slice(0, 100);
  const action = String(formData.get("action"));
  const back = String(formData.get("back") || "/admin/review");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const sep = back.includes("?") ? "&" : "?";
  if (!slugs.length) redirect(`${back}${sep}err=${encodeURIComponent("Select at least one entry")}`);
  if (action === "publish" && me?.role !== "admin") redirect(`${back}${sep}err=${encodeURIComponent("Only the admin publishes")}`);
  if (action === "to-review" && me?.role !== "admin" && me?.role !== "editor") redirect(`${back}${sep}err=${encodeURIComponent("Editors and admins only")}`);

  const { data: entries } = await supabase.from("entries").select("id,slug,status,current_revision_id").in("slug", slugs);
  let ok = 0; const failed: string[] = [];
  for (const e of entries ?? []) {
    if (action === "publish") {
      if (!e.current_revision_id) { failed.push(`${e.slug}: no revision`); continue; }
      const { error: r } = await supabase.from("entry_revisions").update({ reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", e.current_revision_id);
      if (r) { failed.push(`${e.slug}: ${r.message}`); continue; }
      const { error: p } = await supabase.from("entries").update({ status: "published" }).eq("id", e.id);
      if (p) { failed.push(`${e.slug}: ${p.message.replace(/^Cannot publish: /, "")}`); continue; }
    } else if (action === "to-review") {
      if (e.status !== "draft") continue;
      const { error } = await supabase.from("entries").update({ status: "review" }).eq("id", e.id);
      if (error) { failed.push(`${e.slug}: ${error.message}`); continue; }
    } else if (action === "to-draft") {
      const { error } = await supabase.from("entries").update({ status: "draft" }).eq("id", e.id);
      if (error) { failed.push(`${e.slug}: ${error.message}`); continue; }
    }
    ok++;
  }
  revalidatePath("/", "layout");
  const msg = `${ok} done${failed.length ? ` · ${failed.length} failed: ${failed.join(" | ")}` : ""}`;
  redirect(`${back}${sep}${failed.length ? "err" : "ok"}=${encodeURIComponent(msg)}`);
}
