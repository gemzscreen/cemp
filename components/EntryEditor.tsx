"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import Sections from "@/components/Sections";
import type { Section } from "@/content/types";
import { KINDS, validateSections } from "@/lib/sections";
import { CATEGORIES } from "@/lib/taxonomy";
import { saveRevision, type SaveResult } from "@/app/(app)/entry/editor-actions";

type Init = { slug: string; title: string; summary: string; code_edition: string; sections: Section[]; diagram: string; refs: string; tags: string; status: string; module: string; category: string };
const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const KIND_LABEL: Record<Section["kind"], string> = { text: "Text", list: "List", safe: "Safe / do (✓)", avoid: "Avoid (✕)", table: "Table", cards: "Flashcards", problem: "Worked problem (JSON)" };

/** Textarea that keeps the raw text while typing (so Enter and blank lines work) and reports parsed values. */
function RawField({ initial, parse, onParsed, rows, placeholder }: { initial: string; parse: (t: string) => Partial<Section>; onParsed: (p: Partial<Section>) => void; rows: number; placeholder?: string }) {
  const [raw, setRaw] = useState(initial);
  return <textarea rows={rows} value={raw} placeholder={placeholder} onChange={(e) => { setRaw(e.target.value); onParsed(parse(e.target.value)); }} />;
}

/** One section's editable form. Multi-line fields are edited as plain text and parsed on change. */
function SectionForm({ s, onChange }: { s: Section; onChange: (s: Section) => void }) {
  const set = (patch: Partial<Section>) => onChange({ ...s, ...patch });
  return (
    <div className="tool-grid">
      <label className="fld"><span>Heading</span><input value={s.heading ?? ""} onChange={(e) => set({ heading: e.target.value || undefined })} /></label>
      <label className="fld"><span>Unverified data?</span>
        <span style={{ fontWeight: 400 }}><input type="checkbox" checked={s.verified === false} onChange={(e) => set({ verified: e.target.checked ? false : undefined })} /> show a “verify” badge</span>
      </label>
      {(s.kind === "text" || ["list", "safe", "avoid"].includes(s.kind)) && (
        <label className="fld"><span>Text {s.kind !== "text" && <span className="muted">(optional intro)</span>}</span>
          <textarea rows={3} value={s.text ?? ""} onChange={(e) => set({ text: e.target.value || undefined })} /></label>
      )}
      {["list", "safe", "avoid"].includes(s.kind) && (
        <label className="fld"><span>Items <span className="muted">(one per line)</span></span>
          <RawField rows={Math.max(4, (s.items?.length ?? 0) + 1)} initial={(s.items ?? []).join("\n")} parse={(t) => ({ items: lines(t) })} onParsed={set} /></label>
      )}
      {s.kind === "table" && (<>
        <label className="fld"><span>Columns <span className="muted">(separate with |)</span></span>
          <RawField rows={1} initial={(s.columns ?? []).join(" | ")} parse={(t) => ({ columns: t.split("|").map((x) => x.trim()).filter(Boolean) })} onParsed={set} /></label>
        <label className="fld"><span>Rows <span className="muted">(one row per line, cells separated with |)</span></span>
          <RawField rows={Math.max(4, (s.rows?.length ?? 0) + 1)} initial={(s.rows ?? []).map((r) => r.join(" | ")).join("\n")}
            parse={(t) => ({ rows: lines(t).map((l) => l.split("|").map((x) => x.trim())) })} onParsed={set} /></label>
      </>)}
      {s.kind === "cards" && (
        <label className="fld"><span>Cards <span className="muted">(one per line: question :: answer)</span></span>
          <RawField rows={Math.max(5, (s.cards?.length ?? 0) + 1)} initial={(s.cards ?? []).map((c) => `${c.q} :: ${c.a}`).join("\n")}
            parse={(t) => ({ cards: lines(t).map((l) => { const [q, ...a] = l.split("::"); return { q: q.trim(), a: a.join("::").trim() }; }) })} onParsed={set} /></label>
      )}
      {s.kind === "problem" && <ProblemJson s={s} onChange={onChange} />}
    </div>
  );
}

function ProblemJson({ s, onChange }: { s: Section; onChange: (s: Section) => void }) {
  const [txt, setTxt] = useState(JSON.stringify(s.problem ?? { statement: "", given: [], find: "", steps: [], answer: [] }, null, 2));
  const [bad, setBad] = useState(false);
  return (
    <label className="fld"><span>Problem JSON <span className="muted">(problems from content batches are generated from the calculators: edit those in the batch file instead)</span></span>
      <textarea rows={10} value={txt} style={bad ? { borderColor: "var(--avoid)" } : undefined}
        onChange={(e) => { setTxt(e.target.value); try { onChange({ ...s, problem: JSON.parse(e.target.value) }); setBad(false); } catch { setBad(true); } }} />
      {bad && <small style={{ color: "var(--avoid)" }}>Not valid JSON yet: the last valid version is kept.</small>}
    </label>
  );
}

let seq = 0;
const nid = () => `s${++seq}`;

export default function EntryEditor({ init }: { init: Init }) {
  const [f, setF] = useState(init);
  const [ids, setIds] = useState<string[]>(() => init.sections.map(nid));
  const [note, setNote] = useState("");
  const [addKind, setAddKind] = useState<Section["kind"]>("list");
  const [preview, setPreview] = useState(false);
  const [res, setRes] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const errs = validateSections(f.sections);
  const setSec = (k: number, s: Section) => setF({ ...f, sections: f.sections.map((x, i) => (i === k ? s : x)) });
  const move = (k: number, d: -1 | 1) => {
    const a = [...f.sections]; const j = k + d; if (j < 0 || j >= a.length) return;
    const b = [...ids];
    [a[k], a[j]] = [a[j], a[k]]; [b[k], b[j]] = [b[j], b[k]];
    setF({ ...f, sections: a }); setIds(b);
  };
  const remove = (k: number) => { setF({ ...f, sections: f.sections.filter((_, i) => i !== k) }); setIds(ids.filter((_, i) => i !== k)); };
  const add = (s: Section) => { setF({ ...f, sections: [...f.sections, s] }); setIds([...ids, nid()]); };
  const save = () => start(async () => setRes(await saveRevision({ ...f, change_note: note })));

  return (
    <div className="editor">
      <div className="panel" style={{ marginBottom: ".8rem" }}>
        <div className="tool-grid">
          <label className="fld"><span>Title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="fld"><span>Category</span>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {CATEGORIES.map((c, ci) => (
                <optgroup key={c.slug} label={`${ci + 1}. ${c.name}`}>
                  {c.children.map((l, li) => <option key={l.slug} value={l.slug}>{ci + 1}.{li + 1} {l.name}</option>)}
                </optgroup>
              ))}
            </select></label>
          <label className="fld"><span>Code edition stamp</span><input value={f.code_edition} placeholder="e.g. NSCP 2015" onChange={(e) => setF({ ...f, code_edition: e.target.value })} /></label>
          <label className="fld"><span>Summary</span><textarea rows={2} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></label>
          <label className="fld"><span>Clause references <span className="muted">(one per line: DOC | section | note; doc defaults to NSCP)</span></span>
            <textarea rows={3} value={f.refs} placeholder={"NSCP | 425.5.2 | Lap lengths\nRA 11058 | Sec. 8"} onChange={(e) => setF({ ...f, refs: e.target.value })} /></label>
          <label className="fld"><span>Tags <span className="muted">(slugs, comma-separated)</span></span><input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></label>
        </div>
      </div>

      <div className="chips no-print" style={{ marginBottom: ".8rem" }}>
        <button type="button" className={`chip ${!preview ? "on" : ""}`} onClick={() => setPreview(false)}>Edit sections</button>
        <button type="button" className={`chip ${preview ? "on" : ""}`} onClick={() => setPreview(true)}>Preview</button>
      </div>

      {preview ? <Sections sections={f.sections} /> : (<>
        {f.sections.map((s, k) => (
          <div key={ids[k]} className="panel sec-edit" style={{ marginBottom: ".8rem" }}>
            <div className="sec-edit-bar">
              <strong>{k + 1}. {KIND_LABEL[s.kind]}</strong>
              <span>
                <button type="button" className="linkbtn plain" onClick={() => move(k, -1)} disabled={k === 0}>↑</button>
                <button type="button" className="linkbtn plain" onClick={() => move(k, 1)} disabled={k === f.sections.length - 1}>↓</button>
                <button type="button" className="linkbtn" onClick={() => confirm("Remove this section?") && remove(k)}>remove</button>
              </span>
            </div>
            <SectionForm s={s} onChange={(n) => setSec(k, n)} />
          </div>
        ))}
        <div className="panel" style={{ display: "flex", gap: ".5rem", alignItems: "center", marginBottom: ".8rem" }}>
          <select value={addKind} onChange={(e) => setAddKind(e.target.value as Section["kind"])}>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <button type="button" className="btn ghost" style={{ width: "auto", marginTop: 0 }}
            onClick={() => add(addKind === "table" ? { kind: "table", columns: ["Item", "Value"], rows: [] } : addKind === "cards" ? { kind: "cards", cards: [] } : { kind: addKind })}>
            + Add section</button>
        </div>
        <details className="panel" style={{ marginBottom: ".8rem" }}>
          <summary><strong>Diagram spec (JSON, advanced)</strong></summary>
          <textarea rows={8} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: ".8rem" }} value={f.diagram} onChange={(e) => setF({ ...f, diagram: e.target.value })} />
        </details>
      </>)}

      <div className="panel save-bar">
        {errs.length > 0 && <div className="msg err" style={{ marginBottom: ".5rem" }}>{errs.join(" · ")}</div>}
        <label className="fld"><span>Change note <span className="muted">(required: what changed and why)</span></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Added Brunei SMM2 row; corrected lap length note" /></label>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center", marginTop: ".5rem", flexWrap: "wrap" }}>
          <button type="button" className="btn" style={{ width: "auto", marginTop: 0 }} disabled={pending || errs.length > 0 || !note.trim()} onClick={save}>
            {pending ? "Saving…" : "Save as new revision"}</button>
          <Link href={`/entry/${f.slug}`} className="btn ghost" style={{ width: "auto", marginTop: 0 }}>Back to entry</Link>
          {init.status === "published" && <span className="fine">Saving moves this published entry back to review until it is re-published.</span>}
        </div>
        {res?.error && <div className="msg err" style={{ marginTop: ".5rem" }}>{res.error}</div>}
        {res?.ok && <div className="msg ok" style={{ marginTop: ".5rem" }}>Saved as a new revision.{res.warnings?.length ? " " + res.warnings.join(" ") : ""} <Link href={`/entry/${f.slug}`}>View entry</Link> · <Link href={`/entry/${f.slug}/history`}>History</Link></div>}
      </div>
    </div>
  );
}
