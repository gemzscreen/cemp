// v2.9.0: security hardening (code only; this batch carries the release notes).
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.9.0",
  batch_name: "Security hardening",
  notes: [
    "Security headers on every page: Content-Security-Policy, HSTS, clickjacking block (X-Frame-Options), Referrer-Policy and Permissions-Policy",
    "Integration API rate limit: 120 requests per minute per IP, and a 429 lock-out after 10 failed API key attempts",
    "Dependency fixes: npm audit now reports 0 vulnerabilities (uuid, postcss, KaTeX updated)",
    "docs/SECURITY.md in the repo: what is protected and which dashboard settings to switch on",
  ],
  clauses: [],
  entries: [],
};
export default batch;
