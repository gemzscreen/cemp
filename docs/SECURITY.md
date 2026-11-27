# CEMP security notes (v2.9.0)

## In the code
- **Headers** (`next.config.mjs`): CSP (frame-ancestors none, object-src none, base-uri/form-action self, connect-src self + Supabase, fonts from Google Fonts only), HSTS 2 years + preload, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP. Script/style keep `'unsafe-inline'` because Next.js hydration and darkwizscroll use inline code; moving to nonces would need per-request rendering.
- **Rate limit** (`lib/ratelimit.ts`, `middleware.ts`, `lib/api.ts`): `/api/v1` allows 120 requests/min/IP; after 10 failed key checks/min/IP it answers 429. In memory per server instance, so treat it as a light guard.
- **Dependencies**: `npm audit --omit=dev` = 0 (overrides: uuid ^11.1.1, postcss ^8.5.23; katex ^0.19.1).
- SQL: only parameterised Supabase calls; RLS on every table; browser holds the publishable key only.

## Dashboard settings (Gemz)
1. **Supabase → Auth → Providers → Email**: turn **on** "Prevent use of leaked passwords"; confirm "Allow new users to sign up" is **off**.
2. **Supabase → Auth → Rate limits**: keep sign-in / OTP limits at defaults or lower (login goes browser → Supabase, so this is the real login throttle).
3. **Vercel → Project cemp → Firewall → Rules**: add a rate-limit rule, e.g. path starts with `/api/v1`, 60 requests/min per IP, action Deny (or Challenge). Optionally enable Attack Challenge Mode while under attack.
4. Enable 2FA on GitHub, Vercel, Supabase and IONOS.

## Known / accepted
- `api_check`, `api_clauses`, `api_entries` are SECURITY DEFINER and callable by anon on purpose (they validate the hashed API key and return published content only).
- Service worker caches pages for offline use; sign out clears the session but not cached pages on a shared device.
