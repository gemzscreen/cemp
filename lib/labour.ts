// v2.5.0 trade-crew labour presets (DUPA-style): work quantity from the calculator ÷ output per crew-day = crew-days;
// labour ₱ = crew-days × Σ(workers × daily rate). Outputs are typical small-job productivities for the game of estimating,
// not DPWH standard outputs: VERIFY and override per item in Costing.
import { CALCS, type Inputs } from "@/lib/calc";
import type { Trade } from "@/lib/rates";

export type Crew = Partial<Record<Trade, number>>;
export type Preset = { measure: string; unit: string; output: number; crew: Crew; basis: string };
const RC: Crew = { carpenter: 1, steelman: 1, mason: 1, helper: 2 };
const val = (s: unknown) => Number(String(s ?? "").replace(/[^\d.\-]/g, "")) || 0;

/** How to read the work quantity for each estimator: a result label, or a function of the inputs. */
const PRESETS: Record<string, Preset & { from: string | ((i: Inputs) => number) }> = {
  "est-footing": { from: "Concrete", measure: "Concrete", unit: "m³", output: 0.8, crew: RC, basis: "forms, rebar and pour, isolated footings" },
  "est-wall-footing": { from: "Concrete", measure: "Concrete", unit: "m³", output: 1.2, crew: RC, basis: "forms, rebar and pour, strip footing" },
  "est-beam": { from: "Concrete", measure: "Concrete", unit: "m³", output: 0.35, crew: RC, basis: "forms, shoring, rebar and pour" },
  "est-column": { from: "Concrete", measure: "Concrete", unit: "m³", output: 0.3, crew: RC, basis: "forms, ties, rebar and pour" },
  "est-slab": { from: "Concrete", measure: "Concrete", unit: "m³", output: 0.6, crew: RC, basis: "forms, rebar and pour" },
  "est-wall": { from: "Concrete", measure: "Concrete", unit: "m³", output: 0.4, crew: RC, basis: "two-sided forms, rebar and pour" },
  "est-stairs": { from: "Concrete", measure: "Concrete", unit: "m³", output: 0.25, crew: RC, basis: "forms, rebar and pour, one flight" },
  "est-chb": { from: "Net wall area", measure: "CHB wall", unit: "m²", output: 10, crew: { mason: 1, helper: 1 }, basis: "laying with vertical and horizontal bars" },
  "est-plaster": { from: "Plaster area", measure: "Plaster", unit: "m²", output: 12, crew: { mason: 1, helper: 1 }, basis: "scratch and finish coat" },
  "est-water-tank": { from: "Concrete", measure: "Tank concrete", unit: "m³", output: 0.4, crew: RC, basis: "forms, rebar, pour and plaster, small tank" },
  "est-septic": { from: (i) => 0, measure: "Liquid capacity", unit: "m³", output: 0.5, crew: { mason: 1, carpenter: 1, helper: 2 }, basis: "excavation by hand, CHB walls, slabs, plaster" },
  "est-tank-stand": { from: "Steel weight (members)", measure: "Steel", unit: "kg", output: 80, crew: { welder: 1, helper: 1 }, basis: "cut, weld, paint and set" },
  "est-lumber": { from: "Board feet (net)", measure: "Lumber", unit: "bd ft", output: 100, crew: { carpenter: 1, helper: 1 }, basis: "rough framing" },
  "est-tiles": { from: (i) => val(i.area), measure: "Tiling", unit: "m²", output: 8, crew: { tilesetter: 1, helper: 1 }, basis: "set, grout and clean" },
  "est-paint": { from: (i) => val(i.area), measure: "Painting", unit: "m²", output: 10, crew: { painter: 1 }, basis: "prep, primer and two coats" },
  "est-ceiling": { from: (i) => val(i.L) * val(i.W) * Math.max(1, val(i.count)), measure: "Ceiling", unit: "m²", output: 10, crew: { carpenter: 1, helper: 1 }, basis: "metal framing, boards, joints" },
  "est-waterproof": { from: "Area incl. upturns", measure: "Waterproofing", unit: "m²", output: 15, crew: { mason: 1, helper: 1 }, basis: "prep, two coats, corner tape" },
  "est-gutter": { from: (i) => val(i.eave), measure: "Gutter", unit: "m", output: 15, crew: { carpenter: 1, helper: 1 }, basis: "brackets, gutters, downspouts" },
};

/** Preset and work quantity for an item (null if the calculator has no preset). */
export function labourPreset(calcKey: string, inputs: Inputs): (Preset & { qty: number }) | null {
  const p = PRESETS[calcKey], c = CALCS[calcKey];
  if (!p || !c) return null;
  let qty = 0;
  if (calcKey === "est-septic") {
    const out = c.compute(inputs); qty = val(out.results.find((r) => r.label === "Liquid capacity")?.value) / 1000;
  } else if (typeof p.from === "function") qty = p.from(inputs);
  else { const out = c.compute(inputs); qty = val(out.results.find((r) => r.label === p.from)?.value); }
  const { from: _from, ...rest } = p;
  return { ...rest, qty };
}

/** Crew-days rounded up to half a day (minimum half a day). */
export const crewDays = (qty: number, output: number) => (output > 0 && qty > 0 ? Math.max(0.5, Math.ceil((qty / output) * 2) / 2) : 0);
export const crewDayCost = (crew: Crew, rates: Record<Trade, number>) => (Object.entries(crew) as [Trade, number][]).reduce((s, [t, n]) => s + n * (rates[t] ?? 0), 0);
export const crewLabel = (crew: Crew, names: Record<Trade, { name: string }>) => (Object.entries(crew) as [Trade, number][]).map(([t, n]) => `${n} ${names[t].name.toLowerCase()}`).join(" + ");
