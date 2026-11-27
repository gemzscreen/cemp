// Light in-app rate limit for the integration API (v2.9.0).
// Fixed window per client IP, kept in memory of each server instance. It slows scripted key guessing and
// runaway clients; it is NOT a distributed limiter, so pair it with a Vercel WAF rate-limit rule (docs/SECURITY.md).
type Slot = { n: number; reset: number };
const slots = new Map<string, Slot>();
const WINDOW_MS = 60_000;

export const API_LIMIT = 120; // requests / minute / IP
export const API_BAD_LIMIT = 10; // 401/403 responses / minute / IP (key guessing)

export function clientIp(req: Request): string {
  const f = req.headers.get("x-forwarded-for");
  return (f?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

/** Count one hit; returns seconds to wait when over the limit, else 0. */
export function hit(key: string, limit: number, now = Date.now()): number {
  if (slots.size > 5000) for (const [k, s] of slots) if (s.reset <= now) slots.delete(k);
  const s = slots.get(key);
  if (!s || s.reset <= now) { slots.set(key, { n: 1, reset: now + WINDOW_MS }); return 0; }
  s.n += 1;
  return s.n > limit ? Math.ceil((s.reset - now) / 1000) : 0;
}

/** Peek without counting. */
export function blocked(key: string, limit: number, now = Date.now()): number {
  const s = slots.get(key);
  return s && s.reset > now && s.n > limit ? Math.ceil((s.reset - now) / 1000) : 0;
}
