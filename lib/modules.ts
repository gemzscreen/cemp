export type ModuleKind = "code" | "tool" | "conversion" | "practice" | "education";

export const MODULES: {
  slug: string; kind: ModuleKind; name: string; blurb: string; icon: string; batch: string;
}[] = [
  { slug: "tools", kind: "tool", name: "Tools", icon: "ƒ",
    blurb: "Design calculators and inspection checklists, each with step-by-step working and a recorded hand-check.", batch: "v0.3.0" },
  { slug: "practices", kind: "practice", name: "Practices", icon: "◧",
    blurb: "Site practice cards: safe/avoid zones, diagrams, code references.", batch: "v0.2.0" },
  { slug: "codes", kind: "code", name: "Codes", icon: "§",
    blurb: "NSCP, DPWH Blue Book, RA 11058, ACI/AISC: clause index with own-words summaries.", batch: "v0.3.0" },
  { slug: "conversions", kind: "conversion", name: "Conversions", icon: "⇄",
    blurb: "SI ↔ English units, rebar tables, steel sections, material unit weights.", batch: "v0.1.0" },
  { slug: "education", kind: "education", name: "Learn", icon: "✎",
    blurb: "Review decks, worked problems, explainers and PH ↔ abroad comparisons.", batch: "v0.7.0" },
];

export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug);
export const moduleByKind = (kind: string) => MODULES.find((m) => m.kind === kind);

export const APP_VERSION = "v2.7.0";
