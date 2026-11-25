# CEMP Web App: working notes for Claude

CEMP = **Construction Estimating and Management Platform** (name decided 2026-11-24; never expand it as "Civil Engineering Master Plumber"). Logo: truss over a dimension line, navy on gold, `public/icons/logo.svg` (also `app/icon.svg`).

Owner: Gemz (licensed CE, Master Plumber). Live: https://cemp.darkwizlab.com
Stack: Next.js 15 App Router + Supabase (project `CEMP`, ref `qzbcgwjnzwockhvimupr`, ap-southeast-1). Hosted on Vercel from `gemzscreen/cemp` (main auto-deploys).

## Release process (every batch), token-lean
1. **Content** (cards, tools, clauses) → new file `content/batches/vX_Y_Z.ts` (typed by `content/types.ts`), registered in `content/index.ts`. Do NOT paste content SQL through MCP. Gemz clicks **Admin → Sync content**; the server action upserts clauses, entries (status `review`), revisions, refs, tags, tool hand-checks (computed from `lib/calc`) and the `releases` row.
2. **Schema changes only** → `supabase/migrations/YYYYMMDDHHMMSS_vX_Y_Z_<name>.sql`, applied with `apply_migration` (keep DDL small).
3. Calculators → `lib/calc/<area>.ts`, registered in `lib/calc/index.ts`. Verify defaults against an independent hand/Python calc before pushing.
4. Diagrams → spec types in `lib/diagram.ts`, renderer in `components/Diagram.tsx`. Render-check with tsx + rsvg-convert before pushing.
5. Run `npm run check-content`, `npm run audit` (writes docs/AUDIT.md; must show 0 errors) and `npm run build`. Don't Read back generated files; check counts with grep/wc instead.
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

## Release gate (v1.0.0)
- `/admin/audit` checks the live DB: every batch synced, every entry published (or deprecated), refs and hand-checks present, **no hand-check drift** (stored examples recomputed with today's `lib/calc`), problem links to published tools. Tag a stable version only when it shows 0 blockers.
- If you change a calculator's results, re-sync its batch so the stored hand-check is re-recorded (v0.3.0 SQL-seeded tools: re-record via a batch entry with the same slug).
- Regulations change: DOLE DO 252 s.2025 superseded DO 198-18 (construction = Sec. 22); DPWH DO 32 s.2025 revised Item 405. Search before writing regulatory content.

## Organize & Estimate (v1.1.0)
- **Topic tree** in `lib/taxonomy.ts` (10 numbered groups → leaves). `entries.category` stores a leaf slug; null = inferred by `categoryOf` (explicit slug map → specialization → tags). New batch entries should set `category`. Codes use `clauseCategory(doc, section)`; reference tables use `TABLE_CATEGORY`.
- **Estimating calculators** in `lib/calc/estimate.ts` (keys `est-*`, registered in CALCS so the API/CSV reuse them). Each returns `materials[]` for the project BOM. Factors default to common PH estimating practice (editable presets via `Calc.presets`). Do not name individual authors (Gemz's rule). Verify defaults vs an independent Python calc; render-check `components/Sketch.tsx` with rsvg-convert/Chrome.
- **Projects**: `estimate_projects` (RLS: owner only). `addToProject` recomputes quantities server-side from calc key + inputs.
- **Archive/delete**: archive = status `deprecated` (hidden everywhere, restorable). Delete = row removed + `entry_tombstones` row; sync skips tombstoned and archived slugs.
- Brunei reference for the standards release: BS 8110 / BS 5950 + SMM2 (Gemz's choice).

## Roles
first account = admin (Gemz). Others viewer by default; editor promoted via SQL. Sign-ups disabled; users added by invite.

## Profile & layout (v1.1.1)
- `profiles.avatar` (data URL, ≤200 kB, resized client-side to 192 px) and `profiles.job_title`; users edit their own row on `/account`; role and e-mail stay admin-only (trigger).
- Header = QS CRM style "Welcome, <first name>" + avatar + role chip; footer = live clock (`components/Clock.tsx`) + version. Names via `displayName()` in `lib/auth.ts`.
- Mobile breakpoint 860 px: `HeaderNav` hamburger, `TopicNav` collapsible sidebar. Never put `overflow` on `.nav` (it clips the dropdowns).

## Standards side by side (v1.2.0)
- Batch field `standards: [{ slug, ph?, bn?, intl? }]` → table `entry_standards` (entry_id + std). Not part of the revision body, so in-app edits don't touch it; sync upserts it every time.
- `profiles.home_standard` (ph|bn|intl) orders the panels (`components/StandardsCompare.tsx`). Codes page filters by `code_documents.jurisdiction` (PH / BN / other = International).
- Brunei panels must stay `verified: false` until Gemz checks them against his BS copies (check-content enforces this).
- Names: `firstName()` in `lib/names.ts` skips a leading title (Engr., Arch., Dr. …).

## Games (v2.0.0)
- Engine `lib/truss/` (pure TS, reusable by the API): `sections.ts` (properties from plate geometry, fillets ignored), `solver.ts` (2D stiffness, N/mm), `index.ts` (`evaluate`, `checkMember` AISC 360-10 D/E, `template`), `levels.ts` (budgets ≈ 1.1 × cheapest auto-sized template; re-calibrate if loads, prices or JOINT_COST change). Verify engine changes against an independent numpy solve.
- UI `components/TrussBuilder.tsx` on `/games/truss?l=N`. Touch rules (v2.0.1): act on pointerup only if moved < 10 px; modes joint/member/select; hit radius in screen px via `ppm` (CTM scale); svg `touch-action: pan-x pan-y pinch-zoom`. (one page for all levels; level kept in client state so switching works offline). Hub `/games` reads `game_bests`.
- Storage `lib/truss/store.ts`: drafts + local bests in localStorage; runs queued and upserted to `game_runs` (owner-only RLS, unique user_id+client_id).
- Cost (v2.1.1): `costOf()` is the single formula (meter + `evaluate`): steel Σ kg/m × L × ₱/kg × 2 + every joint on the canvas × 2 × JOINT_COST. Meter = `.tb-meter` at the top of `.tb-canvas` (zoom lives inside it).
- Live load 4.3 kPa and L/360 are pedestrian-bridge practice (AASHTO guide used for DPWH footbridges), flagged "verify" in the UI. Connections are not designed (rupture uses Ae = 0.85 Ag).

## Printing
- Print CSS hides `form` by default; wrap printable content in `<form className="print-keep">` if it must live in a form. Panels may break across pages in print; keep rows whole (`tr { break-inside: avoid }`).

## Layout & text (v2.0.2)
- Grid/flex children holding tables need `min-width: 0` (`.lib` uses `minmax(0,1fr)`); wrap tables in `.tbl-wrap`.
- User text with TeX: render through `MathText` (server component, KaTeX). Long text: `ReadMore` (accepts children).

## Dashboard, Projects, Scroll (v2.1.0)
- Dashboard grid = MODULES tiles + `.tile.dark` cards (Games, Projects) + `.tile.scroll` (darkwizscroll theme). Library menu lists the same three. Header icons: `components/NavIcon.tsx` (no unicode glyphs in the nav).
- Games: registry `lib/games.ts` (add a row + route per new game); hub `/games` shows dark `.game-card`s then the Truss level list.
- Projects: items are revised via `/estimate/<calc>?p=<project>&i=<item>` → `updateItem` (server recompute, same id/position). BOM is grouped by item (`groupByItem` + `components/BomTable.tsx`); prices stay one per material key (`price:<key>`), shared by every item.
- darkwizscroll: source `content/scroll/darkwizscroll.html` (edit this, never `lib/scroll/html.ts`, which `npm run build-scroll`/prebuild generates). Served at `/scroll` behind login. Its `window.claude.use` shim talks to `/api/scroll` → table `scroll_docs` (collection cards|votes|ideas, one doc per user) + `scroll_names()`. The old claude.ai artifact (slug 72825dbc-…) is now legacy.
- MathText: scanner, not regex (see the header comment). Keep the test cases in mind: `$a$$b$`, `$5 and $10`, `\$`, `$$…$$` on its own line.
