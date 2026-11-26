"use server";
// v2.5.0: personal rate table actions (user_rates: one row per user, RLS owner only).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeRates, TRADES, type Rates, type Trade } from "@/lib/rates";
import { aggregate } from "@/lib/bom";
import type { EstItem } from "../actions";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

async function load() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in again.");
  const { data } = await supabase.from("user_rates").select("materials,labour").eq("user_id", user.id).maybeSingle();
  return { supabase, user, rates: normalizeRates(data) };
}
async function save(supabase: Awaited<ReturnType<typeof createClient>>, uid: string, r: Rates) {
  const { error } = await supabase.from("user_rates").upsert({ user_id: uid, materials: r.materials, labour: r.labour }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveLabour(formData: FormData) {
  const { supabase, user, rates } = await load();
  for (const t of Object.keys(TRADES) as Trade[]) {
    const v = Number(formData.get(`rate:${t}`));
    if (Number.isFinite(v) && v >= 0 && v < 100000) rates.labour[t] = v;
  }
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates"); redirect("/estimate/rates?ok=labour");
}

export async function saveMaterialRates(formData: FormData) {
  const { supabase, user, rates } = await load();
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("del:") && v === "1") { delete rates.materials[k.slice(4)]; continue; }
    if (!k.startsWith("price:")) continue;
    const key = k.slice(6), m = rates.materials[key];
    if (!m) continue;
    const p = Number(v);
    if (String(v).trim() !== "" && Number.isFinite(p) && p >= 0 && p !== m.price) { m.price = p; m.at = today(); }
    const note = String(formData.get(`note:${key}`) ?? "").trim().slice(0, 120);
    m.note = note || undefined;
  }
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates"); redirect("/estimate/rates?ok=materials");
}

/** Prices as typed in the BOM form (the buttons submit the whole form), saved to the project first. */
async function syncFormPrices(supabase: Awaited<ReturnType<typeof createClient>>, id: string, formData: FormData, stored: Record<string, number>) {
  const typed: Record<string, number> = {};
  let any = false;
  for (const [k, v] of formData.entries()) if (k.startsWith("price:")) { any = true; if (String(v).trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0) typed[k.slice(6)] = Number(v); }
  if (!any) return stored;
  await supabase.from("estimate_projects").update({ prices: typed }).eq("id", id);
  return typed;
}

/** Project → price list: every priced BOM material is saved (or updated) in the user's list. */
export async function savePricesToList(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, user, rates } = await load();
  const { data: p } = await supabase.from("estimate_projects").select("name,items,prices").eq("id", id).single();
  if (!p) redirect(`/estimate/projects/${id}?err=${encodeURIComponent("Project not found")}`);
  const prices = await syncFormPrices(supabase, id, formData, (p!.prices ?? {}) as Record<string, number>);
  let n = 0;
  for (const b of aggregate((p!.items ?? []) as EstItem[])) {
    const pr = prices[b.key];
    if (pr == null) continue;
    const cur = rates.materials[b.key];
    rates.materials[b.key] = { name: b.name, unit: b.unit, price: pr, note: cur?.price === pr ? cur.note : `from ${p!.name}`.slice(0, 120), at: cur?.price === pr ? cur.at : today() };
    n++;
  }
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates");
  redirect(`/estimate/projects/${id}?ok=${encodeURIComponent(`${n} price(s) saved to your price list`)}`);
}

/** Price list → project: fills BOM materials that have no unit price yet (never overwrites). */
export async function fillPricesFromList(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, rates } = await load();
  const { data: p } = await supabase.from("estimate_projects").select("items,prices").eq("id", id).single();
  // (typed prices are synced below; fill never overwrites a typed price)
  if (!p) redirect(`/estimate/projects/${id}?err=${encodeURIComponent("Project not found")}`);
  const prices = { ...(await syncFormPrices(supabase, id, formData, (p!.prices ?? {}) as Record<string, number>)) };
  let n = 0;
  for (const b of aggregate((p!.items ?? []) as EstItem[])) if (prices[b.key] == null && rates.materials[b.key]) { prices[b.key] = rates.materials[b.key].price; n++; }
  if (n) await supabase.from("estimate_projects").update({ prices }).eq("id", id);
  revalidatePath(`/estimate/projects/${id}`);
  redirect(`/estimate/projects/${id}?ok=${encodeURIComponent(n ? `${n} price(s) filled from your price list` : "No blank prices matched your price list")}`);
}
