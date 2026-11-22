// Section helpers shared by the in-app editor, the content validator and revision diffs (v0.9.0).
import type { Section } from "@/content/types";

export const KINDS: Section["kind"][] = ["text", "list", "safe", "avoid", "table", "cards", "problem"];

/** Returns human-readable problems; empty array = valid. */
export function validateSections(sections: unknown): string[] {
  const errs: string[] = [];
  if (!Array.isArray(sections)) return ["Sections must be a list"];
  sections.forEach((s: any, k) => {
    const at = `Section ${k + 1}`;
    if (!s || typeof s !== "object") { errs.push(`${at}: not an object`); return; }
    if (!KINDS.includes(s.kind)) errs.push(`${at}: unknown kind "${s.kind}"`);
    if (s.items && (!Array.isArray(s.items) || s.items.some((x: unknown) => typeof x !== "string"))) errs.push(`${at}: items must be text lines`);
    if (["list", "safe", "avoid"].includes(s.kind) && !(s.items?.length || s.text)) errs.push(`${at}: add at least one item`);
    if (s.kind === "text" && !s.text) errs.push(`${at}: text is empty`);
    if (s.kind === "table") {
      if (!s.columns?.length) errs.push(`${at}: table needs columns`);
      else (s.rows ?? []).forEach((r: string[], i: number) => r.length !== s.columns.length && errs.push(`${at}: row ${i + 1} has ${r.length} cells, expected ${s.columns.length}`));
    }
    if (s.kind === "cards" && (!s.cards?.length || s.cards.some((c: any) => !c?.q || !c?.a))) errs.push(`${at}: every card needs a question and an answer`);
    if (s.kind === "problem" && (!s.problem?.statement || !s.problem?.answer?.length)) errs.push(`${at}: problem needs a statement and an answer`);
  });
  return errs;
}

/** Flatten a revision to comparable text lines (used by the diff view). */
export function sectionsToLines(body: { sections?: Section[] } | null, diagram?: unknown): string[] {
  const out: string[] = [];
  (body?.sections ?? []).forEach((s, k) => {
    out.push(`## [${k + 1}] ${s.kind.toUpperCase()}${s.heading ? `: ${s.heading}` : ""}${s.verified === false ? " (verify)" : ""}`);
    if (s.text) out.push(s.text);
    s.items?.forEach((x) => out.push(`- ${x}`));
    if (s.columns) out.push(`| ${s.columns.join(" | ")} |`);
    s.rows?.forEach((r) => out.push(`| ${r.join(" | ")} |`));
    s.cards?.forEach((c) => out.push(`Q: ${c.q}  ⇒  A: ${c.a}`));
    if (s.problem) {
      out.push(`Problem: ${s.problem.statement}`);
      s.problem.given.forEach((g) => out.push(`  given: ${g}`));
      out.push(`  find: ${s.problem.find}`);
      s.problem.answer.forEach((a) => out.push(`  answer: ${a}`));
    }
  });
  if (diagram) out.push("## DIAGRAM", ...JSON.stringify(diagram, null, 1).split("\n"));
  return out;
}

export type DiffOp = { op: "same" | "add" | "del"; text: string };
/** Line diff via LCS (fine for entry-sized texts: a few hundred lines). */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ op: "same", text: a[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) ops.push({ op: "del", text: a[i++] });
    else ops.push({ op: "add", text: b[j++] });
  }
  while (i < n) ops.push({ op: "del", text: a[i++] });
  while (j < m) ops.push({ op: "add", text: b[j++] });
  return ops;
}
