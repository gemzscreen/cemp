// Printable pass/fail inspection checklists (v0.6.0).
// Each checklist is a Calc whose fields are Pass / Fail / N.A. selects, so it runs in the same
// ToolRunner, records a hand-check, and is reusable by the v0.8.0 integration API.
import type { Calc, Field } from "./core";

export type ChecklistGroup = { name: string; items: string[] };

const STATUS = [
  { value: "-", label: "Not checked" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "na", label: "N.A." },
];
const LABEL: Record<string, string> = { "-": "Not checked", pass: "Pass", fail: "Fail", na: "N.A." };

export function checklist(opts: {
  key: string; title: string; clauses: string[]; groups: ChecklistGroup[];
  info?: string; readyText?: string; notReadyText?: string;
}): Calc {
  const items = opts.groups.flatMap((g, gi) => g.items.map((text, ii) => ({ key: `c${gi + 1}_${ii + 1}`, no: `${gi + 1}.${ii + 1}`, group: g.name, text })));
  const fields: Field[] = [
    { key: "info", label: "Project / location / date / inspector", type: "text", rows: 3,
      default: opts.info ?? "Project:\nLocation / grid / level:\nDate, inspector, contractor's rep:" },
    ...items.map((it) => ({ key: it.key, label: `${it.no} ${it.text}`, type: "select" as const, default: "-", options: STATUS, group: it.group })),
    { key: "remarks", label: "Remarks / corrective actions", type: "text", rows: 3, default: "" },
  ];
  return {
    key: opts.key,
    title: opts.title,
    clauses: opts.clauses,
    fields,
    compute(i) {
      const st = items.map((it) => ({ ...it, s: String(i[it.key] ?? "-") }));
      const count = (s: string) => st.filter((x) => x.s === s).length;
      const pass = count("pass"), fail = count("fail"), na = count("na"), open = count("-");
      const verdict = fail > 0 ? `${opts.notReadyText ?? "NOT ACCEPTED"}: ${fail} item(s) failed`
        : open > 0 ? `INCOMPLETE: ${open} item(s) not checked`
        : `${opts.readyText ?? "ACCEPTED"}: all items pass or N.A.`;
      return {
        results: [
          { label: "Verdict", value: verdict, main: true },
          { label: "Pass", value: pass },
          { label: "Fail", value: fail },
          { label: "N.A.", value: na },
          { label: "Not checked", value: open },
          { label: "Completion", value: `${Math.round(((items.length - open) / items.length) * 100)}%` },
        ],
        checks: [
          { label: "All items checked", ok: open === 0, detail: open ? `${open} of ${items.length} still open` : `${items.length} items checked` },
          ...st.filter((x) => x.s === "fail").map((x) => ({ label: `Failed ${x.no}`, ok: false, detail: x.text })),
        ],
        steps: [
          "Mark every item Pass, Fail or N.A. on site. Do not pre-fill.",
          "Verdict rule: accepted only when no item fails and none is left unchecked.",
          `Counts: ${pass} pass, ${fail} fail, ${na} N.A., ${open} not checked (${items.length} items).`,
          "Failed items: record the corrective action in Remarks, re-inspect, then sign off.",
        ],
        table: {
          columns: ["No.", "Group", "Item", "Status"],
          rows: st.map((x) => [x.no, x.group, x.text, LABEL[x.s] ?? x.s]),
          highlight: st.map((x, k) => (x.s === "fail" ? k : -1)).filter((k) => k >= 0),
        },
      };
    },
  };
}
