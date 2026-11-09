-- ============================================================================
-- Jerryhub — initial schema, access control and storage policies
-- ============================================================================
-- Run with: supabase db push
--
-- Security model
--   1. media_sets (metadata + public thumbnail paths) is readable by everyone.
--   2. media_assets (private storage paths) is readable only by active patrons.
--   3. The premium bucket has NO select policy for clients. Files are served
--      only through the media-signed-url Edge Function using the service role,
--      which re-checks entitlement on every request.
--   4. Profiles are readable by their owner. Only the service role (OAuth /
--      webhook Edge Functions) may change membership fields.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  patreon_user_id text unique,
  patreon_member_id text unique,
  email text,
  full_name text,
  avatar_url text,
  membership_status text not null default 'inactive'
    check (membership_status in ('active', 'inactive', 'unknown')),
  entitled_tier_ids text[] not null default '{}',
  pledge_amount_cents integer not null default 0
    check (pledge_amount_cents >= 0),
  patreon_campaign_id text,
  is_admin boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per Supabase auth user. Membership columns are written only by trusted Edge Functions.';

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_status_idx on public.profiles (membership_status);
create index if not exists profiles_patreon_user_idx on public.profiles (patreon_user_id);

create table if not exists public.media_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  thumbnail_path text not null,
  primary_type text not null default 'video'
    check (primary_type in ('video', 'image', 'pdf', 'funscript')),
  asset_count integer not null default 0 check (asset_count >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_trending boolean not null default false,
  is_new boolean not null default true,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.media_sets is
  'Public metadata for a media set. Thumbnails are public; actual assets are private.';

create index if not exists media_sets_published_idx
  on public.media_sets (published, sort_order, created_at desc);
create index if not exists media_sets_trending_idx
  on public.media_sets (is_trending) where is_trending;
create index if not exists media_sets_new_idx
  on public.media_sets (is_new) where is_new;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.media_sets (id) on delete cascade,
  type text not null check (type in ('video', 'image', 'pdf', 'funscript')),
  storage_path text not null check (char_length(trim(storage_path)) > 0),
  file_name text not null check (char_length(trim(file_name)) > 0),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (set_id, storage_path)
);

comment on table public.media_assets is
  'Private file metadata. RLS exposes this only to active patrons and admins.';

create index if not exists media_assets_set_idx
  on public.media_assets (set_id, sort_order);

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists media_sets_set_updated_at on public.media_sets;
create trigger media_sets_set_updated_at
  before update on public.media_sets
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Create a profile whenever a new auth user appears
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, membership_status)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'inactive'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that existed before this migration.
insert into public.profiles (id, email, full_name, avatar_url, membership_status)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', '')
  ),
  nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
  'inactive'
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Membership helpers
-- ----------------------------------------------------------------------------

-- No user-controlled argument: callers can only ask about themselves.
create or replace function public.is_active_patron()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.membership_status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

revoke all on function public.is_active_patron() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_patron() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- A normal user may edit display fields, but must never be able to grant
-- themselves access by changing membership columns directly.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- service_role and SQL/owner sessions have no end-user JWT. Only enforce the
  -- rule for requests made by a signed-in user editing their own profile.
  if auth.uid() is not null and auth.uid() = old.id and not public.is_admin() then
    new.id := old.id;
    new.patreon_user_id := old.patreon_user_id;
    new.patreon_member_id := old.patreon_member_id;
    new.email := old.email;
    new.membership_status := old.membership_status;
    new.entitled_tier_ids := old.entitled_tier_ids;
    new.pledge_amount_cents := old.pledge_amount_cents;
    new.patreon_campaign_id := old.patreon_campaign_id;
    new.is_admin := old.is_admin;
    new.last_synced_at := old.last_synced_at;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ----------------------------------------------------------------------------
-- Keep media_sets.asset_count in sync with media_assets
-- ----------------------------------------------------------------------------

create or replace function public.sync_asset_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_set uuid;
begin
  if tg_op = 'DELETE' then
    affected_set := old.set_id;
  else
    affected_set := new.set_id;
  end if;

  update public.media_sets s
  set asset_count = (
    select count(*)::integer from public.media_assets a where a.set_id = affected_set
  )
  where s.id = affected_set;

  -- Moving an asset between sets requires refreshing the old set as well.
  if tg_op = 'UPDATE' and old.set_id is distinct from new.set_id then
    update public.media_sets s
    set asset_count = (
      select count(*)::integer from public.media_assets a where a.set_id = old.set_id
    )
    where s.id = old.set_id;
  end if;

  return null;
end;
$$;

drop trigger if exists media_assets_sync_count on public.media_assets;
create trigger media_assets_sync_count
  after insert or delete or update of set_id on public.media_assets
  for each row execute function public.sync_asset_count();

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.media_sets enable row level security;
alter table public.media_assets enable row level security;

-- Profiles: owner can read; admins can read everything. No client INSERT or
-- DELETE. Updates are limited to display fields by protect_profile_columns().
drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
create policy "Profiles are readable by owner or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles can update display fields" on public.profiles;
create policy "Profiles can update display fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Media sets: public reads published rows. Admins manage everything.
drop policy if exists "Published media sets are public" on public.media_sets;
create policy "Published media sets are public"
  on public.media_sets for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins can insert media sets" on public.media_sets;
create policy "Admins can insert media sets"
  on public.media_sets for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update media sets" on public.media_sets;
create policy "Admins can update media sets"
  on public.media_sets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete media sets" on public.media_sets;
create policy "Admins can delete media sets"
  on public.media_sets for delete
  to authenticated
  using (public.is_admin());

-- Media assets: active patrons can read metadata for published sets. Admins
-- can read everything. There is no public policy.
drop policy if exists "Active patrons can read assets" on public.media_assets;
create policy "Active patrons can read assets"
  on public.media_assets for select
  to authenticated
  using (
    public.is_admin()
    or (
      public.is_active_patron()
      and exists (
        select 1 from public.media_sets s
        where s.id = set_id and s.published = true
      )
    )
  );

drop policy if exists "Admins can insert assets" on public.media_assets;
create policy "Admins can insert assets"
  on public.media_assets for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update assets" on public.media_assets;
create policy "Admins can update assets"
  on public.media_assets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete assets" on public.media_assets;
create policy "Admins can delete assets"
  on public.media_assets for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Grants (RLS still applies)
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.media_sets to anon, authenticated;
grant select on public.media_assets to authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.media_sets to authenticated;
grant insert, update, delete on public.media_assets to authenticated;

-- ----------------------------------------------------------------------------
-- Storage buckets
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('thumbnails', 'thumbnails', true, 10485760),
  ('premium', 'premium', false, 5368709120)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Public thumbnails are readable by everyone.
drop policy if exists "Public thumbnails are readable" on storage.objects;
create policy "Public thumbnails are readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'thumbnails');

-- Admins can manage thumbnails.
drop policy if exists "Admins can upload thumbnails" on storage.objects;
create policy "Admins can upload thumbnails"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'thumbnails' and public.is_admin());

drop policy if exists "Admins can update thumbnails" on storage.objects;
create policy "Admins can update thumbnails"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'thumbnails' and public.is_admin())
  with check (bucket_id = 'thumbnails' and public.is_admin());

drop policy if exists "Admins can delete thumbnails" on storage.objects;
create policy "Admins can delete thumbnails"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'thumbnails' and public.is_admin());

-- The premium bucket intentionally has NO select policy for anon/authenticated.
-- Direct object URLs therefore fail; the Edge Function signs short-lived URLs
-- with the service role after verifying the caller's membership.
drop policy if exists "Admins can upload premium files" on storage.objects;
create policy "Admins can upload premium files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'premium' and public.is_admin());

drop policy if exists "Admins can update premium files" on storage.objects;
create policy "Admins can update premium files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'premium' and public.is_admin())
  with check (bucket_id = 'premium' and public.is_admin());

drop policy if exists "Admins can delete premium files" on storage.objects;
create policy "Admins can delete premium files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'premium' and public.is_admin());

-- ----------------------------------------------------------------------------
-- Realtime (optional but useful for account status updates)
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.profiles;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Bootstrap an admin after your first Patreon login:
--   update public.profiles set is_admin = true where email = 'you@example.com';
-- ----------------------------------------------------------------------------
