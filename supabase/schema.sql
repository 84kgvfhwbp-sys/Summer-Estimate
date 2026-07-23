-- Summer Estimate — Supabase foundation
-- Version 1: shared company workspace, users, estimates, rates, and audit history
-- Run this entire file once in Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

-- ---------- Shared helpers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Core tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.rate_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  estimate_number text,
  estimate_name text not null default 'Untitled Estimate',
  client_name text,
  site_address text,
  season text,
  prepared_by text,
  square_footage numeric not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'final', 'archived')),
  estimate_data jsonb not null default '{}'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(7,4) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (company_id, estimate_number)
);

create table if not exists public.estimate_history (
  id bigint generated always as identity primary key,
  estimate_id uuid references public.estimates(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  changed_by uuid references auth.users(id),
  action text not null check (action in ('created', 'updated', 'archived', 'deleted')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists estimates_company_updated_idx
  on public.estimates(company_id, updated_at desc);

create index if not exists estimates_company_status_idx
  on public.estimates(company_id, status);

create index if not exists estimate_history_estimate_idx
  on public.estimate_history(estimate_id, created_at desc);

-- ---------- Authentication profile trigger ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(coalesce(new.email, ''), '@', 1)),
    new.email
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

-- Backfill profile rows for any users already created.
insert into public.profiles (id, display_name, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name',
           raw_user_meta_data ->> 'name',
           split_part(coalesce(email, ''), '@', 1)),
  email
from auth.users
on conflict (id) do nothing;

-- ---------- Non-recursive membership helpers ----------

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Called by the app once after the first owner signs in.
create or replace function public.bootstrap_company(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_company_id uuid;
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select company_id
    into existing_company_id
  from public.company_members
  where user_id = auth.uid()
  order by created_at
  limit 1;

  if existing_company_id is not null then
    return existing_company_id;
  end if;

  insert into public.companies (name, created_by)
  values (coalesce(nullif(trim(company_name), ''), 'R2R Property Care'), auth.uid())
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, auth.uid(), 'owner');

  insert into public.rate_settings (company_id, settings, updated_by)
  values (new_company_id, '{}'::jsonb, auth.uid());

  return new_company_id;
end;
$$;

-- ---------- Estimate audit history ----------

create or replace function public.audit_estimate_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  action_name text;
  record_json jsonb;
  record_id uuid;
  record_company_id uuid;
begin
  if tg_op = 'INSERT' then
    action_name := 'created';
    record_json := to_jsonb(new);
    record_id := new.id;
    record_company_id := new.company_id;
  elsif tg_op = 'UPDATE' then
    action_name := case
      when old.status <> 'archived' and new.status = 'archived' then 'archived'
      else 'updated'
    end;
    record_json := to_jsonb(new);
    record_id := new.id;
    record_company_id := new.company_id;
  else
    action_name := 'deleted';
    record_json := to_jsonb(old);
    record_id := null;
    record_company_id := old.company_id;
  end if;

  insert into public.estimate_history
    (estimate_id, company_id, changed_by, action, snapshot)
  values
    (record_id, record_company_id, auth.uid(), action_name, record_json);

  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists rate_settings_set_updated_at on public.rate_settings;
create trigger rate_settings_set_updated_at
before update on public.rate_settings
for each row execute function public.set_updated_at();

drop trigger if exists estimates_set_updated_at on public.estimates;
create trigger estimates_set_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();

drop trigger if exists estimates_audit_change on public.estimates;
create trigger estimates_audit_change
after insert or update or delete on public.estimates
for each row execute function public.audit_estimate_change();

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.rate_settings enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_history enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Members can view companies" on public.companies;
create policy "Members can view companies"
on public.companies for select
using (public.is_company_member(id));

drop policy if exists "Admins can update companies" on public.companies;
create policy "Admins can update companies"
on public.companies for update
using (public.is_company_admin(id))
with check (public.is_company_admin(id));

drop policy if exists "Members can view company memberships" on public.company_members;
create policy "Members can view company memberships"
on public.company_members for select
using (public.is_company_member(company_id));

drop policy if exists "Admins can add company members" on public.company_members;
create policy "Admins can add company members"
on public.company_members for insert
with check (public.is_company_admin(company_id));

drop policy if exists "Admins can update company members" on public.company_members;
create policy "Admins can update company members"
on public.company_members for update
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists "Admins can remove company members" on public.company_members;
create policy "Admins can remove company members"
on public.company_members for delete
using (
  public.is_company_admin(company_id)
  and user_id <> auth.uid()
);

drop policy if exists "Members can view rates" on public.rate_settings;
create policy "Members can view rates"
on public.rate_settings for select
using (public.is_company_member(company_id));

drop policy if exists "Admins can update rates" on public.rate_settings;
create policy "Admins can update rates"
on public.rate_settings for update
using (public.is_company_admin(company_id))
with check (public.is_company_admin(company_id));

drop policy if exists "Members can read estimates" on public.estimates;
create policy "Members can read estimates"
on public.estimates for select
using (public.is_company_member(company_id));

drop policy if exists "Members can create estimates" on public.estimates;
create policy "Members can create estimates"
on public.estimates for insert
with check (
  public.is_company_member(company_id)
  and created_by = auth.uid()
);

drop policy if exists "Members can update estimates" on public.estimates;
create policy "Members can update estimates"
on public.estimates for update
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "Admins can delete estimates" on public.estimates;
create policy "Admins can delete estimates"
on public.estimates for delete
using (public.is_company_admin(company_id));

drop policy if exists "Members can read estimate history" on public.estimate_history;
create policy "Members can read estimate history"
on public.estimate_history for select
using (public.is_company_member(company_id));

-- ---------- Data API grants ----------
-- Required because "Automatically expose new tables" was disabled.

grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.companies to authenticated;
grant select, insert, update, delete on public.company_members to authenticated;
grant select, update on public.rate_settings to authenticated;
grant select, insert, update, delete on public.estimates to authenticated;
grant select on public.estimate_history to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.bootstrap_company(text) to authenticated;

revoke all on public.profiles from anon;
revoke all on public.companies from anon;
revoke all on public.company_members from anon;
revoke all on public.rate_settings from anon;
revoke all on public.estimates from anon;
revoke all on public.estimate_history from anon;

commit;
