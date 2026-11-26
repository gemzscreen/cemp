-- CEMP v2.2.0: project costing (labour, equipment, OCM, profit, VAT) and quotation issuer details.
-- costing = { items: { <itemId>: { mode: 'pct'|'crew', pct, crew, rate, days, equip } }, ocm, profit, vat, quote: { no, date, validity, terms, payment, notes } }
alter table public.estimate_projects
  add column costing jsonb not null default '{}'::jsonb check (pg_column_size(costing) < 100000);
-- issuer = { company, name, title, prc, address, contact, email, tin, logo (data URL ≤ 200 kB) }; edited by the user on /account
alter table public.profiles
  add column issuer jsonb not null default '{}'::jsonb check (pg_column_size(issuer) < 300000);
