import { CALCS, defaults, type Inputs } from "@/lib/calc";
import { toCsv } from "@/lib/export";
import { fail, json, preflight, requireKey, cors } from "@/lib/api";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Ctx = { params: Promise<{ key: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const denied = await requireKey(req, "calc");
  if (denied) return denied;
  const c = CALCS[(await params).key];
  if (!c) return fail(req, 404, "Unknown calculator key");
  const inputs = defaults(c);
  return json(req, { key: c.key, title: c.title, clauses: c.clauses, fields: c.fields, example: { inputs, output: c.compute(inputs) } });
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireKey(req, "calc");
  if (denied) return denied;
  const c = CALCS[(await params).key];
  if (!c) return fail(req, 404, "Unknown calculator key");
  let body: { inputs?: Record<string, unknown> };
  try { body = await req.json(); } catch { return fail(req, 400, "Body must be JSON: {\"inputs\": {...}}"); }
  const given = body?.inputs ?? {};
  const unknownKeys = Object.keys(given).filter((k) => !c.fields.some((f) => f.key === k));
  if (unknownKeys.length) return fail(req, 400, `Unknown input(s): ${unknownKeys.join(", ")}`);
  const inputs: Inputs = { ...defaults(c) };
  for (const f of c.fields) {
    if (!(f.key in given)) continue;
    const v = given[f.key];
    if (f.type === "number") {
      const num = Number(v);
      if (!Number.isFinite(num)) return fail(req, 400, `${f.key} must be a number`);
      inputs[f.key] = num;
    } else if (f.type === "select") {
      if (!f.options.some((o) => o.value === String(v))) return fail(req, 400, `${f.key} must be one of ${f.options.map((o) => o.value).join(", ")}`);
      inputs[f.key] = String(v);
    } else inputs[f.key] = String(v).slice(0, 20000);
  }
  let output;
  try { output = c.compute(inputs); } catch { return fail(req, 422, "Calculation failed for these inputs"); }
  if (new URL(req.url).searchParams.get("format") === "csv") {
    return new Response(toCsv(c, inputs, output, { source: "CEMP API v1" }), { headers: {
      "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${c.key}.csv"`, "cache-control": "no-store", ...cors(req) } });
  }
  return json(req, { key: c.key, inputs, output });
}
