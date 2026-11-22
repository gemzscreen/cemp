import { API_VERSION, json, preflight } from "@/lib/api";
import { APP_VERSION } from "@/lib/modules";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export function GET(req: Request) {
  return json(req, {
    name: "CEMP integration API", api: API_VERSION, app: APP_VERSION,
    auth: "Authorization: Bearer <key> (or x-api-key). Keys are issued by the CEMP admin.",
    endpoints: {
      "GET /api/v1/entries": "Published entries. Query: module (practice|tool|code|education|conversion), updated_since (ISO), limit (≤500), offset. Scope: content",
      "GET /api/v1/entries/{slug}": "One published entry. Scope: content",
      "GET /api/v1/clauses": "Code clause index (own-words summaries). Query: doc (e.g. NSCP). Scope: content",
      "GET /api/v1/calcs": "Calculator catalog: key, title, clauses, fields with defaults. Scope: calc",
      "GET /api/v1/calcs/{key}": "One calculator with its worked default example. Scope: calc",
      "POST /api/v1/calcs/{key}": "Run a calculator. Body: {\"inputs\": {...}}; missing fields use defaults. Add ?format=csv for a CSV file. Scope: calc",
    },
  });
}
