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
create policy outfit_wears_own on public.outfit_wears for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists wardrobe_usage_own on public.wardrobe_usage;
create policy wardrobe_usage_own on public.wardrobe_usage for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
