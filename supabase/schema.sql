create extension if not exists pgcrypto;

create type public.user_role as enum ('admin','user');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'user',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.private_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  encrypted_password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clothing_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique(user_id,name)
);

create table if not exists public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category_id uuid references public.clothing_categories(id) on delete set null,
  subcategory text,
  color text,
  size text,
  brand text,
  occasion text,
  season text,
  notes text,
  image_path text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  occasion text,
  notes text,
  is_favorite boolean not null default false,
  is_day_look boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  clothing_item_id uuid not null references public.clothing_items(id) on delete cascade,
  primary key(outfit_id,clothing_item_id)
);

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.clothing_categories add column if not exists is_active boolean not null default true;

create index if not exists clothing_items_user_id_idx on public.clothing_items(user_id);
create index if not exists outfits_user_id_idx on public.outfits(user_id);
create index if not exists outfit_items_outfit_idx on public.outfit_items(outfit_id);
create index if not exists outfit_items_item_idx on public.outfit_items(clothing_item_id);
create unique index if not exists outfits_one_day_look_per_user on public.outfits(user_id) where is_day_look=true;
create unique index if not exists active_admin_message_unique on public.admin_messages((active)) where active=true;
create unique index if not exists clothing_categories_global_name_unique on public.clothing_categories(lower(trim(name))) where user_id is null;

alter table public.profiles enable row level security;
alter table public.private_credentials enable row level security;
alter table public.clothing_categories enable row level security;
alter table public.clothing_items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.admin_messages enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id=auth.uid() and role='user' and is_blocked=false) with check (id=auth.uid() and role='user' and is_blocked=false);

drop policy if exists categories_own on public.clothing_categories;
drop policy if exists categories_select on public.clothing_categories;
drop policy if exists categories_insert on public.clothing_categories;
drop policy if exists categories_update on public.clothing_categories;
drop policy if exists categories_delete on public.clothing_categories;
create policy categories_select on public.clothing_categories for select to authenticated using ((user_id is null or user_id=auth.uid()) and is_active=true);
create policy categories_insert on public.clothing_categories for insert to authenticated with check (user_id=auth.uid());
create policy categories_update on public.clothing_categories for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy categories_delete on public.clothing_categories for delete to authenticated using (user_id=auth.uid());

drop policy if exists clothes_own on public.clothing_items;
create policy clothes_own on public.clothing_items for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists outfits_own on public.outfits;
create policy outfits_own on public.outfits for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists outfit_items_own on public.outfit_items;
create policy outfit_items_own on public.outfit_items for all to authenticated using (exists(select 1 from public.outfits o where o.id=outfit_id and o.user_id=auth.uid())) with check (exists(select 1 from public.outfits o where o.id=outfit_id and o.user_id=auth.uid()));


drop policy if exists messages_auth_read on public.admin_messages;
create policy messages_auth_read on public.admin_messages for select to authenticated using (active=true);

-- private_credentials intentionally has no authenticated policy. Server-side admin operations use the service role.

insert into public.clothing_categories (user_id,name)
select null, name
from (values
  ('Camisetas'),('Blusas'),('Camisas'),('Croppeds'),('Vestidos'),('Saias'),('Shorts'),('Calças'),('Jeans'),('Casacos'),('Jaquetas'),('Moletons'),('Pijamas'),('Roupas íntimas'),('Lingerie'),('Sutiãs'),('Calcinhas'),('Meias'),('Sapatos'),('Tênis'),('Sandálias'),('Botas'),('Bolsas'),('Acessórios'),('Outros')
) as seed(name)
where not exists (
  select 1 from public.clothing_categories existing
  where existing.user_id is null and lower(trim(existing.name)) = lower(trim(seed.name))
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('clothing','clothing',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Direct browser storage access is scoped by the first path segment, which is the auth user id.
drop policy if exists clothing_select_own on storage.objects;
create policy clothing_select_own on storage.objects for select to authenticated using (bucket_id='clothing' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists clothing_insert_own on storage.objects;
create policy clothing_insert_own on storage.objects for insert to authenticated with check (bucket_id='clothing' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists clothing_update_own on storage.objects;
create policy clothing_update_own on storage.objects for update to authenticated using (bucket_id='clothing' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='clothing' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists clothing_delete_own on storage.objects;
create policy clothing_delete_own on storage.objects for delete to authenticated using (bucket_id='clothing' and (storage.foldername(name))[1]=auth.uid()::text);

-- Calendar and wardrobe usage history
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
