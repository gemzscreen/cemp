-- CEMP v0.9.0: in-app editor support.
-- 1) Track where a revision came from, so content sync never overwrites an in-app edit.
alter table public.entry_revisions
  add column source text not null default 'batch' check (source in ('batch', 'app', 'sql'));

-- 2) A published entry may only point at a reviewed revision. publish_gate checks status changes;
--    this closes the gap where current_revision_id changes while the status stays 'published'.
create or replace function public.guard_published_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and old.status = 'published'
     and new.current_revision_id is distinct from old.current_revision_id
     and not exists (select 1 from public.entry_revisions r
                      where r.id = new.current_revision_id and r.entry_id = new.id and r.reviewed_by is not null) then
    raise exception 'A published entry can only point to a reviewed revision: move it to review first';
  end if;
  return new;
end $$;
create trigger entries_guard_published before update on public.entries
  for each row execute function public.guard_published_revision();

-- 3) Only admins may stamp a revision as reviewed (editors draft, admin reviews and publishes).
create or replace function public.guard_review_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_admin() and (
       (tg_op = 'INSERT' and (new.reviewed_by is not null or new.reviewed_at is not null))
    or (tg_op = 'UPDATE' and (new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at))) then
    raise exception 'Only an admin can mark a revision as reviewed';
  end if;
  return new;
end $$;
create trigger entry_revisions_guard_review before insert or update on public.entry_revisions
  for each row execute function public.guard_review_stamp();
