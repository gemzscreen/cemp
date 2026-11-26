// v2.6.0: Practice cards for darkwizscroll. Published entries for everyone; ?review=1 adds entries still in review,
// which RLS (entries_read) only returns to editors and the admin. Diagrams are rendered to SVG here (server-only engine).
import { NextResponse } from "next/server";
import { createElement } from "react";
import { getMe } from "@/lib/auth";
import Diagram from "@/components/Diagram";
import type { DiagramSpec } from "@/lib/diagram";
import { toCard, type PracticeSection } from "@/lib/scroll/cemp";

export async function GET(req: Request) {
  const { supabase, user, role } = await getMe();
  if (!user) return NextResponse.json({ code: "unauthenticated" }, { status: 401 });
  const wantReview = new URL(req.url).searchParams.get("review") === "1" && (role === "admin" || role === "editor");
  let q = supabase.from("entries")
    .select("slug,title,summary,status,entry_revisions!entries_current_revision_fk(body,diagram),entry_clause_refs(code_clauses(section_no,code_documents(short_name)))")
    .eq("module", "practice");
  q = wantReview ? q.in("status", ["published", "review"]) : q.eq("status", "published");
  const { data, error } = await q.order("title").limit(300);
  if (error) return NextResponse.json({ code: "unavailable", message: error.message }, { status: 500 });
  const { renderToStaticMarkup } = await import("react-dom/server"); // dynamic: Next disallows a static import here
  const cards = (data ?? []).map((e) => {
    const rev = (Array.isArray(e.entry_revisions) ? e.entry_revisions[0] : e.entry_revisions) as { body?: { sections?: PracticeSection[] }; diagram?: DiagramSpec | null } | null;
    let svg: string | null = null;
    if (rev?.diagram) { try { svg = renderToStaticMarkup(createElement(Diagram, { spec: rev.diagram })); } catch { svg = null; } }
    // embedded rows can come back as an object or a one-element array depending on the relation
    const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
    const refs = ((e.entry_clause_refs ?? []) as unknown as { code_clauses: unknown }[]).map((r) => {
      const cl = one(r.code_clauses as { section_no: string; code_documents: unknown } | null);
      const doc = cl ? one(cl.code_documents as { short_name: string } | null) : null;
      return cl ? { short: doc?.short_name ?? "", section: cl.section_no } : null;
    }).filter((x): x is { short: string; section: string } => !!x);
    return toCard(e, rev?.body ?? null, refs, svg);
  });
  return NextResponse.json({ cards, review: wantReview, canReview: role === "admin" || role === "editor", at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
