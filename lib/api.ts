// Integration API helpers (v0.8.0). Route handlers live in app/api/v1.
// Clients send `Authorization: Bearer <key>` (or `x-api-key`). Only the SHA-256 hash is sent to the DB.
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { API_BAD_LIMIT, blocked, clientIp, hit } from "@/lib/ratelimit";

export const API_VERSION = "v1";
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newApiKey = () => `cemp_${randomBytes(32).toString("base64url")}`;

/** Stateless anon client: the API functions check the key themselves and return published content only. */
export function apiDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const badKey = (req: Request) => `bad:${clientIp(req)}`;

export function keyHash(req: Request): string | null {
  if (blocked(badKey(req), API_BAD_LIMIT)) return null; // too many failed attempts: don't even query the database
  const auth = req.headers.get("authorization");
  const k = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : req.headers.get("x-api-key")?.trim();
  return k && k.length >= 20 ? sha256(k) : null;
}

/** CORS only for origins listed in CEMP_API_CORS_ORIGINS (comma-separated). Server-to-server calls need none. */
export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = (process.env.CEMP_API_CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS", Vary: "Origin" };
}

export function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors(req), ...extra },
  });
}
/** 401/403 count as failed key attempts; past the limit the client gets 429 (see lib/ratelimit.ts). */
export function fail(req: Request, status: number, error: string) {
  if (status === 401 || status === 403) {
    const wait = blocked(badKey(req), API_BAD_LIMIT);
    if (wait) return json(req, { error: "Too many failed attempts" }, 429, { "retry-after": String(wait) });
    hit(badKey(req), API_BAD_LIMIT);
  }
  return json(req, { error }, status);
}
export const preflight = (req: Request) => new Response(null, { status: 204, headers: cors(req) });

/** Validate a key for a scope; returns an error Response or null when OK. */
export async function requireKey(req: Request, scope: "content" | "calc"): Promise<Response | null> {
  const h = keyHash(req);
  if (!h) return fail(req, 401, "Missing API key: send Authorization: Bearer <key>");
  const { data, error } = await apiDb().rpc("api_check", { p_key_hash: h, p_scope: scope });
  if (error) return fail(req, 502, "Key check failed");
  return data ? null : fail(req, 403, `Invalid or inactive key, or key lacks the "${scope}" scope`);
}
