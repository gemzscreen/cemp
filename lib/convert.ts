// Shared conversion math. Used by the UI now and by the integration API (v0.8.0).
// value_in_base = value * to_base + offset ;  value = (base - offset) / to_base
export type Unit = { id: number; category_id: number; symbol: string; name: string; system: "si" | "english" | "other"; to_base: number; offset: number; sort: number };
export type UnitCategory = { id: number; name: string; base_unit: string; sort: number };

export function convert(value: number, from: Unit, to: Unit): number {
  const base = value * Number(from.to_base) + Number(from.offset);
  return (base - Number(to.offset)) / Number(to.to_base);
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e9 || a < 1e-4) return n.toExponential(4).replace("e", " × 10^");
  return n.toLocaleString("en-US", { maximumSignificantDigits: 7 });
}
