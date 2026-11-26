// v2.2.0: project workbook download (Quotation, Cost build-up, BOM) with live formulas.
import { getMe } from "@/lib/auth";
import { CALCS } from "@/lib/calc";
import { normalizeCosting, quoteNo } from "@/lib/costing";
import { normalizeIssuer } from "@/lib/issuer";
import { buildWorkbook } from "@/lib/quote-xlsx";
import type { EstItem } from "../../../actions";

export const runtime = "nodejs";
const manila = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
const long = (iso: string) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, fullName } = await getMe();
  if (!user) return new Response("Sign in", { status: 401 });
  const [{ data: p }, { data: prof }] = await Promise.all([
    supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("issuer").eq("id", user.id).single(),
  ]);
  if (!p) return new Response("Not found", { status: 404 });
  const costing = normalizeCosting(p.costing);
  const issuer = normalizeIssuer(prof?.issuer);
  const date = costing.quote.date || manila(new Date());
  const valid = costing.quote.validity > 0 ? (() => { const t = new Date(`${date}T00:00:00+08:00`); t.setDate(t.getDate() + costing.quote.validity); return long(manila(t)); })() : null;
  const no = costing.quote.no || quoteNo(id);
  const buf = await buildWorkbook({
    project: { id, name: p.name, client: p.client, location: p.location },
    items: (p.items ?? []) as EstItem[], prices: (p.prices ?? {}) as Record<string, number>, costing, issuer,
    signer: issuer.name || fullName || "", quote: { no, dateLong: long(date), validUntilLong: valid },
    calcTitle: (k) => CALCS[k]?.title ?? k,
  });
  const name = p.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "estimate";
  return new Response(new Uint8Array(buf), { headers: {
    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": `attachment; filename="${name}-${no}.xlsx"`, "cache-control": "no-store" } });
}
