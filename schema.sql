-- Summer Estimate shared-cloud schema (Supabase/PostgreSQL)
-- Run this in the Supabase SQL editor when cloud sync is ready to be connected.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  estimate_number text,
  estimate_name text,
  site_address text,
  season text,
  prepared_by text,
  square_footage numeric,
  estimate_data jsonb not null default '{}'::jsonb,
  total numeric(12,2) not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimates_company_updated_idx
  on public.estimates(company_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists estimates_set_updated_at on public.estimates;
create trigger estimates_set_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.estimates enable row level security;

create policy "Members can view their companies"
on public.companies for select
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = companies.id and m.user_id = auth.uid()
  )
);

create policy "Members can view memberships in their companies"
on public.company_members for select
using (
  exists (
    select 1 from public.company_members mine
    where mine.company_id = company_members.company_id and mine.user_id = auth.uid()
  )
);

create policy "Company members can read estimates"
on public.estimates for select
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = estimates.company_id and m.user_id = auth.uid()
  )
);

create policy "Company members can create estimates"
on public.estimates for insert
with check (
  exists (
    select 1 from public.company_members m
    where m.company_id = estimates.company_id and m.user_id = auth.uid()
  )
);

create policy "Company members can update estimates"
on public.estimates for update
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = estimates.company_id and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.company_members m
    where m.company_id = estimates.company_id and m.user_id = auth.uid()
  )
);

create policy "Company members can delete estimates"
on public.estimates for delete
using (
  exists (
    select 1 from public.company_members m
    where m.company_id = estimates.company_id and m.user_id = auth.uid()
  )
);
