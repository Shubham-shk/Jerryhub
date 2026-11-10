-- ============================================================================
-- Jerryhub — Patreon account connections + OAuth state
-- ============================================================================
-- Adds a server-owned connection record per Jerryhub user and a short-lived,
-- single-use OAuth state table for the account-connection flow.
--
-- Security model
--   1. Tokens are written and read only by Edge Functions using the service
--      role. The browser can read connection status but never token columns.
--   2. RLS restricts status reads to the owning user.
--   3. OAuth state is stored as a SHA-256 hash and can only be consumed once.
--   4. A Patreon account can be linked to exactly one Jerryhub user.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Patreon connections
-- ----------------------------------------------------------------------------

create table if not exists public.patreon_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  patreon_user_id text not null unique,
  patreon_member_id text unique,
  patreon_email text,
  patreon_full_name text,
  patreon_avatar_url text,
  access_token text not null,
  refresh_token text,
  token_type text not null default 'Bearer',
  scopes text,
  expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  membership_status text not null default 'inactive'
    check (membership_status in ('active', 'inactive', 'unknown')),
  patron_status text,
  entitled_tier_ids text[] not null default '{}',
  pledge_amount_cents integer not null default 0
    check (pledge_amount_cents >= 0),
  patreon_campaign_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.patreon_connections is
  'Server-owned Patreon OAuth connection per Jerryhub user. Tokens are never exposed to clients.';
comment on column public.patreon_connections.access_token is
  'Patreon OAuth access token. Read only by service-role Edge Functions.';
comment on column public.patreon_connections.refresh_token is
  'Patreon OAuth refresh token. Read only by service-role Edge Functions.';
comment on column public.patreon_connections.membership_status is
  'Verified membership state derived from Patreon patron_status.';
comment on column public.patreon_connections.entitled_tier_ids is
  'Verified Patreon currently_entitled_tiers ids used for Basic/Full mapping.';

create index if not exists patreon_connections_membership_idx
  on public.patreon_connections (membership_status);
create index if not exists patreon_connections_campaign_idx
  on public.patreon_connections (patreon_campaign_id);

drop trigger if exists patreon_connections_set_updated_at on public.patreon_connections;
create trigger patreon_connections_set_updated_at
  before update on public.patreon_connections
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Single-use OAuth state for the account-connection flow
-- ----------------------------------------------------------------------------

create table if not exists public.patreon_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  return_to text not null,
  redirect_uri text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

comment on table public.patreon_oauth_states is
  'Short-lived, single-use OAuth state for Patreon account linking. Only the SHA-256 hash is stored.';

create index if not exists patreon_oauth_states_user_idx
  on public.patreon_oauth_states (user_id);
create index if not exists patreon_oauth_states_expires_idx
  on public.patreon_oauth_states (expires_at);

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------

alter table public.patreon_connections enable row level security;
alter table public.patreon_oauth_states enable row level security;

-- Users may read their own connection status. There is intentionally no
-- INSERT/UPDATE/DELETE policy: only the service role may write.
drop policy if exists "Users can read their own Patreon connection" on public.patreon_connections;
create policy "Users can read their own Patreon connection"
  on public.patreon_connections for select
  to authenticated
  using (user_id = auth.uid());

-- OAuth state is service-role only. No client policies at all.
drop policy if exists "No client access to Patreon OAuth state" on public.patreon_oauth_states;

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
-- Table-level SELECT is revoked and only non-sensitive columns are granted, so
-- `select *` from the browser fails and access_token/refresh_token can never be
-- read through PostgREST.

revoke all on public.patreon_connections from anon, authenticated;
revoke all on public.patreon_oauth_states from anon, authenticated;

grant select (
  id,
  user_id,
  patreon_user_id,
  patreon_member_id,
  patreon_email,
  patreon_full_name,
  patreon_avatar_url,
  scopes,
  expires_at,
  membership_status,
  patron_status,
  entitled_tier_ids,
  pledge_amount_cents,
  patreon_campaign_id,
  connected_at,
  updated_at
) on public.patreon_connections to authenticated;

grant all on public.patreon_connections to service_role;
grant all on public.patreon_oauth_states to service_role;

-- ----------------------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------------------
-- * Patreon has no public token-revocation endpoint. Disconnecting deletes the
--   stored tokens, which is the effective revocation for this application.
-- * Supabase encrypts data at rest, and the token columns are only readable by
--   the service role. The application never logs token values.
-- * Membership columns on public.profiles remain the single source of truth for
--   content access; patreon_connections stores the verified link and tokens.
