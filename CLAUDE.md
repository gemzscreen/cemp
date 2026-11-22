# CEMP Web App: working notes for Claude

Owner: Gemz (licensed CE, Master Plumber). Live: https://cemp.darkwizlab.com
Stack: Next.js 15 App Router + Supabase (project `CEMP`, ref `qzbcgwjnzwockhvimupr`, ap-southeast-1). Hosted on Vercel from `gemzscreen/cemp` (main auto-deploys).

## Release process (every batch), token-lean
1. **Content** (cards, tools, clauses) → new file `content/batches/vX_Y_Z.ts` (typed by `content/types.ts`), registered in `content/index.ts`. Do NOT paste content SQL through MCP. Gemz clicks **Admin → Sync content**; the server action upserts clauses, entries (status `review`), revisions, refs, tags, tool hand-checks (computed from `lib/calc`) and the `releases` row.
2. **Schema changes only** → `supabase/migrations/YYYYMMDDHHMMSS_vX_Y_Z_<name>.sql`, applied with `apply_migration` (keep DDL small).
3. Calculators → `lib/calc/<area>.ts`, registered in `lib/calc/index.ts`. Verify defaults against an independent hand/Python calc before pushing.
4. Diagrams → spec types in `lib/diagram.ts`, renderer in `components/Diagram.tsx`. Render-check with tsx + rsvg-convert before pushing.
5. Run `npm run check-content` and `npm run build`. Don't Read back generated files; check counts with grep/wc instead.
6. Bump `APP_VERSION` in `lib/modules.ts` and `version` in package.json; update CHANGELOG.md and the README roadmap.
7. Push to main (Vercel auto-deploys). Run Supabase security advisors after DDL.
8. Handover: update the Project doc `claude/cemp-progress.md` (status, review queue, next step).

## Content rules (non-negotiable)
- Codes module is an **index**: section no., title, formulas, limits + summary in Gemz's own words. Never paste code/book text verbatim.
- English only.
- Every Practice/Code entry needs ≥1 clause ref; every Tool needs a recorded hand-check. The DB `publish_gate` trigger enforces this. Only admin publishes.
- Unverified reference data must carry `data.verified = false` (shows a "verify" badge). Don't present guesses as facts.
- Practice diagrams = JSON diagram spec rendered to SVG in-app (engine arrives v0.2.0). No uploaded infographics from other engineers.
- Calculation/conversion math lives in shared `lib/*.ts` so the v0.8.0 integration API reuses it (darkwizscroll, DARKWIZ CT read from CEMP).

## In-app edits (v0.9.0)
- Editors/admins can edit entries in the app (`/entry/<slug>/edit`). Each save is a new revision with `source = 'app'`.
- **Sync never overwrites an in-app edit**: it skips entries whose current revision has `source = 'app'` and lists them in the sync log. Before changing such an entry in a batch file, copy the in-app version into the batch (use History → diff), then re-sync.
- DB guards: a published entry can only point to a reviewed revision; only the admin can stamp `reviewed_by/reviewed_at`.

## Roles
first account = admin (Gemz). Others viewer by default; editor promoted via SQL. Sign-ups disabled; users added by invite.
