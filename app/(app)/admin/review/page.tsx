import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES, moduleByKind } from "@/lib/modules";
import { bulkAction } from "./actions";

export const metadata = { title: "Review queue" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function ReviewQueue({ searchParams }: { searchParams: Promise<{ module?: string; status?: string; source?: string; q?: string; ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  if (me?.role !== "admin" && me?.role !== "editor") redirect("/");
  const isAdmin = me?.role === "admin";
  const status = sp.status && ["draft", "review", "published", "deprecated"].includes(sp.status) ? sp.status : null;

  let q = supabase.from("entries")
    .select("slug,title,module,status,updated_at, current:entry_revisions!entries_current_revision_fk(rev_no,source,change_note), entry_clause_refs(clause_id), tools(hand_check)")
    .order("module").order("title");
  q = status ? q.eq("status", status) : q.in("status", ["review", "draft"]);
  if (sp.module) q = q.eq("module", sp.module);
  if (sp.q) q = q.ilike("title", `%${sp.q.replace(/[%_]/g, " ")}%`);
  const { data } = await q;
  const rows = (data ?? []).map((e: any) => {
    const cur = one(e.current) as any;
    const tool = one(e.tools) as any;
    const gate = e.module === "tool" ? (tool?.hand_check ? "" : "no hand-check")
      : ["practice", "code"].includes(e.module) && !(e.entry_clause_refs ?? []).length ? "no clause ref" : "";
    return { ...e, cur, gate };
  }).filter((e) => !sp.source || e.cur?.source === sp.source);
  const back = `/admin/review?${new URLSearchParams(Object.entries({ module: sp.module ?? "", status: sp.status ?? "", source: sp.source ?? "", q: sp.q ?? "" }).filter(([, v]) => v)).toString()}`;

  return (
    <>
      <p className="sub" style={{ marginBottom: ".5rem" }}><Link href="/admin">← Admin</Link></p>
      <h1>Review queue</h1>
      <p className="sub">Open an entry, compare it with your code copy (History shows what changed), then publish. Bulk publish still runs every entry through the publish gate.</p>
      {sp.ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>{sp.ok}</div>}
      {sp.err && <div className="msg err" style={{ marginBottom: "1rem" }}>{sp.err}</div>}

      <form className="panel filters" style={{ marginBottom: "1rem" }}>
        <select name="module" defaultValue={sp.module ?? ""}><option value="">All modules</option>{MODULES.map((m) => <option key={m.kind} value={m.kind}>{m.name}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""}><option value="">Review + draft</option><option value="review">Review</option><option value="draft">Draft</option><option value="published">Published</option></select>
        <select name="source" defaultValue={sp.source ?? ""}><option value="">Any source</option><option value="batch">From batch</option><option value="app">Edited in app</option></select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Title contains…" />
        <button className="btn ghost" style={{ width: "auto", marginTop: 0 }}>Filter</button>
      </form>

      <form action={bulkAction} className="panel">
        <input type="hidden" name="back" value={back} />
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".6rem" }}>
          {isAdmin && <button name="action" value="publish" className="btn" style={{ width: "auto", marginTop: 0 }}>✓ Mark reviewed &amp; publish selected</button>}
          <button name="action" value="to-review" className="btn ghost" style={{ width: "auto", marginTop: 0 }}>Send drafts to review</button>
          {isAdmin && <button name="action" value="to-draft" className="btn ghost" style={{ width: "auto", marginTop: 0 }}>Back to draft</button>}
          <span className="fine" style={{ alignSelf: "center" }}>{rows.length} entries</span>
        </div>
        <div className="tbl-wrap"><table className="tbl compact">
          <thead><tr><th></th><th>Entry</th><th>Module</th><th>Status</th><th>Rev / source</th><th>Last change</th><th>Gate</th></tr></thead>
          <tbody>{rows.map((e) => (
            <tr key={e.slug}>
              <td><input type="checkbox" name="slug" value={e.slug} disabled={!!e.gate && isAdmin && e.status !== "draft"} /></td>
              <td><Link href={`/entry/${e.slug}`}>{e.title}</Link> <Link href={`/entry/${e.slug}/history`} className="fine">diff</Link></td>
              <td>{moduleByKind(e.module)?.name}</td>
              <td><span className={`badge b-${e.status}`}>{e.status}</span></td>
              <td>{e.cur?.rev_no ?? "–"} · {e.cur?.source ?? "–"}</td>
              <td className="fine">{e.cur?.change_note ?? ""}</td>
              <td>{e.gate ? <span className="badge b-review">{e.gate}</span> : "ok"}</td>
            </tr>))}
          </tbody>
        </table></div>
      </form>
    </>
  );
}
