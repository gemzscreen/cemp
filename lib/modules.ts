export type ModuleKind = "code" | "tool" | "conversion" | "practice" | "education";

export const MODULES: {
  slug: string; kind: ModuleKind; name: string; blurb: string; icon: string; batch: string;
}[] = [
  { slug: "codes", kind: "code", name: "Codes", icon: "§",
    blurb: "NSCP, NBCP, DPWH Blue Book, ACI, AISC, safety laws: clause index with your own summaries.", batch: "v0.3.0" },
  { slug: "tools", kind: "tool", name: "Tools", icon: "ƒ",
    blurb: "Calculators, Excel templates and checklists, each tied to a code clause and a hand-check.", batch: "v0.3.0" },
  { slug: "conversions", kind: "conversion", name: "Conversions", icon: "⇄",
    blurb: "SI ↔ English units, rebar tables, steel sections, material unit weights.", batch: "v0.1.0" },
  { slug: "practices", kind: "practice", name: "Practices", icon: "◧",
    blurb: "Site practice cards: safe/avoid zones, diagrams, code refs, checklists.", batch: "v0.2.0" },
  { slug: "education", kind: "education", name: "Education", icon: "✎",
    blurb: "CELE outlines, flashcards and PH ↔ global code comparisons.", batch: "v0.7.0" },
];

export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug);
export const moduleByKind = (kind: string) => MODULES.find((m) => m.kind === kind);

export const APP_VERSION = "v0.7.0";
