import { redirect } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { getMe } from "@/lib/auth";
import { createEntry } from "../editor-actions";

export const metadata = { title: "New entry" };

export default async function NewEntry({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const { supabase, user, role } = await getMe();
  const me = { role };
  if (me?.role !== "admin" && me?.role !== "editor") redirect("/");
  const { data: specs } = await supabase.from("specializations").select("slug,name,parent_id").not("parent_id", "is", null).order("sort");
  return (
    <>
      <h1>New entry</h1>
      <p className="sub">Creates a draft. You add sections, clause refs and tags in the editor; the admin reviews and publishes. Calculators are added in code (<code>lib/calc</code>), not here.</p>
      {err && <div className="msg err" style={{ marginBottom: "1rem" }}>{err}</div>}
      <form action={createEntry} className="panel tool-grid">
        <label className="fld"><span>Module</span>
          <select name="module" defaultValue="practice"><option value="practice">Practice card</option><option value="code">Code entry</option><option value="education">Education</option></select></label>
        <label className="fld"><span>Specialization</span>
          <select name="specialization">{(specs ?? []).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
        <label className="fld"><span>Title</span><input name="title" required maxLength={140} /></label>
        <label className="fld"><span>Slug <span className="muted">(optional, from title)</span></span><input name="slug" pattern="[a-z0-9-]*" placeholder="e.g. column-splice-zones" /></label>
        <label className="fld"><span>Summary</span><textarea name="summary" rows={2} maxLength={300} /></label>
        <div><SubmitButton style={{ width: "auto" }} pending="Creating…">Create draft &amp; open editor</SubmitButton></div>
      </form>
    </>
  );
}
