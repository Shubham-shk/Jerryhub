-- ============================================================================
-- Jerryhub — starter Sets & Packs content
-- ============================================================================
-- The admin CMS expects generic default names. Seeding Set 1 and Pack 1 at the
-- database level means the Sets and Packs areas are never empty on a fresh
-- project, even before the first admin write.
--
-- Idempotent: nothing is inserted when content already exists.
-- ============================================================================

insert into public.content_sets (name, sort_order)
select 'Set 1', 1
where not exists (select 1 from public.content_sets);

insert into public.content_packs (name, set_id, sort_order)
select
  'Pack 1',
  (
    select id
    from public.content_sets
    order by sort_order asc, created_at asc
    limit 1
  ),
  1
where not exists (select 1 from public.content_packs);
