import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { moduleByKind } from "@/lib/modules";

export const metadata = { title: "Saved" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? "";
  const [{ data: bms }, { data: notes }] = await Promise.all([
    supabase.from("bookmarks").select("created_at, entries(slug,title,module,summary,status)").eq("user_id", uid).order("created_at", { ascending: false }),
    supabase.from("user_notes").select("id,body,updated_at, entries(slug,title)").eq("user_id", uid).order("updated_at", { ascending: false }),
  ]);
  return (
    <>
      <h1>Saved</h1>
      <p className="sub">Your bookmarks and private notes. Only you can see them.</p>
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Bookmarks ({bms?.length ?? 0})</h2>
        {bms?.length ? (
          <div className="list">
            {bms.map((b, i) => { const e = one(b.entries as any) as any; return e && (
              <Link key={i} href={`/entry/${e.slug}`} className="row">
                <div><div className="t">{e.title}</div><div className="s">{[moduleByKind(e.module)?.name, e.summary].filter(Boolean).join(" · ")}</div></div>
                <span className={`badge b-${e.status}`}>{e.status}</span>
              </Link>); })}
          </div>
        ) : <p className="fine">Nothing saved yet. Use “☆ Save to my list” on any entry.</p>}
      </section>
      <section className="panel">
        <h2>Notes ({notes?.length ?? 0})</h2>
        {notes?.length ? (
          <ul className="notes">
            {notes.map((nt) => { const e = one(nt.entries as any) as any; return (
              <li key={nt.id}><Link href={`/entry/${e?.slug}`}><strong>{e?.title}</strong></Link>: <span style={{ whiteSpace: "pre-wrap" }}>{nt.body}</span> <span className="fine">· {new Date(nt.updated_at).toLocaleDateString()}</span></li>); })}
          </ul>
        ) : <p className="fine">No notes yet. Add them at the bottom of any entry.</p>}
      </section>
    </>
  );
}
