import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RawFavoriteItem = {
  id: string;
  name: string;
  image_path: string | null;
  category_id: string | null;
  is_favorite: boolean;
  clothing_categories: Array<{ id: string; name: string }> | null;
};

type RawFavoriteOutfitItem = { clothing_item_id: string; clothing_items: RawFavoriteItem[] | null };
type RawFavoriteOutfit = {
  id: string;
  name: string;
  occasion: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_day_look: boolean;
  created_at: string;
  outfit_items: RawFavoriteOutfitItem[] | null;
};

function categoryValue(value: RawFavoriteItem['clothing_categories']) {
  return value?.[0] ?? null;
}

export async function GET() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const [{ data: items, error: itemError }, { data: outfits, error: outfitError }] = await Promise.all([
    admin.from('clothing_items').select('id,name,image_path,category_id,is_favorite,clothing_categories(id,name)').eq('user_id', context.userId).eq('is_favorite', true).order('created_at', { ascending: false }),
    admin.from('outfits').select('id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path,category_id,clothing_categories(id,name)))').eq('user_id', context.userId).eq('is_favorite', true).order('created_at', { ascending: false }),
  ]);
  if (itemError || outfitError) return NextResponse.json({ error: 'Não foi possível carregar os favoritos.' }, { status: 500 });

  const normalizedItems = ((items || []) as RawFavoriteItem[]).map((item) => ({ ...item, clothing_categories: categoryValue(item.clothing_categories) }));
  const normalizedOutfits = ((outfits || []) as RawFavoriteOutfit[]).map((outfit) => ({
    ...outfit,
    outfit_items: (outfit.outfit_items || []).map((entry) => ({
      ...entry,
      clothing_items: entry.clothing_items?.[0] ? { ...entry.clothing_items[0], clothing_categories: categoryValue(entry.clothing_items[0].clothing_categories) } : null,
    })),
  }));
  return NextResponse.json({ items: normalizedItems, outfits: normalizedOutfits });
}
