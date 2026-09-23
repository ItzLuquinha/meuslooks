import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RawCategory = { id: string; name: string };
type RawClothing = {
  id: string;
  name: string;
  image_path: string | null;
  clothing_categories: RawCategory[] | null;
};
type RawWear = { id: string; worn_on: string; outfits: Array<{ id: string; name: string }> | null };
type RawUsage = { clothing_item_id: string; worn_on: string; clothing_items: RawClothing | null };

function categoryName(value: RawCategory[] | null) { return value?.[0]?.name || 'Sem categoria'; }

export async function GET() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const [clothingResult, outfitsResult, favoriteItemsResult, favoriteOutfitsResult, wearsResult, usageResult] = await Promise.all([
    admin.from('clothing_items').select('id,name,image_path,clothing_categories(id,name)', { count: 'exact' }).eq('user_id', context.userId),
    admin.from('outfits').select('id,name,occasion,is_favorite', { count: 'exact' }).eq('user_id', context.userId),
    admin.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('is_favorite', true),
    admin.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('is_favorite', true),
    admin.from('outfit_wears').select('id,worn_on,outfits(id,name)', { count: 'exact' }).eq('user_id', context.userId).order('worn_on', { ascending: false }).limit(120),
    admin.from('wardrobe_usage').select('clothing_item_id,worn_on,clothing_items(id,name,image_path,clothing_categories(id,name))').eq('user_id', context.userId).order('worn_on', { ascending: false }).limit(1000),
  ]);
  if (clothingResult.error || outfitsResult.error || favoriteItemsResult.error || favoriteOutfitsResult.error || wearsResult.error || usageResult.error) {
    return NextResponse.json({ error: 'Não foi possível calcular as estatísticas.' }, { status: 500 });
  }

  const clothing = (clothingResult.data || []) as RawClothing[];
  const usage = (usageResult.data || []) as RawUsage[];
  const wears = (wearsResult.data || []) as RawWear[];
  const counts = new Map<string, number>();
  const lastUsed = new Map<string, string>();
  for (const row of usage) {
    counts.set(row.clothing_item_id, (counts.get(row.clothing_item_id) || 0) + 1);
    if (!lastUsed.has(row.clothing_item_id)) lastUsed.set(row.clothing_item_id, row.worn_on);
  }

  const usageByItem = clothing.map((item) => ({
    id: item.id,
    name: item.name,
    image_path: item.image_path,
    category: categoryName(item.clothing_categories),
    count: counts.get(item.id) || 0,
    last_used: lastUsed.get(item.id) || null,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const neverUsed = usageByItem.filter((item) => item.count === 0);
  const littleUsed = usageByItem.filter((item) => item.count > 0 && item.count <= 2).sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
  const categoryCounts = new Map<string, number>();
  for (const item of clothing) {
    const name = categoryName(item.clothing_categories);
    categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1);
  }
  const categories = [...categoryCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return NextResponse.json({
    totals: {
      clothing: clothingResult.count || 0,
      outfits: outfitsResult.count || 0,
      favorite_clothing: favoriteItemsResult.count || 0,
      favorite_outfits: favoriteOutfitsResult.count || 0,
      wears: wearsResult.count || 0,
      never_used: neverUsed.length,
    },
    most_used: usageByItem.filter((item) => item.count > 0).slice(0, 6),
    never_used: neverUsed.slice(0, 12),
    little_used: littleUsed.slice(0, 12),
    categories: categories.slice(0, 8),
    recent_wears: wears.slice(0, 8).map((wear) => ({ id: wear.id, worn_on: wear.worn_on, outfit_name: wear.outfits?.[0]?.name || 'Look' })),
  });
}
