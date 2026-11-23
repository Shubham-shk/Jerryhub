-- ============================================================================
-- Jerryhub — album images publish themselves
-- ============================================================================
-- Why this exists
-- ----------------------------------------------------------------------------
-- Images added to an album (content_sets + set_images) only became visible on
-- the public site when the browser remembered to call
-- ensureMediaSetForContentSet() afterwards. If that call failed, was skipped by
-- an older bundle, or the request never left the browser, the images were saved
-- but stayed invisible forever: no storefront media_sets row, asset_count 0,
-- and nothing in the NSFW Image Sets, Trending or Manga + Comics rows.
--
-- This migration moves the guarantee into the database:
--   * inserting an album image creates (or reuses) the album's storefront
--     media_sets row and links it;
--   * the storefront category / primary type follow the album;
--   * asset_count is recomputed from set_images + media_assets every time;
--   * existing albums that already had images are backfilled.
--
-- Apply with: supabase db push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Slug helper — must satisfy ^[a-z0-9]+(-[a-z0-9]+)*$ and be unique
-- ----------------------------------------------------------------------------
create or replace function public.album_media_slug(p_set_id uuid, p_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'set'
  ) || '-' || substr(replace(p_set_id::text, '-', ''), 1, 6);
$$;

-- ----------------------------------------------------------------------------
-- 2. Publish an album the moment an image lands in it
-- ----------------------------------------------------------------------------
create or replace function public.publish_album_media_set()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  album public.content_sets%rowtype;
  target uuid;
  slug_candidate text;
  attempt int := 0;
begin
  select * into album from public.content_sets where id = new.set_id;
  if album.id is null then
    return null;
  end if;

  -- Already published: keep the poster and count in step with the album.
  if album.media_set_id is not null then
    update public.media_sets
       set thumbnail_path = coalesce(nullif(thumbnail_path, ''), new.image_url)
     where id = album.media_set_id;
    perform public.recompute_media_set_count(album.media_set_id);
    return null;
  end if;

  -- First image of an unpublished album: create its storefront listing.
  slug_candidate := public.album_media_slug(album.id, album.name);
  loop
    begin
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
      ) values (
        slug_candidate,
        album.name,
        null,
        new.image_url,
        case when album.category = 'comics' then 'pdf' else 'image' end,
        album.category,
        'full',
        true,
        true,
        false,
        0
      )
      returning id into target;
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 20 then
        raise;
      end if;
      slug_candidate := public.album_media_slug(album.id, album.name) || '-' || attempt::text;
    end;
  end loop;

  update public.content_sets
     set media_set_id = target
   where id = album.id;

  perform public.recompute_media_set_count(target);
  return null;
end;
$$;

drop trigger if exists set_images_publish_album on public.set_images;
create trigger set_images_publish_album
  after insert on public.set_images
  for each row execute function public.publish_album_media_set();

-- ----------------------------------------------------------------------------
-- 3. Keep the storefront row in sync with the album name and collection
-- ----------------------------------------------------------------------------
create or replace function public.sync_content_set_details()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.media_set_id is null then
    return null;
  end if;

  update public.media_sets
     set title = new.name,
         category = new.category,
         primary_type = case when new.category = 'comics' then 'pdf' else 'image' end
   where id = new.media_set_id;

  return null;
end;
$$;

drop trigger if exists content_sets_sync_details on public.content_sets;
create trigger content_sets_sync_details
  after insert or update of name, category on public.content_sets
  for each row execute function public.sync_content_set_details();

-- ----------------------------------------------------------------------------
-- 4. Backfill albums that already have images but no storefront listing
-- ----------------------------------------------------------------------------
do $$
declare
  album record;
  target uuid;
  slug_candidate text;
  attempt int;
begin
  for album in
    select c.*, first_image.image_url
    from public.content_sets c
    join lateral (
      select i.image_url
      from public.set_images i
      where i.set_id = c.id
      order by i.sort_order asc, i.created_at asc
      limit 1
    ) as first_image on true
    where c.media_set_id is null
  loop
    slug_candidate := public.album_media_slug(album.id, album.name);
    attempt := 0;
    loop
      begin
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
        ) values (
          slug_candidate,
          album.name,
          null,
          album.image_url,
          case when album.category = 'comics' then 'pdf' else 'image' end,
          album.category,
          'full',
          true,
          true,
          false,
          0
        )
        returning id into target;
        exit;
      exception when unique_violation then
        attempt := attempt + 1;
        if attempt > 20 then
          raise;
        end if;
        slug_candidate := public.album_media_slug(album.id, album.name) || '-' || attempt::text;
      end;
    end loop;

    update public.content_sets set media_set_id = target where id = album.id;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Recompute every count so the public rows are correct immediately
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
