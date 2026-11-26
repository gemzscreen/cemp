// v2.2.0 client quotation (print / Save as PDF). v2.5.0: revisions: "Issue" freezes the quotation as Rev 0, R1, R2 …;
// ?rev=N shows an issued revision exactly as it was. The BOM and cost build-up stay internal.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/auth";
import { normalizeCosting, peso } from "@/lib/costing";
import { buildQuote, diffSnaps, type QuoteSnap } from "@/lib/quote";
import PrintButton from "@/components/PrintButton";
import QuoteEditor from "@/components/QuoteEditor";
import QuoteDoc from "@/components/QuoteDoc";
import SubmitButton from "@/components/SubmitButton";
import { issueQuote } from "../../../actions";

export const metadata = { title: "Quotation" };

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rev?: string; ok?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, fullName } = await getMe();
  const [{ data: p }, { data: prof }, { data: ur }, { data: revs }] = await Promise.all([
    supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle(),
    user ? supabase.from("profiles").select("issuer").eq("id", user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from("user_rates").select("labour").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("quote_revisions").select("rev,snapshot,created_at").eq("project_id", id).order("rev"),
  ]);
  if (!p) notFound();
  const issued = (revs ?? []).map((x) => ({ ...(x.snapshot as QuoteSnap), rev: x.rev as number, issuedAt: x.created_at as string }));
  const nextRev = issued.length ? issued[issued.length - 1].rev + 1 : 0;
  const { snap: draft, full, base } = buildQuote(p, prof?.issuer, ur, fullName, nextRev);
  const viewRev = sp.rev != null ? issued.find((x) => x.rev === Number(sp.rev)) : undefined;
  const shown: QuoteSnap = viewRev ?? draft;
  const costing = normalizeCosting(p.costing);
  const last = issued[issued.length - 1];
  const draftDiff = last ? diffSnaps(last, draft) : null;
  const draftSame = draftDiff && !draftDiff.added.length && !draftDiff.removed.length && !draftDiff.changed.length && !draftDiff.termsChanged && Math.abs(draftDiff.delta) < 0.01;

  return (
    <>
      <div className="no-print quote-bar">
        <p className="sub" style={{ margin: 0 }}><Link href={`/estimate/projects/${id}`}>← {p.name}</Link> · <Link href={`/estimate/projects/${id}#costing`}>Costing</Link></p>
        <div className="est-actions">
          <a className="btn ghost" href={`/estimate/projects/${id}/xlsx`}>Excel (.xlsx)</a>
          <PrintButton />
        </div>
      </div>
      {sp.ok === "issued" && viewRev && <div className="msg ok no-print" style={{ marginBottom: ".8rem" }}>Issued as {viewRev.rev === 0 ? "Rev 0" : `R${viewRev.rev}`} ({viewRev.q.no}). This revision is frozen: later changes go into the next revision.</div>}
      {sp.err && <div className="msg err no-print" style={{ marginBottom: ".8rem" }}>{sp.err}</div>}

      {viewRev ? (
        <div className="msg revise no-print">
          <span>Viewing <b>{viewRev.rev === 0 ? "Rev 0" : `R${viewRev.rev}`}</b>, issued {new Date(viewRev.issuedAt!).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}. Frozen copy: prints exactly as sent.</span>
          <Link className="btn ghost" href={`/estimate/projects/${id}/quote`}>Back to the draft</Link>
        </div>
      ) : (
        <>
          {(!draft.iss.name && !draft.iss.company) && <div className="msg warn no-print" style={{ marginBottom: ".8rem" }}>Add your company, licence and contact details once in <Link href="/account#quotation">Profile → Quotation details</Link>.</div>}
          {full.unpriced > 0 && <div className="msg warn no-print" style={{ marginBottom: ".8rem" }}>{full.unpriced} material line(s) have no unit price and count as ₱0. <Link href={`/estimate/projects/${id}`}>Price them first.</Link></div>}
          <div className="msg revise no-print">
            <span><b>Draft</b> of {nextRev === 0 ? "Rev 0" : `R${nextRev}`} ({draft.q.no}).{" "}
              {last ? (draftSame ? `Same as ${last.rev === 0 ? "Rev 0" : `R${last.rev}`}: nothing new to issue.` : `Changed since ${last.rev === 0 ? "Rev 0" : `R${last.rev}`}: total ${draftDiff!.delta >= 0 ? "+" : "−"}${peso(Math.abs(draftDiff!.delta))}.`) : "Issue it to freeze a copy you can send."}</span>
            <form action={issueQuote}><input type="hidden" name="id" value={id} />
              <SubmitButton style={{ width: "auto", margin: 0 }} pending="Issuing…" disabled={!draft.r.items.length || !!draftSame}>Issue as {nextRev === 0 ? "Rev 0" : `R${nextRev}`}</SubmitButton></form>
          </div>
          <QuoteEditor projectId={id} costing={costing} defaults={{ no: base, date: draft.q.date }} />
        </>
      )}

      <QuoteDoc r={shown.r} costing={shown.costing} q={shown.q} iss={shown.iss} signer={shown.signer} project={shown.project} calcTitles={shown.calcTitles} dateLong={shown.dateLong} validUntil={shown.validUntil} rev={viewRev ? viewRev.rev : issued.length ? nextRev : undefined} />

      {issued.length > 0 && (
        <section className="panel no-print" style={{ marginTop: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>Revisions</h2>
          <div className="tbl-wrap"><table className="tbl compact">
            <thead><tr><th>Rev</th><th>No.</th><th>Issued</th><th className="num">Total</th><th>Changes from previous</th><th /></tr></thead>
            <tbody>
              {[...issued].reverse().map((x) => {
                const prev = issued.find((y) => y.rev === x.rev - 1), d = prev ? diffSnaps(prev, x) : null;
                const parts = d ? [
                  d.added.length && `added ${d.added.join(", ")}`, d.removed.length && `removed ${d.removed.join(", ")}`,
                  d.changed.length && d.changed.map((c) => `${c.label} ${peso(c.from)} → ${peso(c.to)}`).join("; "), d.termsChanged && "terms edited",
                ].filter(Boolean) : [];
                return (
                  <tr key={x.rev} className={viewRev?.rev === x.rev ? "hl" : ""}>
                    <td><b>{x.rev === 0 ? "Rev 0" : `R${x.rev}`}</b></td><td>{x.q.no}</td>
                    <td className="fine">{new Date(x.issuedAt!).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</td>
                    <td className="num">{peso(x.r.total)}{d && Math.abs(d.delta) >= 0.01 && <div className={`fine ${d.delta > 0 ? "warn-txt" : "ok-txt"}`}>{d.delta > 0 ? "+" : "−"}{peso(Math.abs(d.delta))}</div>}</td>
                    <td className="fine">{d ? parts.join(" · ") || "no price change" : "original"}</td>
                    <td><Link href={`/estimate/projects/${id}/quote?rev=${x.rev}`}>view</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
