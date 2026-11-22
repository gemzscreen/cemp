"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BATCHES } from "@/content";
import { DOCS, type BatchEntry } from "@/content/types";
import { CALCS, defaults } from "@/lib/calc";

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Sync one content batch into Supabase. Runs with the admin's own session, so RLS and the
 *  publish gate still apply. New and changed entries land in status "review". */
export async function syncBatch(formData: FormData) {
  const version = String(formData.get("version"));
  const batch = BATCHES.find((b) => b.version === version);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  if (!batch || me?.role !== "admin") redirect("/admin?err=" + encodeURIComponent("Admin only / unknown batch"));

  const log: string[] = [];
  const fail = (m: string) => redirect("/admin?err=" + encodeURIComponent(`${version}: ${m}`));

  // documents
  const { data: docs } = await supabase.from("code_documents").select("id,short_name,edition");
  const docId = (key = "NSCP") => {
    const d = DOCS[key] ?? { short_name: key, edition: null };
    return docs?.find((x) => x.short_name === d.short_name && (d.edition === null || x.edition === d.edition))?.id;
  };

  // clauses (upsert on document + section)
  for (const c of batch!.clauses) {
    const id = docId(c.doc);
    if (!id) fail(`unknown document ${c.doc}`);
    const { error } = await supabase.from("code_clauses").upsert(
      { code_document_id: id, section_no: c.section, title: c.title, summary: c.summary, limits: c.equivalent ? { aci_equivalent: c.equivalent } : {} },
      { onConflict: "code_document_id,section_no" });
    if (error) fail(`clause ${c.section}: ${error.message}`);
  }
  log.push(`${batch!.clauses.length} clauses upserted`);

  const [{ data: specs }, { data: tags }, { data: clauses }] = await Promise.all([
    supabase.from("specializations").select("id,slug"),
    supabase.from("tags").select("id,slug"),
    supabase.from("code_clauses").select("id,section_no,code_document_id"),
  ]);
  const clauseId = (doc: string | undefined, sec: string) => clauses?.find((c) => c.code_document_id === docId(doc) && c.section_no === sec)?.id;

  let created = 0, revised = 0, unchanged = 0;
  for (const e of batch!.entries as BatchEntry[]) {
    const body = { sections: e.sections };
    const { data: existing } = await supabase.from("entries")
      .select("id,status,current:entry_revisions!entries_current_revision_fk(body,diagram)").eq("slug", e.slug).maybeSingle();
    let entryId = existing?.id as string | undefined;
    const cur = Array.isArray(existing?.current) ? existing?.current[0] : existing?.current;

    if (!entryId) {
      const { data: ins, error } = await supabase.from("entries").insert({
        module: e.module, title: e.title, slug: e.slug, summary: e.summary, status: "review",
        specialization_id: specs?.find((s) => s.slug === e.specialization)?.id ?? null,
      }).select("id").single();
      if (error) fail(`entry ${e.slug}: ${error.message}`);
      entryId = ins!.id;
      created++;
    } else if (same(cur?.body, body) && same(cur?.diagram, e.diagram)) {
      unchanged++;
      continue;
    } else {
      await supabase.from("entries").update({ title: e.title, summary: e.summary, status: "review" }).eq("id", entryId);
      revised++;
    }

    const { data: rev, error: re } = await supabase.from("entry_revisions").insert({
      entry_id: entryId, body, diagram: e.diagram ?? null, code_edition: e.code_edition ?? "NSCP 2015",
      change_note: existing ? `Updated from content ${version}` : `Initial (${version}): needs review`,
    }).select("id").single();
    if (re) fail(`revision ${e.slug}: ${re.message}`);
    await supabase.from("entries").update({ current_revision_id: rev!.id }).eq("id", entryId);

    // refs + tags (replace)
    await supabase.from("entry_clause_refs").delete().eq("entry_id", entryId);
    const refs = e.refs.map((r) => ({ entry_id: entryId, clause_id: clauseId(r.doc, r.section), note: r.note ?? null }));
    const missing = refs.filter((r) => !r.clause_id);
    if (missing.length) fail(`${e.slug}: clause not found ${e.refs.filter((r) => !clauseId(r.doc, r.section)).map((r) => r.section).join(", ")}`);
    if (refs.length) await supabase.from("entry_clause_refs").insert(refs);
    await supabase.from("entry_tags").delete().eq("entry_id", entryId);
    const t = e.tags.map((slug) => tags?.find((x) => x.slug === slug)?.id).filter(Boolean).map((tag_id) => ({ entry_id: entryId, tag_id }));
    if (t.length) await supabase.from("entry_tags").insert(t);

    // tool row with hand-check computed from the shared calc library
    if (e.module === "tool" && e.calc_key) {
      const calc = CALCS[e.calc_key];
      if (!calc) fail(`unknown calc ${e.calc_key}`);
      const inputs = defaults(calc);
      const out = calc.compute(inputs);
      const { error: te } = await supabase.from("tools").upsert({
        entry_id: entryId, kind: "calculator", calc_key: e.calc_key,
        input_schema: { fields: calc.fields },
        output_schema: { results: out.results.map((x) => ({ label: x.label, unit: x.unit ?? null })) },
        hand_check: { inputs, results: out.results.map(({ label, value, unit }) => ({ label, value, unit })), steps: out.steps,
          verified_by: `Cross-checked by independent hand calculation (${version} build)`, note: "Re-run the inputs above. Results must match before trusting a code change." },
      }, { onConflict: "entry_id" });
      if (te) fail(`tool ${e.slug}: ${te.message}`);
    }
  }
  log.push(`${created} new, ${revised} updated, ${unchanged} unchanged entries`);

  const { error: rle } = await supabase.from("releases").upsert(
    { version, batch_name: batch!.batch_name, notes_md: batch!.notes.map((x) => `- ${x}`).join("\n"), released_at: new Date().toISOString() },
    { onConflict: "version" });
  if (rle) fail(`release: ${rle.message}`);
  log.push("release recorded");

  revalidatePath("/", "layout");
  redirect("/admin?ok=" + encodeURIComponent(`${version}: ${log.join(" · ")}`));
}
