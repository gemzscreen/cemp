import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { BATCHES } from "@/content";
import { APP_VERSION } from "@/lib/modules";
import { handCheckDrift, verifyFlags, type Finding } from "@/lib/audit";

export const metadata = { title: "Content audit" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export default async function AuditPage() {
  const { supabase, user, role } = await getMe();
  const me = { role };
  if (me?.role !== "admin") redirect("/");

  const [{ data: entries }, { data: releases }, { data: refTables }, { data: tombs }] = await Promise.all([
    supabase.from("entries").select(`slug,title,module,status,
      current:entry_revisions!entries_current_revision_fk(rev_no,body,reviewed_by,source,code_edition),
      entry_clause_refs(clause_id), tools(calc_key,hand_check)`).order("module").order("slug"),
    supabase.from("releases").select("version,released_at"),
    supabase.from("ref_tables").select("slug,name,data"),
    supabase.from("entry_tombstones").select("slug"),
  ]);
  const tombstoned = new Set((tombs ?? []).map((t) => t.slug));
  const rows = (entries ?? []) as any[];
  const bySlug = new Map(rows.map((e) => [e.slug, e]));
  const batchEntry = new Map(BATCHES.flatMap((b) => b.entries.map((e) => [e.slug, { e, v: b.version }] as const)));
  const synced = new Set((releases ?? []).filter((r) => r.released_at).map((r) => r.version));

  const blockers: Finding[] = [], warnings: Finding[] = [];
  for (const b of BATCHES) if (!synced.has(b.version)) blockers.push({ level: "error", slug: b.version, issue: "content batch not synced yet" });
  for (const [slug, { v }] of batchEntry) if (!bySlug.has(slug) && synced.has(v) && !tombstoned.has(slug)) blockers.push({ level: "error", slug, issue: `in batch ${v} but missing from the database (re-sync)` });
  for (const e of rows) {
    const cur = one(e.current) as any, tool = one(e.tools) as any;
    if (e.status !== "published" && e.status !== "deprecated") blockers.push({ level: "error", slug: e.slug, issue: `status ${e.status}: review and publish, or deprecate` });
    if (e.status === "published" && !cur?.reviewed_by) blockers.push({ level: "error", slug: e.slug, issue: "published but current revision not reviewed" });
    if (["practice", "code"].includes(e.module) && !(e.entry_clause_refs ?? []).length) blockers.push({ level: "error", slug: e.slug, issue: "no clause reference" });
    if (e.module === "tool") {
      if (!tool?.hand_check) blockers.push({ level: "error", slug: e.slug, issue: "no recorded hand-check" });
      handCheckDrift(tool?.calc_key, tool?.hand_check).forEach((d) => blockers.push({ level: "error", slug: e.slug, issue: `hand-check drift: ${d} (re-sync the batch or re-record)` }));
    }
    (cur?.body?.sections ?? []).forEach((s: any) => s?.problem?.tool && bySlug.get(s.problem.tool)?.status !== "published" && e.status === "published"
      && blockers.push({ level: "error", slug: e.slug, issue: `worked problem links to ${s.problem.tool}, which is not published` }));
    verifyFlags(cur?.body?.sections).forEach((v) => warnings.push({ level: "warn", slug: e.slug, issue: `verify flag on ${v}: confirm and clear it in the editor, or keep it as a documented limitation` }));
    const be = batchEntry.get(e.slug);
    if (cur?.source === "app" && be && !same(cur.body, { sections: be.e.sections }))
      warnings.push({ level: "warn", slug: e.slug, issue: `edited in app (rev ${cur.rev_no}): copy the change into content/batches/${be.v.replace(/\./g, "_")}.ts so the repo stays the source of truth` });
    if (!["education", "tool"].includes(e.module) && !cur?.code_edition) warnings.push({ level: "warn", slug: e.slug, issue: "no code edition stamp" });
  }
  (refTables ?? []).forEach((t: any) => t.data?.verified === false && warnings.push({ level: "warn", slug: `table: ${t.slug}`, issue: `reference table "${t.name}" is flagged verify` }));

  const published = rows.filter((e) => e.status === "published").length;
  const ready = blockers.length === 0;
  const Row = ({ f }: { f: Finding }) => (
    <tr><td>{f.slug.startsWith("v") && f.slug.includes(".") && !f.slug.includes("-") ? <code>{f.slug}</code> : f.slug.startsWith("table:") ? f.slug : <Link href={`/entry/${f.slug}`}>{bySlug.get(f.slug)?.title ?? f.slug}</Link>}</td><td>{f.issue}</td></tr>
  );

  return (
    <>
      <p className="sub" style={{ marginBottom: ".5rem" }}><Link href="/admin">← Admin</Link></p>
      <h1>Content audit &amp; v1.0.0 release gate</h1>
      <p className="sub">Running {APP_VERSION}. Checks the live database against the content batches in the repo. Blockers must be zero before tagging v1.0.0; warnings are reviewed and either fixed or accepted.</p>

      <div className={`panel gate ${ready ? "ok" : "bad"}`} style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>{ready ? "✓ Ready for v1.0.0" : `✕ Not ready: ${blockers.length} blocker(s)`}</h2>
        <p className="fine" style={{ margin: ".3rem 0 0" }}>
          {rows.length} entries · {published} published · {rows.length - published} not published · batches synced {BATCHES.filter((b) => synced.has(b.version)).length}/{BATCHES.length} · {warnings.length} warning(s)
        </p>
        {ready && <p className="fine" style={{ marginBottom: 0 }}>Next: set <code>APP_VERSION = &quot;v1.0.0&quot;</code> in <code>lib/modules.ts</code> and <code>version</code> in package.json, add the CHANGELOG entry, push.</p>}
      </div>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Blockers ({blockers.length})</h2>
        {blockers.length ? <div className="tbl-wrap"><table className="tbl compact"><thead><tr><th>Item</th><th>Issue</th></tr></thead>
          <tbody>{blockers.map((f, i) => <Row key={i} f={f} />)}</tbody></table></div> : <p className="fine">None.</p>}
        {blockers.some((b) => b.issue.startsWith("status")) && <p className="fine">Tip: use the <Link href="/admin/review">review queue</Link> for bulk review &amp; publish.</p>}
      </section>
      <section className="panel">
        <h2>Warnings ({warnings.length})</h2>
        {warnings.length ? <div className="tbl-wrap"><table className="tbl compact"><thead><tr><th>Item</th><th>Issue</th></tr></thead>
          <tbody>{warnings.map((f, i) => <Row key={i} f={f} />)}</tbody></table></div> : <p className="fine">None.</p>}
      </section>
    </>
  );
}
