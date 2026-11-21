# CEMP Web App: working notes for Claude

Owner: Gemz (licensed CE, Master Plumber). Live: https://cemp.darkwizlab.com
Stack: Next.js 15 App Router + Supabase (project `CEMP`, ref `qzbcgwjnzwockhvimupr`, ap-southeast-1). Hosted on Vercel from `gemzscreen/cemp` (main auto-deploys).

## Release process (every batch)
1. Schema/data changes → new file in `supabase/migrations/YYYYMMDDHHMMSS_vX_Y_Z_<name>.sql`, applied via Supabase MCP `apply_migration` with the same SQL.
2. Insert a row in `public.releases` (version, batch_name, notes_md, released_at) in that migration.
3. Bump `APP_VERSION` in `lib/modules.ts` and `version` in package.json.
4. Update CHANGELOG.md and the roadmap table in README.md.
5. `npm run build` must pass before pushing to main. Run Supabase security advisors after DDL.

## Content rules (non-negotiable)
- Codes module is an **index**: section no., title, formulas, limits + summary in Gemz's own words. Never paste code/book text verbatim.
- English only.
- Every Practice/Code entry needs ≥1 clause ref; every Tool needs a recorded hand-check. The DB `publish_gate` trigger enforces this. Only admin publishes.
- Unverified reference data must carry `data.verified = false` (shows a "verify" badge). Don't present guesses as facts.
- Practice diagrams = JSON diagram spec rendered to SVG in-app (engine arrives v0.2.0). No uploaded infographics from other engineers.
- Calculation/conversion math lives in shared `lib/*.ts` so the v0.8.0 integration API reuses it (darkwizscroll, DARKWIZ CT read from CEMP).

## Roles
first account = admin (Gemz). Others viewer by default; editor promoted via SQL. Sign-ups disabled; users added by invite.
