// Renders an entry revision's body sections (server component: no client JS needed).
import Link from "next/link";
import type { Section } from "@/content/types";

export default function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => (
        <div key={i} className={`panel sec sec-${s.kind}`} style={{ marginBottom: ".8rem" }}>
          {s.heading && (
            <h2>
              {s.kind === "safe" ? "✓ " : s.kind === "avoid" ? "✕ " : ""}{s.heading}
              {s.verified === false && <span className="badge b-review" style={{ marginLeft: ".5rem" }}>verify</span>}
            </h2>
          )}
          {s.text && <p style={{ margin: 0 }}>{s.text}</p>}
          {s.items && <ul style={{ margin: ".3rem 0 0" }}>{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul>}

          {s.kind === "table" && s.columns && (
            <div className="tbl-wrap">
              <table className="tbl compact">
                <thead><tr>{s.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{(s.rows ?? []).map((row, ri) => <tr key={ri}>{row.map((v, ci) => <td key={ci}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}

          {s.kind === "cards" && s.cards && (
            <>
              <p className="fine" style={{ margin: ".2rem 0 .6rem" }}>{s.cards.length} cards · tap a card to reveal the answer</p>
              <div className="cards">
                {s.cards.map((c, j) => (
                  <details key={j} className="flash">
                    <summary><span className="muted">{j + 1}.</span> {c.q}</summary>
                    <div className="ans">{c.a}</div>
                  </details>
                ))}
              </div>
            </>
          )}

          {s.kind === "problem" && s.problem && (
            <div className="problem">
              <p style={{ marginTop: 0 }}>{s.problem.statement}</p>
              <p className="fine" style={{ margin: ".2rem 0" }}><strong>Given:</strong> {s.problem.given.join("; ")}</p>
              <p className="fine" style={{ margin: ".2rem 0 .5rem" }}><strong>Find:</strong> {s.problem.find}</p>
              <details>
                <summary><strong>Show solution</strong></summary>
                <ol className="steps">{s.problem.steps.map((st, j) => <li key={j}><code>{st}</code></li>)}</ol>
                <div className="msg ok" style={{ marginTop: ".5rem" }}><strong>Answer:</strong> {s.problem.answer.join(" · ")}</div>
                {s.problem.tool && <p className="fine"><Link href={`/entry/${s.problem.tool}`}>Open in the calculator →</Link> to change the inputs.</p>}
              </details>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
