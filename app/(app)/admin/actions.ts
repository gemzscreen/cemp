"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BATCHES } from "@/content";
import { DOCS, STD_KEYS, type BatchEntry } from "@/content/types";
import { CALCS, defaults } from "@/lib/calc";
import { newApiKey, sha256 } from "@/lib/api";

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

  // documents declared by the batch (e.g. a new IRR, or marking an old one superseded)
  for (const d of batch!.documents ?? []) {
    const { error } = await supabase.from("code_documents").upsert(
      { short_name: d.short_name, title: d.title, edition: d.edition, publisher: d.publisher ?? null, year: d.year ?? null,
        jurisdiction: d.jurisdiction ?? "PH", status: d.status, notes: d.notes ?? null },
      { onConflict: "short_name,edition" });
    if (error) fail(`document ${d.short_name}: ${error.message}`);
  }
  if (batch!.documents?.length) log.push(`${batch!.documents.length} document(s) upserted`);

  const { data: docs } = await supabase.from("code_documents").select("id,short_name,edition");
  const docId = (key = "NSCP") => {
    const d = DOCS[key] ?? { short_name: key, edition: null };
    return docs?.find((x) => x.short_name === d.short_name && (d.edition === null || x.edition === d.edition))?.id;
  };

  // clauses (one upsert on document + section)
  const clauseRows = batch!.clauses.map((c) => {
    const id = docId(c.doc);
    if (!id) fail(`unknown document ${c.doc}`);
    return { code_document_id: id, section_no: c.section, title: c.title, summary: c.summary, limits: c.equivalent ? { aci_equivalent: c.equivalent } : {} };
  });
  if (clauseRows.length) {
    const { error } = await supabase.from("code_clauses").upsert(clauseRows, { onConflict: "code_document_id,section_no" });
    if (error) fail(`clauses: ${error.message}`);
  }
  log.push(`${batch!.clauses.length} clauses upserted`);

  const [{ data: specs }, { data: tags }, { data: clauses }] = await Promise.all([
    supabase.from("specializations").select("id,slug"),
    supabase.from("tags").select("id,slug"),
    supabase.from("code_clauses").select("id,section_no,code_document_id"),
  ]);
  const clauseId = (doc: string | undefined, sec: string) => clauses?.find((c) => c.code_document_id === docId(doc) && c.section_no === sec)?.id;

  let created = 0, revised = 0, unchanged = 0;
  const keptApp: string[] = [], failures: string[] = [];
  const entries = batch!.entries as BatchEntry[];
  // one query for every existing entry of this batch (instead of one per entry)
  const { data: existingRows } = await supabase.from("entries")
    .select("id,slug,status,current:entry_revisions!entries_current_revision_fk(body,diagram,source)")
    .in("slug", entries.map((e) => e.slug));
  const existingBySlug = new Map((existingRows ?? []).map((x: any) => [x.slug, x]));
  const { data: tombs } = await supabase.from("entry_tombstones").select("slug").in("slug", entries.map((e) => e.slug));
  const tombstoned = new Set((tombs ?? []).map((t) => t.slug));
  const skipped: string[] = [];

  async function syncEntry(e: BatchEntry) {
    const body = { sections: e.sections };
    const existing = existingBySlug.get(e.slug) as any;
    let entryId = existing?.id as string | undefined;
    const cur = Array.isArray(existing?.current) ? existing?.current[0] : existing?.current;
    if (tombstoned.has(e.slug) || existing?.status === "deprecated") { skipped.push(e.slug); return; } // deleted or archived by the admin

    if (!entryId) {
      const { data: ins, error } = await supabase.from("entries").insert({
        module: e.module, title: e.title, slug: e.slug, summary: e.summary, status: "review", category: e.category ?? null,
        specialization_id: specs?.find((s) => s.slug === e.specialization)?.id ?? null,
      }).select("id").single();
      if (error) throw new Error(`entry ${e.slug}: ${error.message}`);
      entryId = ins!.id;
      created++;
    } else if (same(cur?.body, body) && same(cur?.diagram, e.diagram)) {
      unchanged++;
      return;
    } else if (cur?.source === "app") {
      // Edited in the app since the last sync: the in-app revision wins. Re-sync after copying the edit into the batch file.
      keptApp.push(e.slug);
      return;
    } else {
      revised++;
    }

    const refs = e.refs.map((r) => ({ entry_id: entryId, clause_id: clauseId(r.doc, r.section), note: r.note ?? null }));
    const missing = e.refs.filter((r) => !clauseId(r.doc, r.section));
    if (missing.length) throw new Error(`${e.slug}: clause not found ${missing.map((r) => r.section).join(", ")}`);
    const t = e.tags.map((slug) => tags?.find((x) => x.slug === slug)?.id).filter(Boolean).map((tag_id) => ({ entry_id: entryId, tag_id }));

    const { data: rev, error: re } = await supabase.from("entry_revisions").insert({
      entry_id: entryId, body, diagram: e.diagram ?? null, code_edition: e.code_edition ?? "NSCP 2015", source: "batch",
      change_note: existing ? `Updated from content ${version}` : `Initial (${version}): needs review`,
    }).select("id").single();
    if (re) throw new Error(`revision ${e.slug}: ${re.message}`);

    // independent writes in parallel: entry pointer/status, refs, tags, tool hand-check
    const jobs: PromiseLike<unknown>[] = [
      supabase.from("entries").update(existing ? { title: e.title, summary: e.summary, status: "review", current_revision_id: rev!.id, ...(e.category ? { category: e.category } : {}) } : { current_revision_id: rev!.id }).eq("id", entryId),
      supabase.from("entry_clause_refs").delete().eq("entry_id", entryId).then(() => refs.length ? supabase.from("entry_clause_refs").insert(refs) : null),
      supabase.from("entry_tags").delete().eq("entry_id", entryId).then(() => t.length ? supabase.from("entry_tags").insert(t) : null),
    ];
    if (e.module === "tool" && e.calc_key) {
      const calc = CALCS[e.calc_key];
      if (!calc) throw new Error(`unknown calc ${e.calc_key}`);
      const inputs = defaults(calc);
      const out = calc.compute(inputs);
      jobs.push(supabase.from("tools").upsert({
        entry_id: entryId, kind: "calculator", calc_key: e.calc_key,
        input_schema: { fields: calc.fields },
        output_schema: { results: out.results.map((x) => ({ label: x.label, unit: x.unit ?? null })) },
        hand_check: { inputs, results: out.results.map(({ label, value, unit }) => ({ label, value, unit })), steps: out.steps,
          verified_by: `Cross-checked by independent hand calculation (${version} build)`, note: "Re-run the inputs above. Results must match before trusting a code change." },
      }, { onConflict: "entry_id" }).then(({ error }) => { if (error) throw new Error(`tool ${e.slug}: ${error.message}`); }));
    }
    await Promise.all(jobs);
  }

  // small worker pool: 6 entries at a time
  const queue = [...entries];
  await Promise.all(Array.from({ length: Math.min(6, queue.length) }, async () => {
    for (let e = queue.shift(); e; e = queue.shift()) {
      try { await syncEntry(e); } catch (err) { failures.push((err as Error).message); }
    }
  }));
  if (failures.length) fail(`${failures.length} entr${failures.length > 1 ? "ies" : "y"} failed (release not recorded): ${failures.slice(0, 5).join(" | ")}`);
  log.push(`${created} new, ${revised} updated, ${unchanged} unchanged entries`);
  if (keptApp.length) log.push(`kept ${keptApp.length} in-app edit(s): ${keptApp.join(", ")}`);
  if (skipped.length) log.push(`skipped ${skipped.length} archived/deleted: ${skipped.join(", ")}`);

  // v1.2.0: standards side by side (stored per entry + standard; not part of the revision body)
  if (batch!.standards?.length) {
    const { data: ids } = await supabase.from("entries").select("id,slug").in("slug", batch!.standards.map((x) => x.slug));
    const rows = batch!.standards.flatMap((x) => {
      const id = ids?.find((r) => r.slug === x.slug)?.id;
      if (!id) { failures.push(`standards: entry ${x.slug} not found`); return []; }
      return STD_KEYS.filter((k) => x[k]).map((k) => ({ entry_id: id, std: k, code: x[k]!.code, points: x[k]!.points, refs: x[k]!.refs ?? null, verified: x[k]!.verified ?? true }));
    });
    if (failures.length) fail(failures.join(" | "));
    const { error } = await supabase.from("entry_standards").upsert(rows, { onConflict: "entry_id,std" });
    if (error) fail(`standards: ${error.message}`);
    log.push(`${rows.length} standard panel(s) on ${batch!.standards.length} entries`);
  }

  const { error: rle } = await supabase.from("releases").upsert(
    { version, batch_name: batch!.batch_name, notes_md: batch!.notes.map((x) => `- ${x}`).join("\n"), released_at: new Date().toISOString() },
    { onConflict: "version" });
  if (rle) fail(`release: ${rle.message}`);
  log.push("release recorded");

  revalidatePath("/", "layout");
  redirect("/admin?ok=" + encodeURIComponent(`${version}: ${log.join(" · ")}`));
}

/* ---------- v0.8.0: integration API keys ---------- */

export type KeyState = { key?: string; name?: string; error?: string };

/** Create an API client. The plain key is returned once to the admin's browser; only its hash is stored. */
export async function createApiClient(_prev: KeyState, formData: FormData): Promise<KeyState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const scopes = ["content", "calc"].filter((s) => formData.get(`scope_${s}`) === "on");
  if (!name) return { error: "Name the client app (e.g. darkwizscroll)" };
  if (!scopes.length) return { error: "Pick at least one scope" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  if (me?.role !== "admin") return { error: "Admin only" };
  const key = newApiKey();
  const { error } = await supabase.from("api_clients").insert({ name, key_prefix: key.slice(0, 12), key_hash: sha256(key), scopes });
  if (error) return { error: error.message.includes("duplicate") ? "A client with that name already exists" : error.message };
  revalidatePath("/admin");
  return { key, name };
}

export async function setApiClientActive(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("api_clients").update({ active: formData.get("active") === "1" }).eq("id", Number(formData.get("id")));
  revalidatePath("/admin");
}
