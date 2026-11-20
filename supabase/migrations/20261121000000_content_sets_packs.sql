-- ============================================================================
-- Jerryhub — Sets & Packs content management
-- ============================================================================
-- Sets are reusable image albums. Packs are independently managed content
-- packs that reference a set; every pack assigned to the same set shares that
-- set's album. Names default to "Set 1", "Pack 1", ... in the admin UI.
--
-- Apply with: supabase db push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- content_sets — reusable image albums
-- ----------------------------------------------------------------------------
create table if not exists public.content_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(trim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_sets is
  'Reusable image albums managed from the admin Sets area.';

create index if not exists content_sets_sort_idx
  on public.content_sets (sort_order, created_at);

-- ----------------------------------------------------------------------------
-- content_packs — independently managed packs, optionally sharing a set
-- ----------------------------------------------------------------------------
create table if not exists public.content_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(trim(name)) between 1 and 80),
  set_id uuid references public.content_sets(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_packs is
  'Content packs. Packs assigned to the same set share that set''s image album.';

create index if not exists content_packs_sort_idx
  on public.content_packs (sort_order, created_at);
create index if not exists content_packs_set_idx
  on public.content_packs (set_id);

-- ----------------------------------------------------------------------------
-- set_images — ordered image URLs inside a set album
-- ----------------------------------------------------------------------------
create table if not exists public.set_images (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.content_sets(id) on delete cascade,
  image_url text not null
    check (char_length(trim(image_url)) between 1 and 2048),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.set_images is
  'Ordered third-party image URLs belonging to a reusable set album.';

create index if not exists set_images_set_sort_idx
  on public.set_images (set_id, sort_order, created_at);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
drop trigger if exists content_sets_set_updated_at on public.content_sets;
create trigger content_sets_set_updated_at
  before update on public.content_sets
  for each row execute function public.set_updated_at();

drop trigger if exists content_packs_set_updated_at on public.content_packs;
create trigger content_packs_set_updated_at
  before update on public.content_packs
  for each row execute function public.set_updated_at();

drop trigger if exists set_images_set_updated_at on public.set_images;
create trigger set_images_set_updated_at
  before update on public.set_images
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
alter table public.content_sets enable row level security;
alter table public.content_packs enable row level security;
alter table public.set_images enable row level security;

-- Content is readable so the public site can use the same source of truth.
drop policy if exists "Content sets are public" on public.content_sets;
create policy "Content sets are public"
  on public.content_sets for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage content sets" on public.content_sets;
create policy "Admins manage content sets"
  on public.content_sets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Content packs are public" on public.content_packs;
create policy "Content packs are public"
  on public.content_packs for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage content packs" on public.content_packs;
create policy "Admins manage content packs"
  on public.content_packs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Set images are public" on public.set_images;
create policy "Set images are public"
  on public.set_images for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage set images" on public.set_images;
create policy "Admins manage set images"
  on public.set_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
grant select on public.content_sets, public.content_packs, public.set_images
  to anon, authenticated;
grant insert, update, delete
  on public.content_sets, public.content_packs, public.set_images
  to authenticated;
