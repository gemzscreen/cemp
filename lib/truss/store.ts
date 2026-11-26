// Truss Builder client storage: drafts and local bests in localStorage; runs queued offline and pushed to Supabase.
"use client";
import { createClient } from "@/lib/supabase/client";
import type { Design, Settings } from "./index";

const QKEY = "cemp-game-queue", DKEY = (l: number) => `cemp-truss-draft-${l}`, BKEY = "cemp-truss-bests", SKEY = "cemp-truss-settings";
export type Run = { client_id: string; game: "truss"; level: number; passed: boolean; stars: number; cost: number; weight: number; max_ratio: number; design: Design; created_at: string;
  deck?: string; code?: string; std?: boolean }; // v2.3.0: setting played; std = level default deck + AISC (only std runs set best cost)
export type Best = { stars: number; best_cost: number | null };

const get = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const set = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };

export const loadDraft = (l: number) => get<Design | null>(DKEY(l), null);
export const saveDraft = (l: number, d: Design) => set(DKEY(l), d);
export const clearDraft = (l: number) => { try { localStorage.removeItem(DKEY(l)); } catch {} };

/** v2.3.0: deck and code chosen per level (remembered on this device). */
export const loadSettings = (l: number) => get<Record<number, Settings>>(SKEY, {})[l] ?? null;
export const saveSettings = (l: number, st: Settings) => set(SKEY, { ...get<Record<number, Settings>>(SKEY, {}), [l]: st });

export const localBests = () => get<Record<number, Best>>(BKEY, {});
function bumpBest(r: Run) {
  const b = localBests(), cur = b[r.level] ?? { stars: 0, best_cost: null };
  b[r.level] = { stars: Math.max(cur.stars, r.stars), best_cost: r.passed && r.std !== false ? Math.min(cur.best_cost ?? Infinity, r.cost) : cur.best_cost };
  set(BKEY, b);
}
export function mergeBests(server: { level: number; stars: number; best_cost: number | null }[]) {
  const b = localBests();
  for (const s of server) {
    const cur = b[s.level] ?? { stars: 0, best_cost: null };
    const costs = [cur.best_cost, s.best_cost].filter((x): x is number => x != null);
    b[s.level] = { stars: Math.max(cur.stars, s.stars), best_cost: costs.length ? Math.min(...costs) : null };
  }
  set(BKEY, b);
  return b;
}

export const pending = () => get<Run[]>(QKEY, []).length;

export function recordRun(r: Omit<Run, "client_id" | "created_at" | "game">) {
  const run: Run = { ...r, game: "truss", client_id: (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`), created_at: new Date().toISOString() };
  set(QKEY, [...get<Run[]>(QKEY, []), run].slice(-200));
  bumpBest(run);
  return flush();
}

/** Push queued runs; keeps them if offline or signed out. Returns how many are still waiting. */
export async function flush(): Promise<number> {
  const q = get<Run[]>(QKEY, []);
  if (!q.length || (typeof navigator !== "undefined" && !navigator.onLine)) return q.length;
  try {
    const sb = createClient();
    const { error } = await sb.from("game_runs").upsert(q, { onConflict: "user_id,client_id", ignoreDuplicates: true });
    if (error) return q.length;
    const sent = new Set(q.map((x) => x.client_id));
    set(QKEY, get<Run[]>(QKEY, []).filter((x) => !sent.has(x.client_id)));
    return pending();
  } catch { return q.length; }
}
