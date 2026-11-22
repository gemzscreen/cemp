import { getDb } from "@/lib/auth";
import { aggregate, showQty } from "@/lib/bom";
import type { EstItem } from "../../../actions";

const cell = (v: unknown) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const line = (...v: unknown[]) => v.map(cell).join(",");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getDb();
  const { data: p } = await supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle();
  if (!p) return new Response("Not found", { status: 404 });
  const items = (p.items ?? []) as EstItem[], prices = (p.prices ?? {}) as Record<string, number>;
  const bom = aggregate(items);
  const rows = [line("CEMP estimate", p.name), line("Client", p.client ?? ""), line("Location", p.location ?? ""), line("Generated", new Date().toISOString()), "",
    line("#", "Material", "Qty", "Unit", "Unit price", "Amount")];
  let total = 0;
  bom.forEach((b, k) => { const q = showQty(b.unit, b.qty), pr = prices[b.key]; const amt = pr != null ? pr * q : ""; if (typeof amt === "number") total += amt; rows.push(line(k + 1, b.name, q, b.unit, pr ?? "", typeof amt === "number" ? amt.toFixed(2) : "")); });
  rows.push(line("", "Total materials", "", "", "", total.toFixed(2)), "", line("ITEMS"), line("#", "Item", "Calculator", "Material", "Qty", "Unit"));
  items.forEach((it, k) => it.materials.forEach((m) => rows.push(line(k + 1, it.label, it.calcKey, m.name, showQty(m.unit, m.qty), m.unit))));
  const name = p.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "estimate";
  return new Response("﻿" + rows.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}-BOM.csv"`, "cache-control": "no-store" } });
}
