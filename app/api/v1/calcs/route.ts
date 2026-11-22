import { CALCS, defaults } from "@/lib/calc";
import { json, preflight, requireKey } from "@/lib/api";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export async function GET(req: Request) {
  const denied = await requireKey(req, "calc");
  if (denied) return denied;
  const items = Object.values(CALCS).map((c) => ({
    key: c.key, title: c.title, clauses: c.clauses, kind: c.key.startsWith("checklist-") ? "checklist" : "calculator",
    fields: c.fields, defaults: defaults(c),
  }));
  return json(req, { count: items.length, items });
}
