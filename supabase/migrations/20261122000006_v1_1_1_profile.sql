-- CEMP v1.1.1: profile photo + job title (self-editable); email and role stay admin-only.
alter table public.profiles
  add column avatar text check (avatar is null or (avatar ~ '^data:image/(png|jpeg|webp);base64,' and length(avatar) <= 200000)),
  add column job_title text check (job_title is null or length(job_title) <= 120);
alter table public.profiles add constraint profiles_full_name_len check (full_name is null or length(full_name) <= 80);

create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  if new.email is distinct from old.email and not public.is_admin() then
    raise exception 'Email is managed by the admin (it mirrors your sign-in email)';
  end if;
  return new;
end $$;
