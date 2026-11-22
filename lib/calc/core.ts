// Shared types and helpers for the CEMP calc library.
type FieldBase = { key: string; label: string; unit?: string; help?: string; group?: string }; // group → heading in the form
export type Field =
  | (FieldBase & { type: "number"; default: number; min?: number; step?: number })
  | (FieldBase & { type: "select"; default: string; options: { value: string; label: string }[] })
  | (FieldBase & { type: "text"; default: string; rows?: number });

export type Result = { label: string; value: number | string; unit?: string; main?: boolean };
export type Check = { label: string; ok: boolean; detail: string };
export type Table = { columns: string[]; rows: (string | number)[][]; highlight?: number[] };
/** Bill-of-materials line (estimating calculators): summed by key across a project. */
export type Material = { key: string; name: string; unit: string; qty: number };
export type CalcOutput = { results: Result[]; checks: Check[]; steps: string[]; table?: Table; materials?: Material[] };
export type Inputs = Record<string, number | string>;
/** Presets: when the "from" fields change, the mapped fields are filled (still editable). Key = from-values joined by "|". */
export type Preset = { from: string[]; map: Record<string, Record<string, number>>; label?: string };
export type Calc = { key: string; title: string; clauses: string[]; fields: Field[]; compute: (i: Inputs) => CalcOutput; presets?: Preset[] };

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

