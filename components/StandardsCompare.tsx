// v1.2.0: one entry, three standards side by side. Home standard first; stacks to one column on phones.
import { STD_KEYS, STD_LABEL, type StdKey } from "@/content/types";

export type StdRow = { std: StdKey; code: string; points: string[]; refs: string | null; verified: boolean };

export default function StandardsCompare({ rows, home }: { rows: StdRow[]; home: StdKey }) {
  if (!rows.length) return null;
  const order = [home, ...STD_KEYS.filter((k) => k !== home)];
  const sorted = order.map((k) => rows.find((r) => r.std === k)).filter(Boolean) as StdRow[];
  return (
    <section className="panel std-wrap" style={{ marginBottom: ".8rem" }}>
      <h2>Standards side by side</h2>
      <p className="fine" style={{ margin: "-.2rem 0 .7rem" }}>
        Your home standard is shown first. Change it in <a href="/account">Profile</a>. Each panel is a summary in our own words; check the clause in your copy before you rely on it.
      </p>
      <div className="std-grid">
        {sorted.map((r) => (
          <div key={r.std} className={`std-card std-${r.std}${r.std === home ? " std-home" : ""}`}>
            <div className="std-head">
              <span className="std-flag" aria-hidden>{STD_LABEL[r.std].flag}</span>
              <strong>{STD_LABEL[r.std].name}</strong>
              {r.std === home && <i className="std-chip">your standard</i>}
              {!r.verified && <span className="badge b-review">verify</span>}
            </div>
            <div className="std-code">{r.code}</div>
            <ul>{r.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
            {r.refs && <div className="std-refs">§ {r.refs}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
