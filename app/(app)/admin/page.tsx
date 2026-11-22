import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BATCHES } from "@/content";
import { syncBatch, setApiClientActive } from "./actions";
import ApiKeyForm from "@/components/ApiKeyForm";

export const metadata = { title: "Admin" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  if (me?.role !== "admin") redirect("/");

  const [{ data: releases }, { data: queue }, { data: clients }] = await Promise.all([
    supabase.from("releases").select("version,released_at"),
    supabase.from("entries").select("title,slug,module,status").in("status", ["review", "draft"]).order("module").order("title"),
    supabase.from("api_clients").select("id,name,key_prefix,scopes,active,created_at,last_used_at").order("created_at"),
  ]);
  const synced = new Set((releases ?? []).filter((r) => r.released_at).map((r) => r.version));

  return (
    <>
      <h1>Admin</h1>
      <p className="sub">Content batches live in the repo (<code>content/batches</code>). Sync copies a batch into the database as review drafts. Publishing stays manual, card by card.</p>
      {ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>{ok}</div>}
      {err && <div className="msg err" style={{ marginBottom: "1rem" }}>{err}</div>}

      <section className="panel" style={{ marginBottom: "1.25rem" }}>
        <h2>Content batches</h2>
        <div className="list">
          {BATCHES.map((b) => (
            <div key={b.version} className="row">
              <div>
                <div className="t">{b.version} · {b.batch_name}</div>
                <div className="s">{b.entries.length} entries · {b.clauses.length} clauses · {synced.has(b.version) ? "synced (re-sync updates changed entries)" : "not synced yet"}</div>
              </div>
              <form action={syncBatch}>
                <input type="hidden" name="version" value={b.version} />
                <button className="btn" style={{ width: "auto", marginTop: 0 }}>{synced.has(b.version) ? "Re-sync" : "Sync content"}</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: "1.25rem" }}>
        <h2>Integration API keys</h2>
        <p className="fine" style={{ marginTop: 0 }}>For darkwizscroll, DARKWIZ CT and other apps. The API serves <strong>published</strong> content only. See <Link href="/api-docs">API docs</Link>.</p>
        {(clients ?? []).length > 0 && (
          <div className="list" style={{ marginBottom: ".8rem" }}>
            {(clients ?? []).map((c) => (
              <div key={c.id} className="row">
                <div>
                  <div className="t">{c.name} <code className="muted">{c.key_prefix}…</code></div>
                  <div className="s">scopes: {c.scopes.join(", ")} · created {new Date(c.created_at).toLocaleDateString()} · last used {c.last_used_at ? new Date(c.last_used_at).toLocaleString() : "never"}</div>
                </div>
                <form action={setApiClientActive}>
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={c.active ? "0" : "1"} />
                  <button className={`btn ${c.active ? "ghost" : ""}`} style={{ width: "auto", marginTop: 0 }}>{c.active ? "Revoke" : "Re-activate"}</button>
                </form>
              </div>
            ))}
          </div>
        )}
        <ApiKeyForm />
      </section>

      <section className="panel">
        <h2>Review queue ({queue?.length ?? 0}) <Link href="/admin/review" className="btn ghost" style={{ width: "auto", marginTop: 0, fontSize: ".8rem" }}>Open full queue (filters, bulk publish, diffs)</Link> <Link href="/entry/new" className="btn ghost" style={{ width: "auto", marginTop: 0, fontSize: ".8rem" }}>+ New entry</Link> <Link href="/admin/audit" className="btn ghost" style={{ width: "auto", marginTop: 0, fontSize: ".8rem" }}>Content audit &amp; release gate</Link></h2>
        <p className="fine" style={{ marginTop: 0 }}>Open each item, check it against your code copy, then use “Mark reviewed &amp; publish”.</p>
        <div className="list">
          {(queue ?? []).map((q) => (
            <Link key={q.slug} href={`/entry/${q.slug}`} className="row">
              <div><div className="t">{q.title}</div><div className="s">{q.module}</div></div>
              <span className={`badge b-${q.status}`}>{q.status}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
