"use server";
// Estimate projects (BOM/BOQ). Rows are private to their owner (RLS: user_id = auth.uid()).
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CALCS, type Inputs } from "@/lib/calc";

export type EstItem = { id: string; calcKey: string; label: string; inputs: Inputs; materials: { key: string; name: string; unit: string; qty: number }[]; addedAt: string };
export type AddResult = { ok?: boolean; error?: string; projectId?: string; projectName?: string };

/** Recompute on the server from calc key + inputs (never trust client-side quantities). */
function compute(calcKey: string, inputs: Inputs) {
  const c = CALCS[calcKey];
  if (!c || !calcKey.startsWith("est-")) throw new Error("Unknown estimating calculator");
  const clean: Inputs = {};
  for (const f of c.fields) clean[f.key] = f.type === "number" ? Number(inputs[f.key] ?? f.default) : String(inputs[f.key] ?? f.default).slice(0, 5000);
  const out = c.compute(clean);
  return { clean, materials: out.materials ?? [] };
}

export async function addToProject(p: { projectId?: string; newName?: string; label: string; calcKey: string; inputs: Inputs }): Promise<AddResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again." };
  let calc;
  try { calc = compute(p.calcKey, p.inputs); } catch (e) { return { error: (e as Error).message }; }
  if (!calc.materials.length) return { error: "Nothing to add: check the inputs." };
  let id = p.projectId, name = "";
  if (!id) {
    const nm = (p.newName ?? "").trim().slice(0, 120);
    if (!nm) return { error: "Name the new project." };
    const { data, error } = await supabase.from("estimate_projects").insert({ name: nm }).select("id,name").single();
    if (error) return { error: error.message };
    id = data.id; name = data.name;
  }
  const { data: proj, error: pe } = await supabase.from("estimate_projects").select("name,items").eq("id", id).single();
  if (pe || !proj) return { error: "Project not found." };
  const item: EstItem = { id: randomUUID(), calcKey: p.calcKey, label: (p.label || CALCS[p.calcKey].title).slice(0, 120), inputs: calc.clean, materials: calc.materials, addedAt: new Date().toISOString() };
  const { error } = await supabase.from("estimate_projects").update({ items: [...((proj.items as EstItem[]) ?? []), item] }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/estimate/projects/${id}`); revalidatePath("/estimate/projects");
  return { ok: true, projectId: id, projectName: name || proj.name };
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) redirect("/estimate/projects?err=" + encodeURIComponent("Name the project"));
  const supabase = await createClient();
  const { data, error } = await supabase.from("estimate_projects").insert({
    name, client: String(formData.get("client") ?? "").trim() || null, location: String(formData.get("location") ?? "").trim() || null,
  }).select("id").single();
  if (error) redirect("/estimate/projects?err=" + encodeURIComponent(error.message));
  redirect(`/estimate/projects/${data!.id}`);
}

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const prices: Record<string, number> = {};
  for (const [k, v] of formData.entries()) if (k.startsWith("price:") && String(v).trim() !== "" && Number.isFinite(Number(v))) prices[k.slice(6)] = Number(v);
  const { error } = await supabase.from("estimate_projects").update({
    name: String(formData.get("name") ?? "").trim().slice(0, 120) || "Untitled",
    client: String(formData.get("client") ?? "").trim() || null, location: String(formData.get("location") ?? "").trim() || null, prices,
  }).eq("id", id);
  revalidatePath(`/estimate/projects/${id}`);
  redirect(`/estimate/projects/${id}?${error ? `err=${encodeURIComponent(error.message)}` : "ok=saved"}`);
}

export async function removeItem(formData: FormData) {
  const id = String(formData.get("id")), itemId = String(formData.get("item"));
  const supabase = await createClient();
  const { data } = await supabase.from("estimate_projects").select("items").eq("id", id).single();
  await supabase.from("estimate_projects").update({ items: ((data?.items as EstItem[]) ?? []).filter((x) => x.id !== itemId) }).eq("id", id);
  revalidatePath(`/estimate/projects/${id}`);
  redirect(`/estimate/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("estimate_projects").delete().eq("id", id);
  revalidatePath("/estimate/projects");
  redirect("/estimate/projects?ok=deleted");
}
