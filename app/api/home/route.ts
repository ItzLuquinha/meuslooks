import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RawItem = { id: string; name: string; image_path: string | null; clothing_categories: Array<{ name: string }> | null };
type UsageRow = { clothing_item_id: string; worn_on?: string };

function categoryName(value: RawItem['clothing_categories']) { return value?.[0]?.name || 'Sem categoria'; }

export async function GET() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const [
    { data: profile, error: profileError },
    { data: message, error: messageError },
    { data: dayLook, error: dayLookError },
    { data: saved, error: savedError },
    { data: recentUsage, error: recentUsageError },
    { data: allUsage, error: allUsageError },
    { count: clothingCount, error: clothingCountError },
    { count: outfitCount, error: outfitCountError },
    { count: favoriteClothing, error: favoriteClothingError },
    { count: favoriteOutfits, error: favoriteOutfitsError },
  ] = await Promise.all([
    admin.from('profiles').select('id,name,email').eq('id', context.userId).single(),
    admin.from('admin_messages').select('id,title,body,active').eq('active', true).maybeSingle(),
    admin.from('outfits').select('id,user_id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path,category_id,clothing_categories(id,name)))').eq('user_id', context.userId).eq('is_day_look', true).maybeSingle(),
    admin.from('outfits').select('id,user_id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path,category_id,clothing_categories(id,name)))').eq('user_id', context.userId).eq('is_favorite', true).order('created_at', { ascending: false }).limit(6),
    admin.from('wardrobe_usage').select('clothing_item_id,worn_on').eq('user_id', context.userId).order('worn_on', { ascending: false }).limit(8),
    admin.from('wardrobe_usage').select('clothing_item_id').eq('user_id', context.userId),
    admin.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', context.userId),
    admin.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', context.userId),
    admin.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('is_favorite', true),
    admin.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('is_favorite', true),
  ]);

  if (profileError || messageError || dayLookError || savedError || recentUsageError || allUsageError || clothingCountError || outfitCountError || favoriteClothingError || favoriteOutfitsError) {
    return NextResponse.json({ error: 'Não foi possível carregar a página inicial.' }, { status: 500 });
  }

  const recentIds = [...new Set(((recentUsage || []) as UsageRow[]).map((row) => row.clothing_item_id))];
  const usedLookup = recentIds.length ? await admin.from('clothing_items').select('id,name,image_path,clothing_categories(name)').eq('user_id', context.userId).in('id', recentIds) : { data: [], error: null };
  if (usedLookup.error) return NextResponse.json({ error: 'Não foi possível carregar o histórico recente.' }, { status: 500 });
  const usedRows = usedLookup.data as RawItem[] | null;
  const usedById = new Map((usedRows || []).map((item) => [item.id, item]));
  const recentUsed = recentIds.map((id) => usedById.get(id)).filter((item): item is RawItem => Boolean(item)).map((item) => ({ id: item.id, name: item.name, image_path: item.image_path, category: categoryName(item.clothing_categories) }));

  const usedIdSet = new Set(((allUsage || []) as UsageRow[]).map((row) => row.clothing_item_id));
  const allItemsResult = await admin.from('clothing_items').select('id,name,image_path,clothing_categories(name)').eq('user_id', context.userId).order('created_at', { ascending: false });
  if (allItemsResult.error) return NextResponse.json({ error: 'Não foi possível carregar o guarda-roupa.' }, { status: 500 });
  const allItems = allItemsResult.data as RawItem[] | null;
  const waitingAll = (allItems || []).filter((item: RawItem) => !usedIdSet.has(item.id));
  const waiting = waitingAll.slice(0, 6).map((item) => ({ id: item.id, name: item.name, image_path: item.image_path, category: categoryName(item.clothing_categories) }));

  return NextResponse.json({
    profile,
    message: message || null,
    dayLook: dayLook || null,
    saved: saved || [],
    summary: { clothing: clothingCount || 0, outfits: outfitCount || 0, favorites: (favoriteClothing || 0) + (favoriteOutfits || 0), never_used: waitingAll.length },
    recentUsed,
    waiting,
  });
}
