export const metadata = { title: "API docs" };

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cemp.darkwizlab.com";
const EP: [string, string, string][] = [
  ["GET", "/api/v1", "Index: version and endpoint list (no key needed)"],
  ["GET", "/api/v1/entries?module=practice&updated_since=2026-11-01&limit=100&offset=0", "Published entries with body sections, diagram, tags, clause refs, calc_key. Scope: content"],
  ["GET", "/api/v1/entries/{slug}", "One published entry. Scope: content"],
  ["GET", "/api/v1/clauses?doc=NSCP", "Code clause index (own-words summaries). Scope: content"],
  ["GET", "/api/v1/calcs", "Calculator & checklist catalog with field schemas and defaults. Scope: calc"],
  ["GET", "/api/v1/calcs/{key}", "One calculator with its worked default example. Scope: calc"],
  ["POST", "/api/v1/calcs/{key}", "Run it: body {\"inputs\": {…}}; missing fields take defaults. ?format=csv returns a CSV file. Scope: calc"],
];

export default function ApiDocs() {
  return (
    <>
      <h1>Integration API (v1)</h1>
      <p className="sub">Read-only API for darkwizscroll, DARKWIZ CT and other Darkwiz Lab apps. Serves published content only; calculations reuse the same <code>lib/calc</code> library as the site.</p>
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Authentication</h2>
        <ul>
          <li>Ask the admin for a key (Admin → Integration API keys). Keys look like <code>cemp_…</code> and are shown once.</li>
          <li>Send <code>Authorization: Bearer &lt;key&gt;</code> (or <code>x-api-key</code>) on every request.</li>
          <li>Keep keys server-side. Browser calls need the origin listed in the <code>CEMP_API_CORS_ORIGINS</code> env var on Vercel.</li>
          <li>Errors: 401 missing key · 403 invalid/revoked key or missing scope · 400 bad input · 404 not found.</li>
        </ul>
      </section>
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Endpoints</h2>
        <div className="tbl-wrap"><table className="tbl compact">
          <thead><tr><th>Method</th><th>Path</th><th>Returns</th></tr></thead>
          <tbody>{EP.map(([m, p, d]) => <tr key={p + m}><td><code>{m}</code></td><td><code>{p}</code></td><td>{d}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h2>Examples</h2>
        <pre className="code">{`curl -H "Authorization: Bearer $CEMP_API_KEY" \\
  "${BASE}/api/v1/entries?module=education&limit=50"

curl -X POST -H "Authorization: Bearer $CEMP_API_KEY" -H "content-type: application/json" \\
  -d '{"inputs":{"db":25,"fc":28,"top":"1.3"}}' \\
  ${BASE}/api/v1/calcs/dev-length-tension`}</pre>
      </section>
      <section className="panel">
        <h2>Syncing tips</h2>
        <ul>
          <li>Pull everything once, then poll with <code>updated_since</code> = your last sync time.</li>
          <li>Page with <code>limit</code>/<code>offset</code>; <code>next_offset</code> is null on the last page.</li>
          <li>Body sections use kinds safe, avoid, text, list, table, cards (flashcards) and problem (worked problems): darkwizscroll can turn cards and problems straight into practice items.</li>
          <li>Unpublished or revised-but-unreviewed entries never appear; republishing bumps <code>updated_at</code>.</li>
        </ul>
      </section>
    </>
  );
}
