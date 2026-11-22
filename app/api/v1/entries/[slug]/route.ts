import { apiDb, fail, json, keyHash, preflight } from "@/lib/api";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const h = keyHash(req);
  if (!h) return fail(req, 401, "Missing API key: send Authorization: Bearer <key>");
  const { slug } = await params;
  const { data, error } = await apiDb().rpc("api_entries", { p_key_hash: h, p_slug: slug, p_limit: 1 });
  if (error) return error.message.includes("invalid api key") ? fail(req, 403, "Invalid or inactive key") : fail(req, 502, "Query failed");
  const item = ((data ?? []) as unknown[])[0];
  return item ? json(req, item) : fail(req, 404, "No published entry with that slug");
}
