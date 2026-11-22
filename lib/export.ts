// CSV export of a calculator / checklist run (v0.8.0). Shared by ToolRunner and the API (?format=csv).
import type { Calc, CalcOutput, Inputs } from "./calc/core";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (...v: unknown[]) => v.map(cell).join(",");

export function toCsv(calc: Calc, inputs: Inputs, out: CalcOutput, meta: { generated?: string; source?: string } = {}): string {
  const rows: string[] = [
    line("CEMP", calc.title), line("Calculator key", calc.key),
    line("Generated", meta.generated ?? new Date().toISOString()), line("Source", meta.source ?? "https://cemp.darkwizlab.com"),
    line("Code clauses", calc.clauses.join("; ")), "",
    line("INPUTS"), line("Field", "Value", "Unit"),
  ];
  for (const f of calc.fields) {
    const v = inputs[f.key];
    const shown = f.type === "select" ? f.options.find((o) => o.value === String(v))?.label ?? v : v;
    rows.push(line(f.group ? `${f.group}: ${f.label}` : f.label, shown, f.unit ?? ""));
  }
  rows.push("", line("RESULTS"), line("Result", "Value", "Unit"));
  out.results.forEach((x) => rows.push(line(x.label, x.value, x.unit ?? "")));
  rows.push("", line("CHECKS"), line("Check", "OK", "Detail"));
  out.checks.forEach((c) => rows.push(line(c.label, c.ok ? "OK" : "NOT OK", c.detail)));
  if (out.table) {
    rows.push("", line("TABLE"), line(...out.table.columns));
    out.table.rows.forEach((r) => rows.push(line(...r)));
  }
  rows.push("", line("STEPS"));
  out.steps.forEach((s, i) => rows.push(line(i + 1, s)));
  return "﻿" + rows.join("\r\n"); // BOM so Excel reads UTF-8 (φ, ², √)
}
