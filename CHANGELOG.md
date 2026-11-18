# Changelog

All notable changes to CEMP Web App. Versions follow SemVer: each content batch bumps the minor version (v0.x.0), fixes bump the patch.

## v0.0.0 — Foundation (2026-11-18)
- Supabase project `CEMP` (ap-southeast-1) with full content schema: entries + revisions, code index, tools, units, reference tables, bookmarks, notes, releases.
- Row-level security: viewers read published content only; editors write drafts; only the admin publishes.
- Publish gate (DB trigger): requires a reviewed current revision, at least one code clause for Codes/Practices, and a hand-check for Tools.
- Invite-only login (password + magic link), first account becomes admin.
- Dashboard with 5 modules (Codes, Tools, Conversions, Practices, Education), specialization filters, entry viewer, releases page.
- Seed: 15 specializations, 23 tags, 20 code documents (PH + US references).
