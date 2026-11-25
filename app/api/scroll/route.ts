// Darkwiz Scroll shared store (v2.1.0). Backs the window.claude.use("db"/"user") shim in content/scroll/darkwizscroll.html.
// Session-authenticated (middleware sends signed-out requests to /login); RLS on scroll_docs does the real guarding.
import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";

const COLLECTIONS = ["cards", "votes", "ideas"] as const;
type Coll = (typeof COLLECTIONS)[number];
const isColl = (c: unknown): c is Coll => typeof c === "string" && (COLLECTIONS as readonly string[]).includes(c);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(req: Request) {
  const { supabase, user, role } = await getMe();
  if (!user) return json({ code: "unauthenticated" }, 401);
  const url = new URL(req.url);
  if (url.searchParams.has("me")) {
    return json({ uid: user.id, isOwner: role === "admin", canEdit: role === "admin" || role === "editor", canWrite: true });
  }
  const c = url.searchParams.get("c"), id = url.searchParams.get("id");
  if (!isColl(c)) return json({ code: "invalid_argument" }, 400);
  let q = supabase.from("scroll_docs").select("doc_id,data").eq("collection", c);
  if (id) { if (!UUID.test(id)) return json({ code: "invalid_argument" }, 400); q = q.eq("doc_id", id); }
  const { data, error } = await q.limit(1000);
  if (error) return json({ code: "unavailable", message: error.message }, 500);
  return json({ docs: (data ?? []).map((d) => ({ id: d.doc_id, data: d.data })) });
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getMe();
  if (!user) return json({ code: "unauthenticated" }, 401);
  let body: { op?: string; c?: unknown; id?: unknown; data?: unknown; ids?: unknown };
  try { body = await req.json(); } catch { return json({ code: "invalid_argument" }, 400); }

  if (body.op === "names") {
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 200) : [];
    if (!ids.length) return json({ names: {} });
    const { data } = await supabase.rpc("scroll_names", { p_ids: ids });
    const names: Record<string, { name: string }> = {};
    for (const r of (data ?? []) as { id: string; name: string }[]) names[r.id] = { name: r.name };
    return json({ names });
  }

  if (body.op === "set") {
    const { c, id, data } = body;
    if (!isColl(c) || typeof id !== "string" || !UUID.test(id) || !data || typeof data !== "object" || Array.isArray(data)) return json({ code: "invalid_argument" }, 400);
    if (id !== user.id && !(c === "cards" && role === "admin")) return json({ code: "invalid_argument" }, 403);
    if (JSON.stringify(data).length > 150_000) return json({ code: "quota_exceeded" }, 413);
    const { error } = id === user.id
      ? await supabase.from("scroll_docs").upsert({ collection: c, doc_id: id, data }, { onConflict: "collection,doc_id" })
      : await supabase.from("scroll_docs").update({ data }).eq("collection", c).eq("doc_id", id);
    if (error) return json({ code: /row-level security|violates/i.test(error.message) ? "invalid_argument" : "unavailable", message: error.message }, 400);
    return json({ ok: true });
  }
  return json({ code: "invalid_argument" }, 400);
}
