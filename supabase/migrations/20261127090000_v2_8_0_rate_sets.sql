-- CEMP v2.8.0: named labour rate sets per user (PH Region X, Region IX, Brunei …). Each: id, name, currency (PHP|BND),
-- vat (false = no VAT on the quotation), labour { trade: rate/day }. Empty = one set built from user_rates.labour.
alter table public.user_rates add column if not exists sets jsonb not null default '[]'::jsonb;
