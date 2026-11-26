"use server";
// Estimate projects (BOM/BOQ). Rows are private to their owner (RLS: user_id = auth.uid()).
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CALCS, type Inputs } from "@/lib/calc";

export type EstItem = { id: string; calcKey: string; label: string; inputs: Inputs; materials: { key: string; name: string; unit: string; qty: number }[]; addedAt: string; updatedAt?: string };
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

/** Revise a saved item in place (v2.1.0): same id and position, quantities recomputed from the new inputs. */
export async function updateItem(p: { projectId: string; itemId: string; label: string; calcKey: string; inputs: Inputs }): Promise<AddResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again." };
  let calc;
  try { calc = compute(p.calcKey, p.inputs); } catch (e) { return { error: (e as Error).message }; }
  if (!calc.materials.length) return { error: "Nothing to save: check the inputs." };
  const { data: proj, error: pe } = await supabase.from("estimate_projects").select("name,items").eq("id", p.projectId).single();
  if (pe || !proj) return { error: "Project not found." };
  const items = ((proj.items as EstItem[]) ?? []);
  const k = items.findIndex((x) => x.id === p.itemId);
  if (k < 0) return { error: "That item is no longer in the project (removed?). Use Add to BOM instead." };
  if (items[k].calcKey !== p.calcKey) return { error: "This item belongs to another calculator." };
  const next = items.slice();
  next[k] = { ...items[k], label: (p.label || CALCS[p.calcKey].title).slice(0, 120), inputs: calc.clean, materials: calc.materials, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from("estimate_projects").update({ items: next }).eq("id", p.projectId);
  if (error) return { error: error.message };
  revalidatePath(`/estimate/projects/${p.projectId}`); revalidatePath("/estimate/projects");
  return { ok: true, projectId: p.projectId, projectName: proj.name };
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

/** v2.2.0: save labour/equipment per item, markups and quotation details. Normalized on the server. */
export async function saveCosting(projectId: string, raw: unknown): Promise<{ ok?: boolean; error?: string }> {
  const { normalizeCosting } = await import("@/lib/costing");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again." };
  const { data: proj } = await supabase.from("estimate_projects").select("items").eq("id", projectId).single();
  if (!proj) return { error: "Project not found." };
  const costing = normalizeCosting(raw);
  const ids = new Set(((proj.items as EstItem[]) ?? []).map((i) => i.id));
  for (const id of Object.keys(costing.items)) if (!ids.has(id)) delete costing.items[id]; // drop removed items
  const { error } = await supabase.from("estimate_projects").update({ costing }).eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath(`/estimate/projects/${projectId}`); revalidatePath(`/estimate/projects/${projectId}/quote`);
  return { ok: true };
}

/** v2.5.0: issue the current quotation as a frozen revision (Rev 0, R1, R2 …). */
export async function issueQuote(formData: FormData) {
  const id = String(formData.get("id"));
  const { buildQuote } = await import("@/lib/quote");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: p }, { data: prof }, { data: ur }, { data: last }] = await Promise.all([
    supabase.from("estimate_projects").select("id,name,client,location,items,prices,costing").eq("id", id).single(),
    supabase.from("profiles").select("issuer,full_name").eq("id", user!.id).single(),
    supabase.from("user_rates").select("labour").eq("user_id", user!.id).maybeSingle(),
    supabase.from("quote_revisions").select("rev").eq("project_id", id).order("rev", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!p) redirect(`/estimate/projects/${id}/quote?err=${encodeURIComponent("Project not found")}`);
  const rev = last ? (last.rev as number) + 1 : 0;
  const { snap } = buildQuote(p!, prof?.issuer, ur, prof?.full_name ?? null, rev);
  if (!snap.r.items.length) redirect(`/estimate/projects/${id}/quote?err=${encodeURIComponent("Add items before issuing")}`);
  const { error } = await supabase.from("quote_revisions").insert({ project_id: id, rev, snapshot: { ...snap, issuedAt: new Date().toISOString() } });
  if (error) redirect(`/estimate/projects/${id}/quote?err=${encodeURIComponent(error.message)}`);
  revalidatePath(`/estimate/projects/${id}/quote`);
  redirect(`/estimate/projects/${id}/quote?rev=${rev}&ok=issued`);
}
