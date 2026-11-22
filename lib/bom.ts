// Bill of materials: sum material lines across estimate items (shared by the BOM page and its CSV export).
import type { Material } from "@/lib/calc/core";

export type BomLine = Material & { from: string[] };
export function aggregate(items: { label: string; materials: Material[] }[]): BomLine[] {
  const m = new Map<string, BomLine>();
  for (const it of items) for (const x of it.materials ?? []) {
    const y = m.get(x.key);
    if (y) { y.qty = Math.round((y.qty + x.qty) * 1000) / 1000; if (!y.from.includes(it.label)) y.from.push(it.label); }
    else m.set(x.key, { ...x, from: [it.label] });
  }
  const order = ["cement", "sand", "gravel", "chb", "rebar", "tie-wire", "angle", "base-plate", "anchor", "lumber", "plywood", "formwork", "paint"];
  const rank = (k: string) => { const i = order.findIndex((o) => k.startsWith(o)); return i < 0 ? 99 : i; };
  return [...m.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key, undefined, { numeric: true }));
}
/** Display quantity: whole units for countable items, 2 decimals otherwise. */
export const showQty = (u: string, q: number) => (["bags", "pcs", "sheets"].includes(u) ? Math.ceil(q - 1e-9) : Math.round(q * 100) / 100);
