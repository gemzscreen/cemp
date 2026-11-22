// Content audit helpers (v1.0.0). Used by scripts/audit.ts (repo) and /admin/audit (database).
import type { Batch, Section } from "@/content/types";
import { CALCS, type Inputs } from "@/lib/calc";
import { validateSections } from "@/lib/sections";

export type Finding = { level: "error" | "warn" | "info"; slug: string; issue: string };

/** Sections carrying verified:false, i.e. data Gemz still has to confirm. */
export const verifyFlags = (sections: Section[] = []) =>
  sections.map((s, k) => (s.verified === false ? `§${k + 1}${s.heading ? ` ${s.heading}` : ""}` : null)).filter(Boolean) as string[];

/** Recompute a stored hand-check with today's calc code; returns mismatching result labels. */
export function handCheckDrift(calcKey: string | null | undefined, hc: { inputs?: Inputs; results?: { label: string; value: unknown }[] } | null | undefined): string[] {
  if (!calcKey || !hc?.inputs || !hc.results) return [];
  const c = CALCS[calcKey];
  if (!c) return [`calculator ${calcKey} no longer exists`];
  let out;
  try { out = c.compute(hc.inputs); } catch { return ["calculation throws on the recorded inputs"]; }
  return hc.results.filter((r) => {
    const now = out.results.find((x) => x.label === r.label);
    return !now || String(now.value) !== String(r.value);
  }).map((r) => `${r.label}: recorded ${String(r.value)}, now ${String(out.results.find((x) => x.label === r.label)?.value ?? "missing")}`);
}

/** Repo-level audit of content batches (no database needed). */
export function auditBatches(batches: Batch[], seededToolSlugs: string[] = []): Finding[] {
  const f: Finding[] = [];
  const toolSlugs = new Set([...seededToolSlugs, ...batches.flatMap((b) => b.entries.filter((e) => e.module === "tool").map((e) => e.slug))]);
  for (const b of batches) for (const e of b.entries) {
    validateSections(e.sections).forEach((m) => f.push({ level: "error", slug: e.slug, issue: m }));
    if ((e.module === "practice" || e.module === "code") && !e.refs.length) f.push({ level: "error", slug: e.slug, issue: "no clause reference (publish gate will refuse)" });
    if (e.module === "tool") {
      const c = e.calc_key ? CALCS[e.calc_key] : undefined;
      if (!c) f.push({ level: "error", slug: e.slug, issue: `unknown calc_key ${e.calc_key}` });
    }
    if (e.module !== "education" && e.module !== "tool" && !e.code_edition && !e.refs.length) f.push({ level: "warn", slug: e.slug, issue: "no code edition stamp" });
    e.sections.forEach((s) => s.problem?.tool && !toolSlugs.has(s.problem.tool) && f.push({ level: "error", slug: e.slug, issue: `problem links to unknown tool ${s.problem.tool}` }));
    verifyFlags(e.sections).forEach((v) => f.push({ level: "warn", slug: e.slug, issue: `verify flag on ${v}` }));
    if (!e.summary) f.push({ level: "info", slug: e.slug, issue: "no summary" });
  }
  return f;
}
