-- CEMP v0.0.0 core schema (applied to project qzbcgwjnzwockhvimupr on 2026-11-18)
create type public.app_role      as enum ('admin','editor','viewer');
create type public.module_kind   as enum ('code','tool','conversion','practice','education');
create type public.entry_status  as enum ('draft','review','published','deprecated');
create type public.spec_group    as enum ('structural','construction_mgmt','education');
create type public.tag_kind      as enum ('element','activity','phase');
create type public.link_relation as enum ('cites','uses_tool','uses_table','related','supersedes');
create type public.tool_kind     as enum ('calculator','excel','checklist','table');
create type public.doc_status    as enum ('current','superseded','reference');
create type public.unit_system   as enum ('si','english','other');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text,
  role public.app_role not null default 'viewer',
  prc_license text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) $$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false) $$;
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('admin','editor') from public.profiles where id = (select auth.uid())), false) $$;
revoke execute on function public.current_app_role(), public.is_admin(), public.is_editor() from anon, public;
grant  execute on function public.current_app_role(), public.is_admin(), public.is_editor() to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          case when exists (select 1 from public.profiles) then 'viewer'::public.app_role
               else 'admin'::public.app_role end);
  return new;
end $$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles for each row execute function public.guard_profile_role();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create table public.specializations (
  id smallint generated always as identity primary key,
  grp public.spec_group not null,
  parent_id smallint references public.specializations(id) on delete set null,
  name text not null, slug text not null unique, sort smallint not null default 0
);
create index on public.specializations(parent_id);

create table public.tags (
  id smallint generated always as identity primary key,
  kind public.tag_kind not null, name text not null, slug text not null unique
);

create table public.code_documents (
  id smallint generated always as identity primary key,
  short_name text not null, title text not null, edition text, publisher text, year smallint,
  jurisdiction text not null default 'PH',
  status public.doc_status not null default 'current', notes text,
  unique (short_name, edition)
);

create table public.code_clauses (
  id uuid primary key default gen_random_uuid(),
  code_document_id smallint not null references public.code_documents(id) on delete cascade,
  section_no text not null, title text not null,
  summary text,          -- own words only; never verbatim code text
  formula_latex text,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (code_document_id, section_no)
);
create trigger code_clauses_updated before update on public.code_clauses for each row execute function public.set_updated_at();

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  module public.module_kind not null,
  title text not null, slug text not null unique,
  specialization_id smallint references public.specializations(id) on delete set null,
  summary text,
  status public.entry_status not null default 'draft',
  current_revision_id uuid,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.entries(module, status);
create index on public.entries(specialization_id);
create index on public.entries(created_by);
create trigger entries_updated before update on public.entries for each row execute function public.set_updated_at();

create table public.entry_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  rev_no integer not null,
  body jsonb not null default '{}'::jsonb,
  diagram jsonb,
  change_note text, code_edition text,
  author_id uuid references public.profiles(id) on delete set null default auth.uid(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (entry_id, rev_no)
);
create index on public.entry_revisions(author_id);
create index on public.entry_revisions(reviewed_by);
alter table public.entries add constraint entries_current_revision_fk
  foreign key (current_revision_id) references public.entry_revisions(id) on delete set null;
create index on public.entries(current_revision_id);

create or replace function public.next_rev_no()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.rev_no is null or new.rev_no = 0 then
    select coalesce(max(rev_no),0)+1 into new.rev_no from public.entry_revisions where entry_id = new.entry_id;
  end if;
  return new;
end $$;
alter table public.entry_revisions alter column rev_no set default 0;
create trigger entry_revisions_rev_no before insert on public.entry_revisions for each row execute function public.next_rev_no();

create table public.entry_tags (
  entry_id uuid not null references public.entries(id) on delete cascade,
  tag_id smallint not null references public.tags(id) on delete cascade,
  primary key (entry_id, tag_id)
);
create index on public.entry_tags(tag_id);

create table public.entry_links (
  from_entry uuid not null references public.entries(id) on delete cascade,
  to_entry uuid not null references public.entries(id) on delete cascade,
  relation public.link_relation not null default 'related',
  primary key (from_entry, to_entry, relation), check (from_entry <> to_entry)
);
create index on public.entry_links(to_entry);

create table public.entry_clause_refs (
  entry_id uuid not null references public.entries(id) on delete cascade,
  clause_id uuid not null references public.code_clauses(id) on delete cascade,
  note text, primary key (entry_id, clause_id)
);
create index on public.entry_clause_refs(clause_id);

create table public.tools (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  kind public.tool_kind not null,
  calc_key text unique,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  file_path text,
  hand_check jsonb
);

create table public.unit_categories (
  id smallint generated always as identity primary key,
  name text not null unique, base_unit text not null, sort smallint not null default 0
);
create table public.units (
  id smallint generated always as identity primary key,
  category_id smallint not null references public.unit_categories(id) on delete cascade,
  symbol text not null, name text not null, system public.unit_system not null,
  to_base numeric not null, "offset" numeric not null default 0, sort smallint not null default 0,
  unique (category_id, symbol)
);

create table public.ref_tables (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null,
  columns jsonb not null, data jsonb not null, source text,
  entry_id uuid references public.entries(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.ref_tables(entry_id);
create trigger ref_tables_updated before update on public.ref_tables for each row execute function public.set_updated_at();

create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, entry_id)
);
create index on public.bookmarks(entry_id);

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.user_notes(user_id);
create index on public.user_notes(entry_id);
create trigger user_notes_updated before update on public.user_notes for each row execute function public.set_updated_at();

create table public.releases (
  id smallint generated always as identity primary key,
  version text not null unique check (version ~ '^v\d+\.\d+\.\d+$'),
  batch_name text not null, notes_md text, released_at timestamptz
);
create table public.release_entries (
  release_id smallint not null references public.releases(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  primary key (release_id, entry_id)
);
create index on public.release_entries(entry_id);

create or replace function public.publish_gate()
returns trigger language plpgsql set search_path = '' as $$
declare rev public.entry_revisions;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not public.is_admin() then raise exception 'Only an admin can publish'; end if;
    if new.current_revision_id is null then raise exception 'Cannot publish: no current revision'; end if;
    select * into rev from public.entry_revisions where id = new.current_revision_id;
    if rev.entry_id <> new.id then raise exception 'Cannot publish: current revision belongs to another entry'; end if;
    if rev.reviewed_by is null then raise exception 'Cannot publish: current revision has not been reviewed'; end if;
    if new.module in ('code','practice') and not exists (select 1 from public.entry_clause_refs where entry_id = new.id) then
      raise exception 'Cannot publish: % entries need at least one code clause reference', new.module;
    end if;
    if new.module = 'tool' and not exists (select 1 from public.tools where entry_id = new.id and hand_check is not null) then
      raise exception 'Cannot publish: tools need a recorded hand-check example';
    end if;
    new.published_at = now();
  end if;
  return new;
end $$;
create trigger entries_publish_gate before insert or update on public.entries for each row execute function public.publish_gate();

-- RLS
alter table public.profiles enable row level security;
alter table public.specializations enable row level security;
alter table public.tags enable row level security;
alter table public.code_documents enable row level security;
alter table public.code_clauses enable row level security;
alter table public.entries enable row level security;
alter table public.entry_revisions enable row level security;
alter table public.entry_tags enable row level security;
alter table public.entry_links enable row level security;
alter table public.entry_clause_refs enable row level security;
alter table public.tools enable row level security;
alter table public.unit_categories enable row level security;
alter table public.units enable row level security;
alter table public.ref_tables enable row level security;
alter table public.bookmarks enable row level security;
alter table public.user_notes enable row level security;
alter table public.releases enable row level security;
alter table public.release_entries enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

do $$
declare t text;
begin
  foreach t in array array['specializations','tags','code_documents','code_clauses','unit_categories','units','ref_tables','releases']
  loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (true)', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check ((select public.is_editor()))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

create policy entries_read on public.entries for select to authenticated using (status = 'published' or (select public.is_editor()));
create policy entries_insert on public.entries for insert to authenticated with check ((select public.is_editor()));
create policy entries_update on public.entries for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy entries_delete on public.entries for delete to authenticated using ((select public.is_admin()));

create policy entry_revisions_read on public.entry_revisions for select to authenticated
  using ((select public.is_editor()) or exists (select 1 from public.entries e where e.id = entry_id
    and e.status = 'published' and e.current_revision_id = entry_revisions.id));
create policy entry_revisions_insert on public.entry_revisions for insert to authenticated with check ((select public.is_editor()));
create policy entry_revisions_update on public.entry_revisions for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy entry_revisions_delete on public.entry_revisions for delete to authenticated using ((select public.is_admin()));

do $$
declare t text;
begin
  foreach t in array array['entry_tags','entry_clause_refs','tools','release_entries']
  loop
    execute format($f$create policy %1$s_read on public.%1$s for select to authenticated
      using ((select public.is_editor()) or exists (select 1 from public.entries e where e.id = %1$s.entry_id and e.status = 'published'))$f$, t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check ((select public.is_editor()))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using ((select public.is_editor()))', t);
  end loop;
end $$;

create policy entry_links_read on public.entry_links for select to authenticated
  using ((select public.is_editor()) or exists (select 1 from public.entries e where e.id = entry_links.from_entry and e.status = 'published'));
create policy entry_links_insert on public.entry_links for insert to authenticated with check ((select public.is_editor()));
create policy entry_links_delete on public.entry_links for delete to authenticated using ((select public.is_editor()));

create policy bookmarks_own on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_notes_own on public.user_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on all tables in schema public from anon;

insert into storage.buckets (id, name, public) values ('cemp-files','cemp-files', false) on conflict (id) do nothing;
create policy cemp_files_read on storage.objects for select to authenticated using (bucket_id = 'cemp-files');
create policy cemp_files_write on storage.objects for insert to authenticated with check (bucket_id = 'cemp-files' and (select public.is_editor()));
create policy cemp_files_update on storage.objects for update to authenticated using (bucket_id = 'cemp-files' and (select public.is_editor()));
create policy cemp_files_delete on storage.objects for delete to authenticated using (bucket_id = 'cemp-files' and (select public.is_admin()));
