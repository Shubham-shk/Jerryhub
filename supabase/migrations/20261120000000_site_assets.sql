-- ============================================================================
-- Jerryhub — editable site artwork (hero posters, section banners, etc.)
-- ============================================================================
-- One row per named image slot. The frontend falls back to the artwork that
-- ships in src/data/posters.ts when a slot has no override, so this table can
-- be empty and the site still renders exactly as before.
--
-- Apply with: supabase db push
-- ============================================================================

create table if not exists public.site_assets (
  slot text primary key
    check (slot ~ '^[a-z0-9-]+$' and char_length(slot) <= 80),
  section text not null
    check (char_length(trim(section)) between 1 and 60),
  label text not null
    check (char_length(trim(label)) between 1 and 120),
  image_path text not null
    check (char_length(trim(image_path)) > 0),
  updated_at timestamptz not null default now()
);

comment on table public.site_assets is
  'Admin-uploaded replacements for homepage posters and section banners. Public read, admin write.';

alter table public.site_assets enable row level security;

drop policy if exists "Site artwork is public" on public.site_assets;
create policy "Site artwork is public"
  on public.site_assets for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage site artwork" on public.site_assets;
create policy "Admins manage site artwork"
  on public.site_assets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_assets to anon, authenticated;
grant insert, update, delete on public.site_assets to authenticated;

drop trigger if exists site_assets_set_updated_at on public.site_assets;
create trigger site_assets_set_updated_at
  before update on public.site_assets
  for each row execute function public.set_updated_at();
