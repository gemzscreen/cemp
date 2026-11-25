import { getDb } from "@/lib/auth";
import { aggregate, groupByItem, showQty } from "@/lib/bom";
import { CALCS } from "@/lib/calc";
import type { EstItem } from "../../../actions";

const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const line = (...v: unknown[]) => v.map(cell).join(",");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getDb();
  const { data: p } = await supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle();
  if (!p) return new Response("Not found", { status: 404 });
  const items = (p.items ?? []) as EstItem[], prices = (p.prices ?? {}) as Record<string, number>;
  const rows = [line("CEMP estimate", p.name), line("Client", p.client ?? ""), line("Location", p.location ?? ""), line("Generated", new Date().toISOString()), "",
    line("BILL OF MATERIALS BY ITEM"), line("#", "Material", "Qty", "Unit", "Unit price", "Amount")];
  let total = 0;
  for (const g of groupByItem(items)) {
    rows.push(line(g.no, `${g.label} (${CALCS[g.calcKey]?.title ?? g.calcKey})`));
    let sub = 0;
    g.lines.forEach((l, li) => { const pr = prices[l.key]; const amt = pr != null ? pr * l.show : null; if (amt != null) sub += amt; rows.push(line(`${g.no}.${li + 1}`, l.name, l.show, l.unit, pr ?? "", amt != null ? amt.toFixed(2) : "")); });
    rows.push(line("", `Subtotal, ${g.label}`, "", "", "", sub.toFixed(2)));
    total += sub;
  }
  rows.push(line("", "Total materials", "", "", "", total.toFixed(2)), "", line("COMBINED BY MATERIAL (purchase list)"), line("#", "Material", "Qty", "Unit", "Unit price", "Amount"));
  aggregate(items).forEach((b, k) => { const q = showQty(b.unit, b.qty), pr = prices[b.key]; rows.push(line(k + 1, b.name, q, b.unit, pr ?? "", pr != null ? (pr * q).toFixed(2) : "")); });
  const name = p.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "estimate";
  return new Response("﻿" + rows.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}-BOM.csv"`, "cache-control": "no-store" } });
}
