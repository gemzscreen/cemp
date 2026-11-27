"use server";
// v2.5.0: personal rate table actions (user_rates: one row per user, RLS owner only).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeRates, rateSetOf, TRADES, type Rates, type Trade, type RateSet, type Currency } from "@/lib/rates";
import { aggregate } from "@/lib/bom";
import { normalizeCosting } from "@/lib/costing";
import type { EstItem } from "../actions";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

async function load() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in again.");
  const { data } = await supabase.from("user_rates").select("materials,labour,sets").eq("user_id", user.id).maybeSingle();
  return { supabase, user, rates: normalizeRates(data) };
}
async function save(supabase: Awaited<ReturnType<typeof createClient>>, uid: string, r: Rates) {
  // `labour` and `materials` mirror the first set so older code paths and v2.5 rows stay consistent
  const { error } = await supabase.from("user_rates").upsert({ user_id: uid, materials: r.sets[0].materials, labour: r.sets[0].labour, sets: r.sets }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

const back = (set: string, ok: string) => `/estimate/rates?set=${encodeURIComponent(set)}&ok=${ok}`;

/** v2.8.0: save one rate set (name, currency, VAT and the trade rates). */
export async function saveLabour(formData: FormData) {
  const { supabase, user, rates } = await load();
  const id = String(formData.get("set") ?? rates.sets[0].id);
  const set = rates.sets.find((x) => x.id === id) ?? rates.sets[0];
  for (const t of Object.keys(TRADES) as Trade[]) {
    const v = Number(formData.get(`rate:${t}`));
    if (Number.isFinite(v) && v >= 0 && v < 100000) set.labour[t] = v;
  }
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (name) set.name = name;
  set.currency = formData.get("currency") === "BND" ? "BND" : "PHP";
  set.vat = formData.get("vat") === "1";
  set.note = String(formData.get("note") ?? "").trim().slice(0, 200) || undefined;
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates"); redirect(back(set.id, "labour"));
}

/** v2.8.0: add a rate set, copying the trade rates of an existing one as a starting point. */
export async function addRateSet(formData: FormData) {
  const { supabase, user, rates } = await load();
  if (rates.sets.length >= 12) redirect("/estimate/rates?err=" + encodeURIComponent("Up to 12 rate sets."));
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "New rate set";
  const currency: Currency = formData.get("currency") === "BND" ? "BND" : "PHP";
  const from = rates.sets.find((x) => x.id === String(formData.get("from"))) ?? rates.sets[0];
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "set";
  while (rates.sets.some((x) => x.id === id)) id = `${id.slice(0, 26)}-${Math.random().toString(36).slice(2, 5)}`;
  // v2.10.0: prices are copied only when asked and only between sets of the same currency
  const copyPrices = formData.get("prices") === "1" && from.currency === currency;
  const set: RateSet = { id, name, currency, vat: currency === "PHP", labour: { ...from.labour }, note: `Copied from ${from.name}: edit every rate for this area.`,
    materials: copyPrices ? Object.fromEntries(Object.entries(from.materials).map(([k, m]) => [k, { ...m }])) : {} };
  rates.sets.push(set);
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates"); redirect(back(id, "added"));
}

/** v2.8.0: delete a rate set (the last one cannot be removed; projects using it fall back to the first set). */
export async function deleteRateSet(formData: FormData) {
  const { supabase, user, rates } = await load();
  const id = String(formData.get("set"));
  if (rates.sets.length <= 1) redirect(back(id, "keep"));
  rates.sets = rates.sets.filter((x) => x.id !== id);
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates"); redirect(back(rates.sets[0].id, "deleted"));
}

/** v2.10.0: save one rate set's material price list. */
export async function saveMaterialRates(formData: FormData) {
  const { supabase, user, rates } = await load();
  const set = rateSetOf(rates, String(formData.get("set") ?? ""));
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("del:") && v === "1") { delete set.materials[k.slice(4)]; continue; }
    if (!k.startsWith("price:")) continue;
    const key = k.slice(6), m = set.materials[key];
    if (!m) continue;
    const p = Number(v);
    if (String(v).trim() !== "" && Number.isFinite(p) && p >= 0 && p !== m.price) { m.price = p; m.at = today(); }
    const note = String(formData.get(`note:${key}`) ?? "").trim().slice(0, 120);
    m.note = note || undefined;
  }
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates"); redirect(back(set.id, "materials"));
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
  const { data: p } = await supabase.from("estimate_projects").select("name,items,prices,costing").eq("id", id).single();
  if (!p) redirect(`/estimate/projects/${id}?err=${encodeURIComponent("Project not found")}`);
  const prices = await syncFormPrices(supabase, id, formData, (p!.prices ?? {}) as Record<string, number>);
  const set = rateSetOf(rates, normalizeCosting(p!.costing).rateSet); // the project's rate set owns the price list
  let n = 0;
  for (const b of aggregate((p!.items ?? []) as EstItem[])) {
    const pr = prices[b.key];
    if (pr == null) continue;
    const cur = set.materials[b.key];
    set.materials[b.key] = { name: b.name, unit: b.unit, price: pr, note: cur?.price === pr ? cur.note : `from ${p!.name}`.slice(0, 120), at: cur?.price === pr ? cur.at : today() };
    n++;
  }
  await save(supabase, user.id, rates);
  revalidatePath("/estimate/rates");
  redirect(`/estimate/projects/${id}?ok=${encodeURIComponent(`${n} price(s) saved to the "${set.name}" price list`)}`);
}

/** Price list → project: fills BOM materials that have no unit price yet (never overwrites). */
export async function fillPricesFromList(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, rates } = await load();
  const { data: p } = await supabase.from("estimate_projects").select("items,prices,costing").eq("id", id).single();
  // (typed prices are synced below; fill never overwrites a typed price)
  if (!p) redirect(`/estimate/projects/${id}?err=${encodeURIComponent("Project not found")}`);
  const prices = { ...(await syncFormPrices(supabase, id, formData, (p!.prices ?? {}) as Record<string, number>)) };
  const set = rateSetOf(rates, normalizeCosting(p!.costing).rateSet);
  let n = 0;
  for (const b of aggregate((p!.items ?? []) as EstItem[])) if (prices[b.key] == null && set.materials[b.key]) { prices[b.key] = set.materials[b.key].price; n++; }
  if (n) await supabase.from("estimate_projects").update({ prices }).eq("id", id);
  revalidatePath(`/estimate/projects/${id}`);
  redirect(`/estimate/projects/${id}?ok=${encodeURIComponent(n ? `${n} price(s) filled from the "${set.name}" price list` : `No blank prices matched the "${set.name}" price list`)}`);
}
