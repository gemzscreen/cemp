# CEMP Web App

**Construction Estimating and Management Platform.** Quantity estimates and project BOMs, design checks with step-by-step working, site practice cards, conversions and an engineering reference library.
Next.js 15 (App Router) + Supabase (Auth, Postgres, Storage). Target: `https://cemp.darkwizlab.com`.

CEMP is the **single source of truth** for verified CE content. darkwizscroll (practice cards) and
DARKWIZ CT (calculators) will read from it via the integration API planned for v0.8.0.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in the publishable key
npm run dev                  # http://localhost:3000
```

## Supabase
- Project: `CEMP` · ref `qzbcgwjnzwockhvimupr` · region ap-southeast-1
- Migrations live in `supabase/migrations/` (already applied).
- **Invite-only:** Dashboard → Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
  Add people with Authentication → Users → *Invite user*.
- The **first** account created becomes `admin`. Everyone after is `viewer`. Promote an editor:
  ```sql
  update public.profiles set role = 'editor' where email = 'friend@example.com';
  ```
- Auth → URL Configuration: Site URL `https://cemp.darkwizlab.com`, add redirect
  `https://cemp.darkwizlab.com/auth/callback` (and `http://localhost:3000/auth/callback` for dev).

## Deploy (GitHub → Vercel → cemp.darkwizlab.com)
1. Push this folder to a GitHub repo (e.g. `cemp-web-app`).
2. Import the repo in Vercel; set env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
3. Vercel → Domains → add `cemp.darkwizlab.com`; at your DNS add `CNAME cemp → cname.vercel-dns.com`.

> GitHub Pages alone can't run the login middleware/server routes, which is why Vercel (free tier) hosts it from the GitHub repo.

## Content rules
- **Codes are an index, not a copy.** Store section numbers, titles, formulas and limits, plus a summary in your own words. Never paste code text verbatim.
- Every entry has revisions (`entry_revisions`) stamped with the code edition and reviewer.
- Practice diagrams are stored as a JSON **diagram spec** and rendered as SVG in-app (renderer ships v0.2.0).

## Content model (body JSON, v0)
```json
{ "sections": [
  { "kind": "safe",  "heading": "Safe to splice", "items": ["Top bars: middle 0.4Ln"] },
  { "kind": "avoid", "heading": "Avoid", "items": ["Top bars near supports"] },
  { "kind": "list",  "heading": "Terms", "items": ["Ln = clear span"] }
]}
```

## Integration API (v0.8.0)
Read-only, key-authenticated API at `/api/v1` for darkwizscroll, DARKWIZ CT and other apps. Published content only.
- Keys: Admin → Integration API keys (shown once; only a SHA-256 hash is stored in `api_clients`). Send `Authorization: Bearer <key>`.
- Endpoints: `GET /api/v1/entries`, `/entries/{slug}`, `/clauses`, `/calcs`, `/calcs/{key}`, `POST /calcs/{key}` (`?format=csv`). Full docs in-app at `/api-docs`.
- DB access goes through `api_entries`, `api_clauses`, `api_check` (security definer, key-gated); no service-role key on Vercel.
- Browser callers need their origin in `CEMP_API_CORS_ORIGINS`.

## Roadmap
| Version | Batch |
|---|---|
| v0.0.0 | Foundation ✅ |
| v0.1.0 | Conversions + PH rebar/material tables ✅ |
| v0.2.0 | Diagram engine + Concrete Practices I ✅ |
| v0.3.0 | Concrete Tools + NSCP 2015 clause index ✅ |
| v0.4.0 | Steel, Welding, Bolting ✅ |
| v0.5.0 | CM I: PERT/CPM, QS, Cost Estimating ✅ |
| v0.6.0 | CM II: QA/QC, Safety ✅ |
| v0.7.0 | Education: CELE + PH ↔ Global ✅ |
| v0.8.0 | Integration API (darkwizscroll, DARKWIZ CT), search, bookmarks, Excel/PDF export ✅ |
| v0.9.0 | Admin editor, review queue, revision diffs, offline/PWA ✅ |
| v1.0.0 | Content audit → stable release (rc.1–rc.2 shipped: audit, release gate, fix pass, guides, speed; content gate still open) |
| v1.1.0 | Organize + Estimate: topic tree, new nav, account/password, archive/delete, 13 estimating calculators with sketches, project BOM ✅ |
| v1.1.1 | Profile (name, title, photo), welcome header + clock footer, Dashboard link, mobile menu, ℓo card rewrite ✅ |
| v1.2.0 | Standards side by side: PH (NSCP/DPWH) · Brunei (BS 8110/5950 + SMM2) · International (ACI/AISC) panels per entry, home standard, codes filter ✅ |
| v1.3.0 | Depth: new name & logo, 5 finishing/roof estimators, standards panels on 14 entries ✅ |
| v2.0.0 | Games: Truss Builder (real NSCP/AISC member checks, ₱ cost, offline) ✅ |
| v2.1.0 | Dashboard cards (Games, Projects, darkwizscroll), Games hub, darkwizscroll merged at /scroll, revise saved items, BOM grouped by item ✅ |
| v2.1.1 | Truss Builder live cost meter ✅ |
| v2.3.0 | Truss Builder: drag joints, deck types, BS 5950 option, crowd patch loading + crossing animation, re-calibrated budgets ✅ |
| v2.2.0 | Project costing (labour, equipment, OCM, profit, VAT), client quotation (print/PDF), .xlsx workbook with formulas ✅ |
