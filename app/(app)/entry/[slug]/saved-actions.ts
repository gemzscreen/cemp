"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Bookmarks and personal notes: RLS limits every row to its owner.
export async function toggleBookmark(formData: FormData) {
  const entryId = String(formData.get("entry_id")), slug = String(formData.get("slug"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (formData.get("on") === "1") await supabase.from("bookmarks").delete().eq("entry_id", entryId).eq("user_id", user.id);
  else await supabase.from("bookmarks").insert({ entry_id: entryId });
  revalidatePath(`/entry/${slug}`); revalidatePath("/saved");
}

export async function addNote(formData: FormData) {
  const entryId = String(formData.get("entry_id")), slug = String(formData.get("slug"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!body) return;
  const supabase = await createClient();
  await supabase.from("user_notes").insert({ entry_id: entryId, body });
  revalidatePath(`/entry/${slug}`); revalidatePath("/saved");
}

export async function deleteNote(formData: FormData) {
  const id = String(formData.get("id")), slug = String(formData.get("slug"));
  const supabase = await createClient();
  await supabase.from("user_notes").delete().eq("id", id);
  revalidatePath(`/entry/${slug}`); revalidatePath("/saved");
}
