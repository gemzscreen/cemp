import Link from "next/link";
import { getMe } from "@/lib/auth";
import SubmitButton from "@/components/SubmitButton";
import { createProject } from "../actions";

export const metadata = { title: "My estimates" };

export default async function Projects({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await getMe();
  const { data: projects } = await supabase.from("estimate_projects").select("id,name,client,location,items,updated_at").order("updated_at", { ascending: false });
  return (
    <>
      <p className="sub" style={{ marginBottom: ".5rem" }}><Link href="/estimate">← Calculators</Link></p>
      <h1>My estimates</h1>
      <p className="sub">Each project collects calculator results into one bill of materials. Private to you.</p>
      {sp.err && <div className="msg err" style={{ marginBottom: "1rem" }}>{sp.err}</div>}
      {sp.ok && <div className="msg ok" style={{ marginBottom: "1rem" }}>Project deleted.</div>}
      <form action={createProject} className="panel tool-grid" style={{ marginBottom: "1rem", alignItems: "end" }}>
        <label className="fld"><span>New project</span><input name="name" required maxLength={120} placeholder="e.g. Mahilum water tank" /></label>
        <label className="fld"><span>Client</span><input name="client" maxLength={120} /></label>
        <label className="fld"><span>Location</span><input name="location" maxLength={120} /></label>
        <div><SubmitButton style={{ width: "auto", marginTop: 0 }} pending="Creating…">Create project</SubmitButton></div>
      </form>
      {projects?.length ? (
        <div className="list">{projects.map((p) => (
          <Link key={p.id} href={`/estimate/projects/${p.id}`} className="row">
            <div><div className="t">{p.name}</div><div className="s">{[p.client, p.location, `${(p.items as unknown[]).length} item(s)`, `updated ${new Date(p.updated_at).toLocaleDateString()}`].filter(Boolean).join(" · ")}</div></div>
            <span className="badge b-published">BOM</span>
          </Link>))}
        </div>
      ) : <div className="empty"><strong>No projects yet.</strong> Create one above, or add a calculator result to a new project.</div>}
    </>
  );
}
