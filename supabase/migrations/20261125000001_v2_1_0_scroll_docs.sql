-- CEMP v2.1.0: Darkwiz Scroll inside CEMP. Shared community store that replaces the claude.ai artifact db.
-- One document per user per collection: cards/{uid} = {items:[…]}, votes/{uid} = {pick,fuel,at}, ideas/{uid} = {items:[…]}.
create table public.scroll_docs (
  collection text not null check (collection in ('cards','votes','ideas')),
  doc_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 200000),
  updated_at timestamptz not null default now(),
  primary key (collection, doc_id)
);
alter table public.scroll_docs enable row level security;
-- cards and votes: every signed-in user reads; ideas: the writer and editors/admin only
create policy scroll_docs_select on public.scroll_docs for select to authenticated
  using (collection <> 'ideas' or doc_id = (select auth.uid()) or (select public.is_editor()));
create policy scroll_docs_insert on public.scroll_docs for insert to authenticated
  with check (doc_id = (select auth.uid()));
-- own document; the admin may also rewrite anyone's cards document (remove a card)
create policy scroll_docs_update on public.scroll_docs for update to authenticated
  using (doc_id = (select auth.uid()) or (collection = 'cards' and (select public.is_admin())))
  with check (doc_id = (select auth.uid()) or (collection = 'cards' and (select public.is_admin())));
create trigger scroll_docs_updated before update on public.scroll_docs for each row execute function public.set_updated_at();

-- Author names for community cards (profiles are owner/admin-only). Only users who have a scroll document are resolvable.
create or replace function public.scroll_names(p_ids uuid[])
returns table (id uuid, name text) language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1))
  from public.profiles p
  where p.id = any(p_ids) and exists (select 1 from public.scroll_docs d where d.doc_id = p.id) $$;
revoke execute on function public.scroll_names(uuid[]) from anon, public;
grant execute on function public.scroll_names(uuid[]) to authenticated;
