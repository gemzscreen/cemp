import { apiDb, fail, json, keyHash, preflight } from "@/lib/api";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export async function GET(req: Request) {
  const h = keyHash(req);
  if (!h) return fail(req, 401, "Missing API key: send Authorization: Bearer <key>");
  const doc = new URL(req.url).searchParams.get("doc");
  const { data, error } = await apiDb().rpc("api_clauses", { p_key_hash: h, p_doc: doc });
  if (error) return error.message.includes("invalid api key") ? fail(req, 403, "Invalid or inactive key") : fail(req, 502, "Query failed");
  const items = (data ?? []) as unknown[];
  return json(req, { count: items.length, items });
}
