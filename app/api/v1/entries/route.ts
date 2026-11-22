import { apiDb, fail, json, keyHash, preflight } from "@/lib/api";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;
const MODULES = ["practice", "tool", "code", "education", "conversion"];

export async function GET(req: Request) {
  const h = keyHash(req);
  if (!h) return fail(req, 401, "Missing API key: send Authorization: Bearer <key>");
  const q = new URL(req.url).searchParams;
  const module = q.get("module");
  if (module && !MODULES.includes(module)) return fail(req, 400, `module must be one of ${MODULES.join(", ")}`);
  const since = q.get("updated_since");
  if (since && Number.isNaN(Date.parse(since))) return fail(req, 400, "updated_since must be an ISO date/time");
  const limit = Math.min(Math.max(Number(q.get("limit") ?? 100) || 100, 1), 500);
  const offset = Math.max(Number(q.get("offset") ?? 0) || 0, 0);
  const { data, error } = await apiDb().rpc("api_entries", {
    p_key_hash: h, p_module: module, p_slug: null, p_updated_since: since, p_limit: limit, p_offset: offset,
  });
  if (error) return error.message.includes("invalid api key") ? fail(req, 403, "Invalid or inactive key") : fail(req, 502, "Query failed");
  const items = (data ?? []) as unknown[];
  return json(req, { count: items.length, limit, offset, next_offset: items.length === limit ? offset + limit : null, items });
}
