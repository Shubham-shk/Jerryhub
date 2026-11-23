-- ============================================================================
-- Jerryhub — bridge Sets & Packs albums into the public storefront
-- ============================================================================
-- Problem this fixes
-- ----------------------------------------------------------------------------
-- The public site (homepage rows, /browse, /trending, /gallery, /content) reads
-- media_sets + media_assets. The admin "Sets & Packs" area wrote album images to
-- set_images under content_sets. Nothing ever joined the two, so:
--
--   * images added to an image set were stored but never shown anywhere;
--   * media_sets.asset_count stayed 0, so hasRealContent() filtered the set out
--     of the Trending row and the NSFW Image Sets row entirely;
--   * the comics row could not see chapters added through the album editor.
--
-- Fix
-- ----------------------------------------------------------------------------
-- 1. content_sets gains media_set_id, an optional 1:1 link to the storefront
--    set it publishes as.
-- 2. asset_count on the linked media_set is recomputed from BOTH media_assets
--    (private bucket files) and set_images (third-party album links), so a set
--    is "real content" as soon as either has a row.
--
-- Apply with: supabase db push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Link a reusable album to the storefront set it publishes as
-- ----------------------------------------------------------------------------
alter table public.content_sets
  add column if not exists media_set_id uuid
    references public.media_sets (id) on delete set null;

comment on column public.content_sets.media_set_id is
  'Storefront media_sets row this album publishes as. Null until the set is listed on the site.';

-- Where the album belongs on the homepage once published. Without this every
-- album could only ever land in the NSFW Image Sets row, so a comics album had
-- no way to reach the Manga + Comics row.
alter table public.content_sets
  add column if not exists category text not null default 'arts';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_sets_category_check'
      and conrelid = 'public.content_sets'::regclass
  ) then
    alter table public.content_sets
      add constraint content_sets_category_check
      check (category in ('animation', 'arts', 'games', 'comics'));
  end if;
end;
$$;

comment on column public.content_sets.category is
  'Homepage collection the album publishes into: animation, arts, games or comics.';

-- One album per storefront set: prevents two albums fighting over one listing.
create unique index if not exists content_sets_media_set_idx
  on public.content_sets (media_set_id)
  where media_set_id is not null;

-- ----------------------------------------------------------------------------
-- 2. Single source of truth for a storefront set's asset count
-- ----------------------------------------------------------------------------
-- Counts private files (media_assets) plus every album image (set_images) that
-- belongs to a content_set linked to this media_set.
create or replace function public.recompute_media_set_count(p_media_set uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.media_sets s
  set asset_count = (
    (select count(*) from public.media_assets a where a.set_id = p_media_set)
    + (
      select count(*)
      from public.set_images i
      join public.content_sets c on c.id = i.set_id
      where c.media_set_id = p_media_set
    )
  )
  where s.id = p_media_set;
$$;

-- Only the trigger machinery and the service role need to run this. It is a
-- write path, so it is not exposed to ordinary signed-in clients.
revoke all on function public.recompute_media_set_count(uuid) from public;
revoke all on function public.recompute_media_set_count(uuid) from authenticated;
grant execute on function public.recompute_media_set_count(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 3. media_assets changes refresh the count (replaces the old trigger body)
-- ----------------------------------------------------------------------------
create or replace function public.sync_asset_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_media_set_count(old.set_id);
    return null;
  end if;

  perform public.recompute_media_set_count(new.set_id);

  -- Moving an asset between sets requires refreshing the old set as well.
  if tg_op = 'UPDATE' and old.set_id is distinct from new.set_id then
    perform public.recompute_media_set_count(old.set_id);
  end if;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. set_images changes refresh the linked storefront set
-- ----------------------------------------------------------------------------
create or replace function public.sync_set_image_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_media_set uuid;
  changed_album uuid;
begin
  -- Resolve the storefront set for the album that changed. TG_OP is used
  -- explicitly because NEW is not populated on DELETE.
  if tg_op = 'DELETE' then
    changed_album := old.set_id;
  else
    changed_album := new.set_id;
  end if;

  select c.media_set_id into affected_media_set
  from public.content_sets c
  where c.id = changed_album;

  if affected_media_set is not null then
    perform public.recompute_media_set_count(affected_media_set);
  end if;

  -- Re-assigning an image to another album must refresh the previous album too.
  if tg_op = 'UPDATE' and old.set_id is distinct from new.set_id then
    select c.media_set_id into affected_media_set
    from public.content_sets c
    where c.id = old.set_id;

    if affected_media_set is not null then
      perform public.recompute_media_set_count(affected_media_set);
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists set_images_sync_count on public.set_images;
create trigger set_images_sync_count
  after insert or delete or update of set_id on public.set_images
  for each row execute function public.sync_set_image_count();

-- ----------------------------------------------------------------------------
-- 5. Linking an existing album to a set backfills its count immediately
-- ----------------------------------------------------------------------------
create or replace function public.sync_content_set_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.media_set_id is not null then
    perform public.recompute_media_set_count(new.media_set_id);
  end if;
  if tg_op = 'UPDATE' and old.media_set_id is distinct from new.media_set_id
     and old.media_set_id is not null then
    perform public.recompute_media_set_count(old.media_set_id);
  end if;
  return null;
end;
$$;

drop trigger if exists content_sets_sync_link on public.content_sets;
create trigger content_sets_sync_link
  after insert or update of media_set_id on public.content_sets
  for each row execute function public.sync_content_set_link();

-- ----------------------------------------------------------------------------
-- 6. Backfill: publish every existing album that already has images
-- ----------------------------------------------------------------------------
-- Albums created before this migration have no media_sets row, so nothing in
-- them could ever appear on the site. This creates one storefront set per
-- populated, unlinked album using its first image as the poster.
insert into public.media_sets (
  slug,
  title,
  description,
  thumbnail_path,
  primary_type,
  category,
  access_level,
  published,
  is_new,
  is_trending,
  sort_order
)
select
  -- Slug must satisfy ^[a-z0-9]+(-[a-z0-9]+)*$ and be unique.
  coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'set'
  ) || '-' || substr(replace(c.id::text, '-', ''), 1, 6),
  c.name,
  null,
  first_image.image_url,
  case when c.category = 'comics' then 'pdf' else 'image' end,
  c.category,
  'full',
  true,
  true,
  false,
  0
from public.content_sets c
join lateral (
  select i.image_url
  from public.set_images i
  where i.set_id = c.id
  order by i.sort_order asc, i.created_at asc
  limit 1
) as first_image on true
where c.media_set_id is null
  and not exists (
    select 1 from public.media_sets m
    where m.slug = coalesce(
      nullif(
        trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'set'
    ) || '-' || substr(replace(c.id::text, '-', ''), 1, 6)
  );

-- Link each newly created storefront set back to its album.
update public.content_sets c
set media_set_id = m.id
from public.media_sets m
where c.media_set_id is null
  and m.slug = coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(c.name), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'set'
  ) || '-' || substr(replace(c.id::text, '-', ''), 1, 6);

-- ----------------------------------------------------------------------------
-- 7. Recompute every count so current rows are correct right away
-- ----------------------------------------------------------------------------
do $$
declare
  row_id uuid;
begin
  for row_id in select id from public.media_sets loop
    perform public.recompute_media_set_count(row_id);
  end loop;
end;
$$;
