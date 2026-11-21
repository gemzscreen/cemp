type Col = { key: string; label: string; unit?: string };
export type RefTableRow = { id: string; slug: string; name: string; columns: Col[]; data: { rows: Record<string, unknown>[]; verified?: boolean }; source: string | null };

export default function RefTable({ t }: { t: RefTableRow }) {
  const verified = t.data?.verified !== false;
  return (
    <section className="panel" id={t.slug} style={{ marginBottom: "1rem" }}>
      <h2>{t.name} {!verified && <span className="badge b-review">verify</span>}</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>{t.columns.map((c) => <th key={c.key}>{c.label}{c.unit ? <span className="muted"> ({c.unit})</span> : null}</th>)}</tr>
          </thead>
          <tbody>
            {(t.data?.rows ?? []).map((r, i) => (
              <tr key={i}>{t.columns.map((c) => {
                const v = r[c.key];
                return <td key={c.key} className={typeof v === "number" ? "num" : ""}>{v === "" || v == null ? "–" : String(v)}</td>;
              })}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.source && <p className="fine" style={{ marginTop: ".6rem" }}>Source: {t.source}</p>}
    </section>
  );
}
