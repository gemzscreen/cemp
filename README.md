# CEMP Web App

Civil Engineering practices library: **Codes · Tools · Conversions · Practices · Education**.
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

## Roadmap
| Version | Batch |
|---|---|
| v0.0.0 | Foundation ✅ |
| v0.1.0 | Conversions + PH rebar/material tables ✅ |
| v0.2.0 | Diagram engine + Concrete Practices I ✅ |
| v0.3.0 | Concrete Tools + NSCP 2015 clause index ✅ |
| v0.4.0 | Steel, Welding, Bolting ✅ |
| v0.5.0 | CM I: PERT/CPM, QS, Cost Estimating ✅ |
| v0.6.0 | CM II: QA/QC, Safety |
| v0.7.0 | Education: CELE + PH ↔ Global |
| v0.8.0 | Integration API (darkwizscroll, DARKWIZ CT), search, bookmarks, Excel/PDF export |
| v0.9.0 | Admin editor, review queue, revision diffs, offline/PWA |
| v1.0.0 | Content audit → stable release |
