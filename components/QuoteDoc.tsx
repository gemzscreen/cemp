// v2.2.0: the client quotation document (used by /estimate/projects/[id]/quote). Pure markup, no data access.
import { money, amountWords, type Costing, type ProjectCost, type QuoteInfo } from "@/lib/costing";
import type { Issuer } from "@/lib/issuer";

export default function QuoteDoc({ r, costing, q, iss, signer, project, calcTitles, dateLong, validUntil, rev, cur = "PHP" }: {
  r: Pick<ProjectCost, "subtotal" | "vat" | "total"> & { items: Pick<ProjectCost["items"][number], "id" | "no" | "label" | "calcKey" | "lump">[] };
  costing: Pick<Costing, "vat">; q: QuoteInfo; iss: Issuer; signer: string; rev?: number;
  project: { name: string; client: string | null; location: string | null };
  calcTitles: Record<string, string>; dateLong: string; validUntil: string | null; cur?: "PHP" | "BND";
}) {
  const peso = (x: number) => money(x, cur), sym = cur === "BND" ? "B$" : "₱";
  const headName = iss.company || signer || "Your name or company";
  return (
    <article className="quote-doc">
      <header className="q-head">
        <div className="q-from">
          {iss.logo && <img src={iss.logo} alt="" className="q-logo" />}
          <div>
            <div className="q-company">{headName}</div>
            {iss.company && signer && <div>{signer}{iss.title ? `, ${iss.title}` : ""}</div>}
            {!iss.company && iss.title && <div>{iss.title}</div>}
            {iss.address && <div>{iss.address}</div>}
            <div>{[iss.contact, iss.email].filter(Boolean).join(" · ")}</div>
            {(iss.prc || iss.tin) && <div className="fine">{[iss.prc && `PRC ${iss.prc}`, iss.tin && `TIN ${iss.tin}`].filter(Boolean).join(" · ")}</div>}
          </div>
        </div>
        <div className="q-meta">
          <div className="q-title">QUOTATION</div>
          <table><tbody>
            <tr><td>No.</td><td><b>{q.no}</b></td></tr>
            {rev != null && <tr><td>Revision</td><td>{rev === 0 ? "0 (original)" : `R${rev}`}</td></tr>}
            <tr><td>Date</td><td>{dateLong}</td></tr>
            {validUntil && <tr><td>Valid until</td><td>{validUntil}</td></tr>}
          </tbody></table>
        </div>
      </header>

      <section className="q-to">
        <div><span className="q-lbl">To</span><b>{project.client || "Client"}</b></div>
        <div><span className="q-lbl">Project</span>{project.name}</div>
        {project.location && <div><span className="q-lbl">Location</span>{project.location}</div>}
      </section>

      <p>We are pleased to submit our price for the works below{costing.vat > 0 ? ", inclusive of materials, labour, equipment, overhead and profit, with VAT shown separately" : ", inclusive of materials, labour, equipment, overhead and profit"}.</p>

      <table className="q-items">
        <thead><tr><th>Item</th><th>Description of work</th><th className="num">Qty</th><th>Unit</th><th className="num">Amount ({sym})</th></tr></thead>
        <tbody>
          {r.items.map((it) => (
            <tr key={it.id}><td>{it.no}</td><td>{it.label}{calcTitles[it.calcKey] && calcTitles[it.calcKey] !== it.label && <div className="fine">{calcTitles[it.calcKey]}</div>}</td><td className="num">1</td><td>lot</td><td className="num">{peso(it.lump).slice(sym.length)}</td></tr>
          ))}
        </tbody>
        <tfoot>
          {costing.vat > 0 && <tr><td colSpan={4} className="num">Total before VAT</td><td className="num">{peso(r.subtotal)}</td></tr>}
          {costing.vat > 0 && <tr><td colSpan={4} className="num">VAT {costing.vat}%</td><td className="num">{peso(r.vat)}</td></tr>}
          <tr className="q-total"><td colSpan={4} className="num">TOTAL CONTRACT PRICE</td><td className="num">{peso(r.total)}</td></tr>
        </tfoot>
      </table>
      <p className="q-words"><b>Amount in words:</b> {amountWords(r.total, cur)}{costing.vat > 0 ? " (VAT inclusive)" : ""}</p>

      {q.payment && <section className="q-block"><h3>Payment terms</h3><p>{q.payment}</p></section>}
      {q.terms && <section className="q-block"><h3>Terms and conditions</h3><p>{q.terms}</p></section>}
      {q.validity > 0 && <section className="q-block"><h3>Validity</h3><p>This quotation is valid for {q.validity} days from the date above. Prices may change after that because of material price movements.</p></section>}
      {q.notes && <section className="q-block"><h3>Notes</h3><p>{q.notes}</p></section>}

      <footer className="q-sign">
        <div>
          <div className="q-lbl">Prepared by</div>
          <div className="q-line" />
          <b>{signer || " "}</b>
          <div>{iss.title}</div>
          {iss.prc && <div className="fine">PRC {iss.prc}</div>}
        </div>
        <div>
          <div className="q-lbl">Conforme</div>
          <div className="q-line" />
          <b>{project.client || " "}</b>
          <div>Signature over printed name / date</div>
        </div>
      </footer>
    </article>
  );
}
