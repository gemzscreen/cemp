# Changelog

All notable changes to CEMP Web App. Versions follow SemVer: each content batch bumps the minor version (v0.x.0), fixes bump the patch.

## v2.3.0: Truss Builder patches (2026-11-26)
- **Drag joints** (`components/TrussBuilder.tsx`): mouse drags any free joint in Select/Joints mode; touch drags the selected joint through an HTML grab handle (`.tb-grab`, touch-action none: Chrome ignores touch-action on SVG shapes). Snaps to the grid, live cost follows, one undo step per move. Selection and the cost flash wait for the drop so nothing shifts the canvas mid-drag.
- **Deck types** (`DECKS` in `lib/truss/levels.ts`): timber 1.0, grating 0.5, precast planks 1.8, RC slab 100 mm 2.6 kPa (typical, verify) + per-level `extra` dead load (railings 0.2 kPa on L3, water mains 3.0 kPa on L4). Defaults reproduce every level's previous dead load.
- **BS 5950-1:2000 option** (`checkBS5950`, `pcBS`): 1.4D + 1.6L and 1.0D + 1.6L; py = Fy; LE = 1.0 L; strut curve c (Annex C, a = 5.5, E = 205 kN/mm²); tension Ae = Ke·an ≤ Ag with an = 0.85 Ag, angles via 4.6.3 (single 0.5 a2, back-to-back 0.25 a2). λ ≤ 180 kept as a game rule (the 2000 edition removed fixed limits, SCI AD 270). pc verified against an independent Python implementation.
- **Crowd patch loading**: live load on every run of panels from either end (2n − 1 positions + none), computed by superposing one solve per panel (`analyse`); verified against a brute-force numpy solve of every case (max difference 1e-11 kN). Partial crowds raise some diagonal forces 1.5–2.8× above the full-span case.
- **Crowd crossing animation** (`crossing()` frames): walkers on/off, interpolated deflected shape (exaggerated), members coloured by utilisation per crowd position, worst-so-far ratio.
- **Budgets** re-calibrated per level × deck × code by `scripts/truss-calibrate.ts` (`npm run truss-calibrate`): cheapest auto-sized Warren/Pratt/Howe over all grid depths, scaled from the v2.0.0 base budgets. Table `BUDGETS` + `budgetFor()`. Standard-setting budgets: L5 ₱101k → ₱102k, L6 ₱187k → ₱191k, others unchanged.
- **Scores**: migration `v2_3_0_game_run_settings` adds `game_runs.deck/code/std`; `game_bests.best_cost` uses standard-setting runs only; stars count in any setting. Settings remembered per level on the device.

## v2.2.0: Costing and quotations (2026-11-26)
- **Costing engine** `lib/costing.ts` (one formula for panel, quotation and workbook): per item materials (saved unit prices × BOM quantities), labour (% of materials or crew × rate × days), equipment → direct cost; OCM and profit on direct cost; item lump sum = direct × (1 + OCM% + profit%) rounded to centavos; VAT on the sum of the rounded lump sums. Verified against an independent Python calc (₱30,468.75 + VAT ₱3,656.25 = ₱34,125.00) and after LibreOffice recalculation of the workbook.
- **Costing panel** (`components/CostingPanel.tsx`) on the project page: live totals, cost shares, unpriced-line warning, Save → `saveCosting` (normalized server-side, removed items dropped). Stacks into cards on phones.
- **Quotation** `/estimate/projects/[id]/quote` (`components/QuoteDoc.tsx` + `QuoteEditor.tsx`): issuer header and logo, To/Project/Location, item lump sums (1 lot each), VAT, total, amount in words (`pesoWords`), payment terms, T&C, validity date, Prepared by / Conforme. Default number `Q-YYMMDD-XXXX`, date in Asia/Manila. Prints alone on A4.
- **Workbook** `/estimate/projects/[id]/xlsx` (`lib/quote-xlsx.ts`, exceljs): Quotation → Cost build-up → BOM with live formulas (SUMIF from BOM, IF for labour method, ROUND for lump sums) plus cached results; blue input cells; unpriced cells yellow.
- **Issuer details** on /account (`components/IssuerForm.tsx`, `lib/issuer.ts`): company, signatory, title, PRC nos., address, phone, e-mail, TIN, logo (resized on device).
- DB: migration `v2_2_0_costing_quotation` adds `estimate_projects.costing` and `profiles.issuer` (jsonb, size-checked; existing RLS covers both).

## v2.1.1: Truss Builder live cost meter (2026-11-25)
- **Live cost:** `costOf(design)` in `lib/truss/index.ts` is the one cost formula, used by the meter and by `evaluate`, so the live figure always equals the load-test cost. The meter at the top of the canvas updates on every joint, member, section change, delete, undo and template, and flashes the change (+₱ / −₱).
- **Budget bar** with 3★ (≤ 90%) and 2★ (budget) marks; green → amber → red; ₱ left / ₱ over; breakdown of steel (kg, ₱) and joints (count × ₱1,200 for both trusses).
- **Rule change:** every joint on the canvas now costs money as soon as it is placed (before, loose joints were free). Loose joints are flagged in the meter and in the results. The 18 calibration templates give the same cost as before, so level budgets are unchanged.
- Members mode with a mouse: hovering the next joint previews "next member +₱". A selected member shows id, section, length, kg and ₱. The section list shows ₱/m; the results table has a cost column. Zoom controls moved into the meter bar.

## v2.1.0: Projects, Games and darkwizscroll on the dashboard (2026-11-25)
- **Dashboard cards:** the Games hero is gone; **Games** and **Projects** are dark navy cards in the card grid, and **darkwizscroll** has its own blueprint card (navy grid, hi-vis yellow). Library menu lists Projects, Games and darkwizscroll under the modules. Account menu: "My estimates" → "My projects".
- **Games hub** (`/games`): one dark card per game from `lib/games.ts` (Truss Builder live with ★ total; Splice Zone, Pipe Puzzle, Guess the Quantity, Critical Path Rush, Spot the Hazard, Beam Optimizer marked Coming soon), then the Truss Builder level list. Icons in `components/GameIcon.tsx`.
- **darkwizscroll merged:** the single-file app now lives in `content/scroll/darkwizscroll.html` and is served behind the CEMP login at `/scroll` (`app/scroll/route.ts`; `scripts/build-scroll.ts` bakes it into `lib/scroll/html.ts` on prebuild). A small shim replaces the artifact's `window.claude.use("db"/"user")` with `/api/scroll` (session auth) and the new `scroll_docs` table (migration `v2_1_0_scroll_docs`: cards and votes readable by every signed-in user, ideas by the writer and editors; each user writes only their own document, the admin may rewrite any cards document to remove a card). Author names come from `scroll_names()`. Snapshots poll every 30 s. "← CEMP" link in the sidebar and top bar. Progress (sparks, streak, saves) stays in the browser as before.
- **Revise a saved estimate:** on a project, click an item (or "revise") → the calculator opens with the saved inputs and label (`/estimate/<calc>?p=<project>&i=<item>`). **Update item** recomputes on the server and replaces the item in place (`updateItem`; same id and position, `updatedAt` stamped); **Save as new item** keeps the original.
- **BOM grouped by item** (`components/BomTable.tsx`, `groupByItem` in `lib/bom.ts`): each item heads its own block with its materials, a subtotal and a revise link; one unit price per material fills every block (live amounts). A collapsible **Combined by material** purchase list follows. CSV export uses the same layout.
- **Header:** brand shows only "CEMP" (full name kept in the tooltip and footer); ⌂ / ✎ / ▲ glyphs replaced by line icons (`components/NavIcon.tsx`).
- **Notes formulas fix:** `MathText` now uses a scanner instead of a regex. Two formulas written back to back (`…$$\text{…}$`) were read as a display formula and swallowed the following sentences; a closing `$` followed by a letter was also refused. Rules now: inline `$…$` stays on one line, closes on a non-space and not before a digit; `$$…$$` only at a line/word start; `\$` is a literal dollar.

## v2.0.2: Formulas in notes, Conversions on phones (2026-11-24)
- **Math in notes:** `components/MathText.tsx` typesets `$…$`, `$$…$$`, `\(…\)` and `\[…\]` with KaTeX on the server (no KaTeX JavaScript sent to the browser; CSS only). Bad TeX shows in red instead of breaking the page. Money amounts like "$5 and $10" are left as text. Used on the Saved page (inside Read more) and on entry notes.
- **Phone layout:** library grids (`.lib`) use `minmax(0, 1fr)` so a wide table can't stretch the page (the Conversions page was twice the screen width, shrinking the header). Tables scroll inside their card with edge shadows; slightly tighter table padding on phones.

## v2.0.1: Play-test fixes (2026-11-24)
- **Truss Builder on phones:** tool modes (✚ Joints / ⟋ Members / ☝ Select) so a tap only does one thing; taps act on release and are ignored if the finger moved more than 10 px (scrolling and swiping no longer add joints); hit areas sized in screen pixels (about a fingertip); arrow buttons move a selected joint one grid step; Done ends a member chain; starting zoom 150–200% on phones for spans of 9 m and up; dashed preview of the joint under the mouse on desktop. Templates switch to Select mode.
- **Read more:** dashboard What's new (3 lines) and saved Notes (2 lines) are clamped with Read more / Show less; What's new stacks on phones instead of a narrow column.
- **Printing an estimate:** the bill of materials was inside a form, and print mode hid every form, so the BOM didn't print and the Items list was pushed to page 2. The BOM form now prints, panels may break across pages (rows stay whole), table headers repeat, and page margins are tighter. A small "CEMP · printed <date>" line heads the printout.

## v2.0.0: Games · Truss Builder (2026-11-24)
- **Games** section (header ▲ Games, dashboard card) with **Truss Builder**: tap grid points to place joints, tap two joints to connect, pick a section per member (single/double angles, square tubes, round pipes), or start from a Pratt, Howe or Warren template.
- **Real checks** run in the browser: 2D direct-stiffness analysis (`lib/truss/solver.ts`), loads from deck dead load, pedestrian live load and self-weight, combos 1.4D and 1.2D + 1.6L, members checked to AISC 360-10 / NSCP 2015 (tension yielding and rupture, compression buckling with Fcr, KL/r ≤ 200, L/r ≤ 300), live-load deflection ≤ L/360. Tap any member row for the step-by-step check. Results verified against an independent numpy solve and a method-of-sections hand check.
- **6 levels** (6, 9, 12, 15, 18, 24 m), ₱ cost from steel weight and joint count, stars: 1 = pass, 2 = within budget, 3 = ≤ 90% of budget.
- **Offline**: one page plays every level; drafts are kept on the device; runs queue locally and sync to the new `game_runs` table (owner-only RLS, de-duplicated by client id) when online. Personal bests via the `game_bests` view. "Save Truss Builder for offline" button on the Games page.
- Zoom (100–400%) with horizontal scroll for phones.

## v1.3.0: Depth (2026-11-24)
- **New name and logo.** CEMP now stands for **Construction Estimating and Management Platform**. New logo (truss over a dimension line, navy on gold) used in the header, login page, favicon and app icons. Header shows the full name on wide screens.
- **5 new estimators** (Estimate → add to project BOM): floor & wall tiles (pieces, boxes, adhesive or mortar bed, grout), painting (primer/finish gallons, optional skim coat), gypsum ceiling on metal furring (boards, furring, carrying channels, wall angle, hangers, screws, tape, compound), waterproofing with wall upturns (kg, kits, corner tape), roof gutter & downspout (pieces, brackets, end caps, outlets, pipes, elbows, sealant). 18 estimators in total. Defaults checked against an independent Python calculation.
- **Standards side by side on 6 more entries:** development length & lap splice, slab lap zones, one-way slab thickness & shrinkage steel, steel plate in tension, steel W-column compression, quantity takeoff measurement (DPWH pay items vs SMM2 vs NRM2/CESMM4). 14 entries now have panels.
- 5 more BS clauses in the index (BS 8110 3.12.8, 3.4.6, 3.12.5; BS 5950 4.6, 4.7), all marked to verify.

## v1.2.0: Standards side by side (2026-11-24)
- Entries can show **PH · Brunei · International** panels next to each other (stacked on phones). Your **home standard** (Profile) is shown first and outlined.
- Panels on 8 entries: concrete cover, bar spacing, hooks and bends, curing, strength sampling and acceptance, column confinement zone (ℓo), bolt holes and edge distance, fillet weld sizes. Every Brunei panel carries a "verify" badge until checked against the BS copies.
- Codes: filter by standard (All / Philippines / Brunei / International). BS 8110-1:1997, BS 5950-1:2000 and SMM2 added as Brunei reference documents with a 6-clause index.
- Merged duplicate: the concrete testing plan card no longer repeats the sampling frequency rules; they live in "Concrete strength sampling and acceptance".
- DB: `entry_standards` (RLS: read follows the entry, write editor/admin) and `profiles.home_standard` (migration v1_2_0_standards).

### Fixes from v1.1.1 feedback
- Dashboard greeting and header name skip a leading title: "Good morning, Engr. Gemz" and "Welcome, Gemz" (was "Engr.").
- Library/Admin menu: the highlighted item stays readable (navy text; the header's white hover colour leaked into the dropdown).
- Login page: one-line description of the app and a "Powered by Darkwiz Lab" footer.
- Estimating factor labels no longer name an individual author ("PH practice" presets; values unchanged).

## v1.1.1: Profile, mobile, fixes (2026-11-22)
- Header: new ⌂ Dashboard link; Library/Admin menus no longer clipped (the nav had overflow-x:auto) and use larger, wrapping text.
- "Welcome, <name>" chip with avatar and role badge (QS CRM style). Names fall back to a readable form of the e-mail ("gem.tubalado" → "Gem Tubalado").
- Profile page (/account): edit display name, title/position and photo (resized to 192 px on the device), plus the password form.
- Footer with live date and time, Darkwiz Lab credit and version. Dashboard greets by time of day with today's date.
- Dashboard "Estimate a job" card: removed the white underline on hover.
- Mobile: ☰ menu with search inside, topic sidebar collapses to "Browse topics", single-column grids, 16 px inputs (no iOS zoom), stacked footer.
- DB: profiles.avatar (data URL ≤ 200 kB) and job_title; e-mail changes are admin-only (migration v1_1_1_profile).
- Content batch v1.1.1: column confinement card rewritten (what ℓo is, end vs middle zone, worked example).
- Accuracy fix (batch v0.4.0): standard bolt hole for M24 is d + 3 = 27 mm (was listed under d + 2).

## v1.1.0: Organize + Estimate (2026-11-22)
- **One numbered topic tree** (`lib/taxonomy.ts`): 1 Concrete · 2 Masonry & finishes · 3 Steel · 4 Lumber · 5 Earthworks & foundations · 6 Water & sanitary · 7 Safety · 8 Quality · 9 Estimating & scheduling · 10 Review & reference, each with sub-topics. Tools, Practices, Learn, Codes (clauses placed by document/section) and Conversions (reference tables) now have a sidebar tree with counts, grouped card sections and a filter box. Every existing entry is placed explicitly; new ones by category or inference. Editor and New entry have a category picker; batches may set `category`.
- **Navigation**: Library ▾ (Tools, Practices, Codes, Conversions) · Estimate · Learn · search · account menu (Saved, My estimates, Change password, Help, Sign out) · Admin menu (Review, Audit, Sync & API keys, New entry, Releases, API docs).
- **Change password** page (`/account`).
- **Archive / delete entries** (admin): archive hides an entry everywhere and is restorable; delete (type DELETE) removes it with its revisions and leaves a tombstone so content sync never recreates it. Sync also skips archived entries. CELE exam overview removed from the v0.7.0 batch.
- **Estimate workspace** (`/estimate`): 13 quantity calculators: isolated footing, wall footing, beam (tie beam/girder/lintel), column, slab, concrete wall, stairs, CHB wall (blocks, mortar, bars), cement plaster, concrete ground water tank, septic tank (CHB walls, baffles, slabs, plaster), steel stand for an overhead tank, lumber board feet. Each has a dimensioned parametric sketch, PH practice presets (editable, highlighted), per-unit material snapshot, key results, BOM, cutting list, step-by-step working, CSV and print. Rebar counted bar by bar from spacing and cover, cut from 6–12 m stock with 40db laps beyond stock length; tie wire No. 16 per intersection; formwork contact area and plywood sheets. All 13 defaults matched an independent Python implementation.
- **Projects / BOM** (`/estimate/projects`): add calculator results to a project (quantities recomputed on the server), aggregated bill of materials with unit prices and totals, item list, CSV export and print. Private per user (RLS).
- Migration `v1_1_0_organize_estimate`: `entries.category`, `entry_tombstones`, `estimate_projects`.
- Dashboard: Estimate entry point and a "Browse by topic" grid replace the specialization chips.

## v1.0.0-rc.2: Speed and progress feedback (2026-11-22)
- **Functions now run in Singapore** (`vercel.json` → `sin1`), next to the Supabase database (ap-southeast-1). Before, every query crossed from the US default region (~200 ms each).
- **One auth check per request**: `lib/auth.ts` (`getMe`, `getDb`) caches the session and role for the layout and page together; `getClaims()` replaces `getUser()` in pages and middleware (local JWT verification with asymmetric keys; forged cookies still rejected).
- **Entry page**: entry, tool, bookmark and notes load in one parallel round instead of ~8 sequential queries.
- **Sync**: one upsert for all clauses, one query for all existing entries, 6 entries processed at a time with parallel writes per entry; all failures reported together (release recorded only if none). `maxDuration = 60`.
- **Feedback**: buttons show a spinner and “Syncing v0.x…”/“Publishing…” while working and block double clicks (`components/SubmitButton.tsx`); every page shows an instant loading skeleton on navigation (`app/(app)/loading.tsx`).

## v1.0.0-rc.1: Content audit, release gate, fix pass, guides (2026-11-22)
Release candidate. v1.0.0 is tagged when `/admin/audit` shows 0 blockers (all batches synced, all entries reviewed and published).
- **Audit**: `lib/audit.ts` (verify flags, hand-check drift, repo checks); `npm run audit` → `docs/AUDIT.md` (0 errors, 3 verify warnings at release); `/admin/audit` live release gate with blockers (unsynced batches, unpublished entries, missing refs/hand-checks, hand-check drift, problems linking to unpublished tools) and warnings (verify flags, in-app edits not yet in the repo, missing edition stamps, flagged reference tables). Drift check run against all 15 stored hand-checks: 0 drifting; tampered value detected.
- **Fix pass (regulations changed in 2025)**:
  - OSH: DOLE **DO 252 s.2025** (Revised IRR of RA 11058, 29 Apr 2025) supersedes DO 198-18. Construction rules are in **Sec. 22**. The OSH personnel tool now uses the Sec. 22 table (safety officers, first-aiders, nurses, physicians, dentist); v0.6.0 cards, clauses, CSHP outline (approval route, new components) and flashcards updated. Batches can now declare code documents: v0.6.0 adds DO 252 (current) and marks DO 198 superseded on sync.
  - DPWH **Item 405 revised by DO 32 s.2025**: pay items split by specified strength; payment = final quantity placed and accepted (m³). v0.5.0 clause summary, concrete-classes card, takeoff card and flashcard corrected.
  - One-way slab tool: Grade 415 note on the 420 MPa temperature-steel boundary (shows the ρ = 0.0020 alternative); results unchanged.
  - NSCP Ch. 5 numbering: 504.2 and 510.3 confirmed against AISC D/J mapping.
- **Guides**: in-app Help (`/help`: trust and limits, using CEMP, editors, admin). Help link in the nav.

## v0.9.0: Editor, review queue, revision diffs, offline/PWA (2026-11-22)
- **In-app editor** (`/entry/<slug>/edit`, editors + admin): title, summary, code-edition stamp, clause refs (`DOC | section | note`), tags, and every section kind (text, list, safe, avoid, table, flashcards, problem JSON, diagram JSON) with add/move/remove, "verify" flag and live preview. Each save = new revision (`source = 'app'`) with a required change note; published entries go back to review. Shared validation in `lib/sections.ts` (also used by `check-content`).
- **New entry** (`/entry/new`): practice, code or education drafts.
- **History & diff** (`/entry/<slug>/history`): all revisions with source, author, change note, reviewer; line diff between any two (LCS); restore an old revision as a new one.
- **Review queue** (`/admin/review`): filter by module, status, source, title; gate status per entry (missing clause ref / hand-check); bulk "mark reviewed & publish", "send drafts to review", "back to draft"; failures reported per entry.
- **Sync** keeps in-app edits (skips entries whose current revision is `source = 'app'`, lists them in the log).
- Migration `v0_9_0_editor_guards`: `entry_revisions.source`; trigger stopping a published entry from pointing to an unreviewed revision (tested); trigger allowing only the admin to stamp reviews (on insert and update).
- **PWA / offline**: web manifest + icons, service worker (`public/sw.js`): cache-first static assets, network-first pages with offline fallback, no caching of API/admin/auth/edit pages, caches wiped on sign-out. Saved page: "Make available offline" stores bookmarked entries, module lists and their scripts, so calculators run without signal.

## v0.8.0: Integration API, search, bookmarks, export (2026-11-22)
- **Integration API** `/api/v1` (route handlers, `lib/api.ts`): entries (filter by module, `updated_since`, paging), single entry, clause index, calc catalog, calc detail with worked example, `POST` compute with input validation, `?format=csv`. Bearer/`x-api-key` auth; optional CORS allow-list. In-app docs at `/api-docs`.
- Migration `v0_8_0_integration_api`: `api_clients` (admin-only RLS; SHA-256 key hashes, scopes `content`/`calc`, active flag, last-used stamp), key-gated security-definer functions `api_check`, `api_entries`, `api_clauses` (published content only), internal `api_client_ok` (not executable by clients), and `search_entries` (security invoker, so RLS applies).
- Admin: create API keys (shown once), revoke / re-activate, last-used time.
- **Search** page + header search box: entry titles, summaries and card bodies; code clauses; calculator titles.
- **Bookmarks & private notes** on every entry; new **Saved** page.
- **Export**: "Download CSV (Excel)" on every tool and checklist (inputs, results, checks, table, steps; UTF-8 BOM for Excel). Shared `lib/export.ts` also powers the API CSV output.
- Tested: DB functions with a temporary key (scope enforcement, published-only, clause index; key deleted after), route handlers for 401/403/400/404/200/CSV.

## v0.7.0: Education, CELE + PH ↔ Global (2026-11-22)
- New section kinds (`content/types.ts`, `components/Sections.tsx`): comparison **tables**, **flashcard** decks (tap to reveal, no client JS) and **worked problems** (given/find, hidden solution, answer, link to the calculator). Any section can carry `verified: false` → "verify" badge. Entry page now renders sections through the shared component.
- Worked problems are generated from `lib/calc` inside the batch (`problem()` helper), so answers always equal the tool output. All 10 matched an independent Python check.
- HGE calculators (`lib/calc/hge.ts`): hydrostatic force on a rectangular gate (vertical/inclined, center of pressure), primary consolidation settlement (NC, OC below/above σ'c).
- Content batch v0.7.0 (17 entries): CELE overview (2026 format: PSAD Day 1; AMSTHC + HGE Day 2) and 3 subject outlines; 4 flashcard decks (68 cards); 3 worked-problem sets (10 problems); 2 HGE tools; PH ↔ Global: NSCP vs US source codes, PH vs Brunei/Singapore/Malaysia (flagged verify), cylinder vs cube strength (flagged verify), site terminology.
- `check-content` validates table widths, empty decks, problem answers and problem → tool links.

## v0.6.0: Construction Management II, QA/QC & Safety (2026-11-22)
- Checklist engine (`lib/calc/checklist.ts`): pass/fail/N.A. inspection forms run in the ToolRunner with grouped headings, verdict (accepted only when nothing fails or is left unchecked), failed-item table and a **Print / save as PDF** button with print styles. Items default to "Not checked" so forms can't be pre-filled.
- 7 checklists: pre-pour, rebar placement, formwork & shoring, steel bolting & visual weld (AISC 360 N5), scaffold, excavation, daily site safety walk.
- QA/QC calcs (`lib/calc/qaqc.ts`): concrete sampling frequency (NSCP 426.12.2 vs DPWH 1 set/75 m³) and strength acceptance (running average of 3, f'c − 3.5 / 0.9f'c single-test limit).
- Safety calcs (`lib/calc/safety.ts`): OSH personnel by workforce (DO 198-18 high-risk table; brackets above 50 flagged to verify), FR/SR/TRIR, JHA with 5 × 5 risk matrix. All defaults matched an independent Python check.
- Content batch v0.6.0: 12 tools, 6 practice cards, 2 explainers; 16 clauses indexed (NSCP 426.6/426.11/426.13, AISC 360 N5, RA 11058 Secs. 5–16, DO 198-18 Secs. 14–15). `DOCS` gains RA 11058 and DOLE DO 198.
- `check-content` now validates refs to every document (not only NSCP) against clauses from the same or earlier batches.

## v0.5.0: Construction Management I (2026-11-22)
- `lib/calc/cm.ts`: PERT/CPM scheduler (text activity list, forward/backward pass, float, critical path, σ, probability via normal CDF), cost build-up (DC/OCM/profit/VAT/unit cost), concrete materials takeoff by class, rebar weight + commercial-length takeoff. All defaults matched an independent Python check.
- Calc core: `text` input fields and `table` outputs; ToolRunner renders textarea and result tables (critical path highlighted).
- Content batch v0.5.0: 4 tools, 3 QS practice cards, 2 education explainers, DPWH Blue Book Items 404/405 indexed.

## v0.4.0: Steel, Welding & Bolting (2026-11-22)
- Steel calculators (`lib/calc/steel.ts`): plate tension (yield/rupture), W-shape compression (E3), W-shape flexure with LTB (F2) + shear (G2), bolt group shear/bearing with eccentric elastic method, fillet weld strength + size limits. I-shape properties computed from plate dims. All defaults matched an independent Python check.
- 5 steel practice cards and 8 NSCP 2015 Ch. 5 clauses (AISC 360 equivalents), flagged to verify section numbering.
- Bolt-pattern diagram renderer.
- **Content-as-code**: `content/batches/*.ts` + `/admin` page with Sync button and review queue; `scripts/check-content.ts` validator. Replaces large SQL seed migrations (saves tokens and time per release).
- Calc library split into `core.ts`, `index.ts` (concrete), `steel.ts`.

## v0.3.0: Concrete Tools + Codes index (2026-11-22)
- Shared calc library `lib/calc` (pure TS, SI units, step-by-step output): development length & Class A/B laps, hooked-bar ldh, beam φMn (analysis), beam required As (design), one-way slab hmin + temperature bars, column φPn,max.
- Tool runner UI: live form, results, pass/fail checks, step-by-step substitutions, recorded hand-check panel.
- 6 tool entries seeded as **review** drafts; each has a hand-check example matched against an independent hand calculation.
- Codes page (`/codes`): NSCP 2015 clause index (20 clauses) with own-words summaries, ACI 318-14 equivalents, and links to citing cards/tools; other indexed documents listed with status.
- Dashboard Codes tile shows clauses indexed. Seed generated by `scripts/gen_v030.ts` from the calc library.

## v0.2.0: Diagram engine + Concrete Practices I (2026-11-22)
- SVG diagram engine (`components/Diagram.tsx`, spec types in `lib/diagram.ts`): span (slab/beam elevations with safe/avoid/confine zones, laps, joints, moment/shear diagrams), column (zones, hoops, laps) and section (cover/spacing callouts).
- 12 Concrete Practice cards seeded as **review** drafts: splice zones (slabs, SMF beams, SMF columns), column lo zone, SMF beam hoop zone, construction joints (beams, slabs), cover, clear spacing, hooks & bends, curing, strength sampling & acceptance.
- NSCP 2015 clause index: 11 clauses (own-words summaries + ACI 318-14 equivalents), linked to cards.
- Admin "Mark reviewed & publish" / "Unpublish" actions on entry pages (DB publish gate still enforces the rules).
- Removed GitHub Pages `CNAME` file (site is served by Vercel).

## v0.1.0: Conversions (2026-11-21)
- Unit converter: 12 categories (length, area, volume, mass, force, stress/pressure, moment, line load, unit weight, density, flow, temperature), 81 units incl. kgf/tf and board foot. Exact definition-based factors; all-units comparison table.
- Reference tables: PH rebar sizes (area, perimeter, kg/m, kg per 6/7.5/9/12 m bar), PNS 49 grades (flagged *verify* for 2020 edition), typical material unit weights (flagged *verify*), sheet steel gauge, steel pipe NPS/DN Sch 40.
- Dashboard "What's new" banner; Conversions tile shows unit/table counts.
- Shared `lib/convert.ts` (reused by the v0.8.0 API). Added CLAUDE.md release/content rules.

## v0.0.0 — Foundation (2026-11-18)
- Supabase project `CEMP` (ap-southeast-1) with full content schema: entries + revisions, code index, tools, units, reference tables, bookmarks, notes, releases.
- Row-level security: viewers read published content only; editors write drafts; only the admin publishes.
- Publish gate (DB trigger): requires a reviewed current revision, at least one code clause for Codes/Practices, and a hand-check for Tools.
- Invite-only login (password + magic link), first account becomes admin.
- Dashboard with 5 modules (Codes, Tools, Conversions, Practices, Education), specialization filters, entry viewer, releases page.
- Seed: 15 specializations, 23 tags, 20 code documents (PH + US references).
