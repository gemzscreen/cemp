-- CEMP v1.2.0: standards side by side (PH · Brunei · International) + home standard per user.
alter table public.profiles
  add column home_standard text not null default 'ph' check (home_standard in ('ph','bn','intl'));

create table public.entry_standards (
  entry_id uuid not null references public.entries(id) on delete cascade,
  std text not null check (std in ('ph','bn','intl')),
  code text not null check (length(code) <= 120),
  points jsonb not null default '[]'::jsonb check (jsonb_typeof(points) = 'array'),
  refs text check (refs is null or length(refs) <= 300),
  verified boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (entry_id, std)
);
alter table public.entry_standards enable row level security;
-- readable wherever the entry itself is readable
create policy entry_standards_read on public.entry_standards for select to authenticated
  using (exists (select 1 from public.entries e where e.id = entry_id and (e.status = 'published' or (select public.is_editor()))));
create policy entry_standards_insert on public.entry_standards for insert to authenticated with check ((select public.is_editor()));
create policy entry_standards_update on public.entry_standards for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy entry_standards_delete on public.entry_standards for delete to authenticated using ((select public.is_editor()));
create trigger entry_standards_updated before update on public.entry_standards for each row execute function public.set_updated_at();
