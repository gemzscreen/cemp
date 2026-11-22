import Link from "next/link";
import { APP_VERSION } from "@/lib/modules";

export const metadata = { title: "Help" };

export default function Help() {
  return (
    <div className="help">
      <h1>CEMP guide</h1>
      <p className="sub">Version {APP_VERSION}. How to use the library, edit it, and run it.</p>

      <section className="panel" style={{ marginBottom: "1rem" }} id="trust">
        <h2>Read this first: what CEMP is (and isn't)</h2>
        <ul>
          <li>CEMP is a practice library and calculator set for Philippine civil engineering work. It is <strong>not</strong> a copy of the codes: the Codes module indexes section numbers, formulas and limits with summaries in our own words. Always design from your own copy of the code in force.</li>
          <li>Every tool shows its step-by-step substitutions and a recorded hand-check, so you can verify the result by hand.</li>
          <li>A yellow <span className="badge b-review">verify</span> badge means the data still has to be confirmed against an official source. Treat it as a lead, not a fact.</li>
          <li>Each entry shows its revision, code-edition stamp and review date at the bottom.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }} id="use">
        <h2>Using CEMP</h2>
        <ul>
          <li><strong>Modules:</strong> Codes (clause index), Tools (calculators and checklists), Conversions (units and reference tables), Practices (site cards with safe/avoid zones and diagrams), Education (CELE outlines, flashcards, worked problems, PH ↔ global comparisons).</li>
          <li><strong>Search</strong> (box in the header) covers entry titles, summaries, card text, code clauses and calculator names.</li>
          <li><strong>Tools:</strong> change any input and results update live. <em>Reset to example</em> restores the hand-check inputs. <em>Print / save as PDF</em> gives a clean printout; <em>Download CSV (Excel)</em> saves inputs, results, checks and steps.</li>
          <li><strong>Checklists</strong> (pre-pour, rebar, formwork, steel, scaffold, excavation, daily safety walk) start as “Not checked”. A form is accepted only when nothing fails and nothing is left unchecked. Print it for signatures.</li>
          <li><strong>Flashcards and worked problems</strong> (Education): tap a card or “Show solution”. Each problem links to its calculator so you can change the numbers.</li>
          <li><strong>Saved:</strong> “☆ Save to my list” on any entry; add private notes at the bottom of an entry. Both are visible only to you, on the <Link href="/saved">Saved</Link> page.</li>
          <li><strong>On site / offline:</strong> install CEMP (browser menu → Add to Home screen / Install). Before a site visit, open Saved → “Make available offline”. Saved pages and their calculators then work without signal. Signing out clears the offline copies on that device.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }} id="edit">
        <h2>For editors</h2>
        <ol>
          <li>Open an entry → <strong>✎ Edit</strong>. Change title, summary, clause references (<code>DOC | section | note</code>, one per line), tags and sections (text, list, safe, avoid, table, flashcards, problem). Use <strong>Preview</strong> before saving.</li>
          <li>Tick “show a verify badge” on any section whose data is not yet confirmed.</li>
          <li>Write a change note and <strong>Save as new revision</strong>. Nothing is overwritten; a published entry goes back to review until the admin re-publishes it.</li>
          <li><strong>History</strong> lists every revision with author and change note; compare any two (green = added, red = removed) or restore an old one.</li>
          <li>New practice, code or education entries: <Link href="/entry/new">New entry</Link> creates a draft. Calculators are added in code (<code>lib/calc</code>), not in the app.</li>
          <li>When a draft is ready, send it to review from the <Link href="/admin/review">review queue</Link>.</li>
        </ol>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }} id="admin">
        <h2>For the admin</h2>
        <ul>
          <li><strong>Content batches</strong> live in the repo (<code>content/batches</code>). Admin → <em>Sync content</em> loads a batch as review drafts, in version order. Entries you edited in the app are kept and listed in the sync log.</li>
          <li><strong>Publishing:</strong> review each entry against your code copy, then publish (one by one, or in bulk from the review queue). The database refuses entries without a clause reference (practice/code) or a hand-check (tools).</li>
          <li><strong><Link href="/admin/audit">Content audit &amp; release gate</Link></strong>: blockers (unsynced batches, unpublished entries, missing refs/hand-checks, hand-check drift, problems linking to unpublished tools) and warnings (verify flags, in-app edits not yet copied to the repo).</li>
          <li><strong>API keys</strong> for darkwizscroll / DARKWIZ CT: Admin → Integration API keys; docs at <Link href="/api-docs">API docs</Link>. Only published content is served.</li>
          <li><strong>Users:</strong> sign-ups are off; invite users from Supabase Auth. New users are viewers; promote an editor with SQL (<code>update public.profiles set role = &apos;editor&apos; where email = …</code>).</li>
        </ul>
      </section>
    </div>
  );
}
