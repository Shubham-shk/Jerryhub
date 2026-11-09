-- ============================================================================
-- Content collections for the redesigned homepage
-- ============================================================================
-- The homepage is organised into four content collections:
--   animation -> Newest Uploads (2D animations / videos)
--   arts      -> NSFW Arts & Videos
--   games     -> 2D Games
--   comics    -> Manga + Comics
--
-- primary_type stays responsible for how an asset is rendered (video player,
-- gallery, PDF reader, funscript download); category only controls curation.
-- Existing rows default to 'animation' and can be recategorised in the admin.
-- ============================================================================

alter table public.media_sets
  add column if not exists category text not null default 'animation';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_sets_category_check'
      and conrelid = 'public.media_sets'::regclass
  ) then
    alter table public.media_sets
      add constraint media_sets_category_check
      check (category in ('animation', 'arts', 'games', 'comics'));
  end if;
end;
$$;

comment on column public.media_sets.category is
  'Homepage collection: animation, arts, games or comics. primary_type still controls playback.';

create index if not exists media_sets_category_idx
  on public.media_sets (category, published, sort_order, created_at desc);
