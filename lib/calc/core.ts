// Shared types and helpers for the CEMP calc library.
export type Field =
  | { key: string; label: string; unit?: string; type: "number"; default: number; min?: number; step?: number; help?: string }
  | { key: string; label: string; unit?: string; type: "select"; default: string; options: { value: string; label: string }[]; help?: string }
  | { key: string; label: string; unit?: string; type: "text"; default: string; rows?: number; help?: string };

export type Result = { label: string; value: number | string; unit?: string; main?: boolean };
export type Check = { label: string; ok: boolean; detail: string };
export type Table = { columns: string[]; rows: (string | number)[][]; highlight?: number[] };
export type CalcOutput = { results: Result[]; checks: Check[]; steps: string[]; table?: Table };
export type Inputs = Record<string, number | string>;
export type Calc = { key: string; title: string; clauses: string[]; fields: Field[]; compute: (i: Inputs) => CalcOutput };

export const n = (v: number | string) => Number(v);
export const r = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
export const ES = 200000; // MPa

export function beta1(fc: number) {
  if (fc <= 28) return 0.85;
  if (fc >= 55) return 0.65;
  return 0.85 - (0.05 * (fc - 28)) / 7;
}
export function phiFlexure(et: number, fy: number) {
  const ety = fy / ES;
  if (et >= 0.005) return 0.9;
  if (et <= ety) return 0.65;
  return 0.65 + (0.25 * (et - ety)) / (0.005 - ety);
}
export const barArea = (db: number) => (Math.PI * db * db) / 4;

