-- ============================================================================
-- Jerryhub — per-set access level (Basic / Full) on albums
-- ============================================================================
-- Why this exists
-- ----------------------------------------------------------------------------
-- Access level lived only on public.media_sets, and every album published from
-- the Sets CMS hardcoded access_level = 'full'. There was no column to store a
-- Basic/Full choice on the album itself, so the admin had nothing to toggle and
-- any change made on the storefront row was invisible from the Sets area.
--
-- This migration makes content_sets the owner of the choice:
--   * content_sets.access_level stores 'public' | 'basic' | 'full';
--   * existing albums inherit the level of their linked storefront row;
--   * publishing an album uses the album's level instead of hardcoded 'full';
--   * the storefront row follows the album whenever the level changes.
--
-- Apply with: supabase db push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Column + constraint
-- ----------------------------------------------------------------------------
alter table public.content_sets
  add column if not exists access_level text not null default 'full';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_sets_access_level_check'
  ) then
    alter table public.content_sets
      add constraint content_sets_access_level_check
      check (access_level in ('public', 'basic', 'full'));
  end if;
end;
$$;

comment on column public.content_sets.access_level is
  'public = any signed-in account, basic = Basic Access or higher, full = Full Access only. Mirrored onto the linked media_sets row.';

-- ----------------------------------------------------------------------------
-- 2. Backfill from the storefront rows that already exist
-- ----------------------------------------------------------------------------
update public.content_sets c
   set access_level = m.access_level
  from public.media_sets m
 where c.media_set_id = m.id
   and c.access_level is distinct from m.access_level;

-- ----------------------------------------------------------------------------
-- 3. Publishing uses the album's own access level
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
       set thumbnail_path = coalesce(nullif(thumbnail_path, ''), new.image_url),
           access_level = album.access_level
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
        album.access_level,
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

-- ----------------------------------------------------------------------------
-- 4. Keep the storefront row in sync with name, collection and access level
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
         primary_type = case when new.category = 'comics' then 'pdf' else 'image' end,
         access_level = new.access_level
   where id = new.media_set_id;

  return null;
end;
$$;

drop trigger if exists content_sets_sync_details on public.content_sets;
create trigger content_sets_sync_details
  after insert or update of name, category, access_level on public.content_sets
  for each row execute function public.sync_content_set_details();

-- ----------------------------------------------------------------------------
-- 5. Bring every existing storefront row in line with its album
-- ----------------------------------------------------------------------------
update public.media_sets m
   set access_level = c.access_level
  from public.content_sets c
 where c.media_set_id = m.id
   and m.access_level is distinct from c.access_level;
