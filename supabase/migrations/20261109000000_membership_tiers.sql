-- ============================================================================
-- Jerryhub — two-tier membership access + membership change audit
-- ============================================================================
-- Adds an explicit access level to every media set and an optional audit table
-- for Patreon tier/status changes. Existing sets default to Full Access so no
-- current content is exposed by the migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Content access level
-- ----------------------------------------------------------------------------

alter table public.media_sets
  add column if not exists access_level text not null default 'full';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_sets_access_level_check'
  ) then
    alter table public.media_sets
      add constraint media_sets_access_level_check
      check (access_level in ('public', 'basic', 'full'));
  end if;
end;
$$;

comment on column public.media_sets.access_level is
  'public = any signed-in account, basic = Basic Access or higher, full = Full Access only.';

create index if not exists media_sets_access_level_idx
  on public.media_sets (access_level, published);

-- ----------------------------------------------------------------------------
-- Membership change audit
-- ----------------------------------------------------------------------------

create table if not exists public.membership_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (char_length(trim(event_type)) > 0),
  from_status text,
  to_status text,
  from_tier text,
  to_tier text,
  source text not null default 'patreon',
  created_at timestamptz not null default now()
);

comment on table public.membership_events is
  'Append-only audit of Patreon membership status/tier changes. Written by trusted Edge Functions only.';

create index if not exists membership_events_profile_idx
  on public.membership_events (profile_id, created_at desc);
create index if not exists membership_events_created_idx
  on public.membership_events (created_at desc);

alter table public.membership_events enable row level security;

drop policy if exists "Admins can read membership events" on public.membership_events;
create policy "Admins can read membership events"
  on public.membership_events for select
  to authenticated
  using (public.is_admin());

grant select on public.membership_events to authenticated;
grant select, insert on public.membership_events to service_role;

-- No client INSERT/UPDATE/DELETE policies: only the service role (OAuth and
-- webhook Edge Functions) may append audit records.

-- ----------------------------------------------------------------------------
-- Note on enforcement
-- ----------------------------------------------------------------------------
-- Per-set Basic/Full checks are enforced by the media-signed-url Edge Function,
-- which resolves the verified Patreon tier against PATREON_BASIC_TIER_ID and
-- PATREON_FULL_TIER_ID. The frontend only uses access_level for labels and
-- routing; it is never the security boundary.
