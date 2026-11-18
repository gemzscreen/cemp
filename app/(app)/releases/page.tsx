import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Releases" };

export default async function Releases() {
  const supabase = await createClient();
  const { data } = await supabase.from("releases").select("*").order("id", { ascending: false });
  return (
    <>
      <h1>Releases</h1>
      <p className="sub">App versions and the content batch each one shipped.</p>
      <div className="list">
        {(data ?? []).map((r) => (
          <div key={r.id} className="panel release">
            <h3>{r.version} · {r.batch_name}</h3>
            <span className="badge b-published">{r.released_at ? new Date(r.released_at).toLocaleDateString() : "planned"}</span>
            {r.notes_md && <pre>{r.notes_md.replace(/\\n/g, "\n")}</pre>}
          </div>
        ))}
      </div>
    </>
  );
}
