-- MEU LOOK — SUPABASE SETUP / REPAIR
-- Execute once in Supabase SQL Editor after the existing base schema is present.
-- Safe to run again after the first successful execution.

-- 1) Calendar + wardrobe usage history
create table if not exists public.outfit_wears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  worn_on date not null,
  note text,
  created_at timestamptz not null default now(),
  unique(user_id, worn_on)
);

create table if not exists public.wardrobe_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clothing_item_id uuid not null references public.clothing_items(id) on delete cascade,
  outfit_id uuid references public.outfits(id) on delete set null,
  worn_on date not null,
  created_at timestamptz not null default now(),
  unique(user_id, clothing_item_id, outfit_id, worn_on)
);

create index if not exists outfit_wears_user_date_idx on public.outfit_wears(user_id, worn_on);
create index if not exists wardrobe_usage_user_item_idx on public.wardrobe_usage(user_id, clothing_item_id, worn_on desc);

alter table public.outfit_wears enable row level security;
alter table public.wardrobe_usage enable row level security;

drop policy if exists outfit_wears_own on public.outfit_wears;
create policy outfit_wears_own on public.outfit_wears
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists wardrobe_usage_own on public.wardrobe_usage;
create policy wardrobe_usage_own on public.wardrobe_usage
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2) Migrate legacy favorites into the real source of truth.
-- The old table is archived instead of deleted so no old data disappears silently.
do $$
begin
  if to_regclass('public.favorites') is not null then
    update public.clothing_items as item
    set is_favorite = true
    from public.favorites as favorite
    where favorite.clothing_item_id = item.id
      and favorite.user_id = item.user_id;

    update public.outfits as outfit
    set is_favorite = true
    from public.favorites as favorite
    where favorite.outfit_id = outfit.id
      and favorite.user_id = outfit.user_id;

    if to_regclass('public.favorites_legacy_20260922') is null then
      alter table public.favorites rename to favorites_legacy_20260922;
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.favorites_legacy_20260922') is not null then
    execute 'alter table public.favorites_legacy_20260922 enable row level security';
  end if;
end $$;

-- 3) Repair duplicate global categories created by older schema runs.
with duplicates as (
  select id,
         first_value(id) over (partition by lower(trim(name)) order by id) as keeper_id
  from public.clothing_categories
  where user_id is null
)
update public.clothing_items as item
set category_id = duplicates.keeper_id
from duplicates
where item.category_id = duplicates.id
  and duplicates.id <> duplicates.keeper_id;

with duplicates as (
  select id,
         row_number() over (partition by lower(trim(name)) order by id) as row_number
  from public.clothing_categories
  where user_id is null
)
delete from public.clothing_categories as category
using duplicates
where category.id = duplicates.id
  and duplicates.row_number > 1;

create unique index if not exists clothing_categories_global_name_unique
  on public.clothing_categories(lower(trim(name)))
  where user_id is null;

-- 4) Keep one Look do Dia per user, then enforce it at database level.
with ranked as (
  select id,
         row_number() over (partition by user_id order by created_at desc, id desc) as row_number
  from public.outfits
  where is_day_look = true
)
update public.outfits as outfit
set is_day_look = false
from ranked
where outfit.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists outfits_one_day_look_per_user
  on public.outfits(user_id)
  where is_day_look = true;
