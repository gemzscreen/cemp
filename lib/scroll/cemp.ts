// v2.6.0: CEMP Practice entries → darkwizscroll cards (CEMP is the source of truth; darkwizscroll only displays).
// Each Practice becomes one "practice" card: summary, Do (safe sections), Avoid, notes, clause refs, optional diagram SVG.
export type PracticeSection = { kind?: string; heading?: string; items?: string[]; text?: string };
export type ScrollPracticeCard = {
  id: string; cat: "cemp"; type: "practice"; slug: string; title: string; summary: string;
  do: string[]; avoid: string[]; note: string | null; refs: string[]; svg: string | null; status: "published" | "review"; ref: string;
};
const clip = (s: unknown, n: number) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t; };

export function toCard(e: { slug: string; title: string; summary: string | null; status: string }, body: { sections?: PracticeSection[] } | null,
  refs: { short: string; section: string }[], svg: string | null): ScrollPracticeCard {
  const secs = body?.sections ?? [];
  const items = (kind: string) => secs.filter((s) => s.kind === kind).flatMap((s) => s.items ?? []).map((x) => clip(x, 140));
  const note = secs.find((s) => s.kind === "text" && s.text && !/^check|^clause numbers|verify/i.test(s.text.trim()))?.text ?? null;
  const refList = [...new Set(refs.map((r) => `${r.short} ${r.section}`.trim()))].slice(0, 4);
  return {
    id: `cemp-${e.slug}`, cat: "cemp", type: "practice", slug: e.slug, title: clip(e.title, 90), summary: clip(e.summary, 240),
    do: items("safe").slice(0, 5), avoid: items("avoid").slice(0, 4), note: note ? clip(note, 220) : null,
    refs: refList, svg, status: e.status === "published" ? "published" : "review", ref: refList[0] ?? "CEMP Practice",
  };
}
