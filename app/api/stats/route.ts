import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const [clothingResult, outfitsResult, favoritesItemsResult, favoritesOutfitsResult, wearsResult, usageResult, categoriesResult] = await Promise.all([
    admin.from('clothing_items').select('id,name,image_path,color,brand,category_id,clothing_categories(name)', { count: 'exact' }).eq('user_id', context.userId),
    admin.from('outfits').select('id,name,occasion,is_favorite', { count: 'exact' }).eq('user_id', context.userId),
    admin.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('is_favorite', true),
    admin.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', context.userId).eq('is_favorite', true),
    admin.from('outfit_wears').select('id,worn_on,outfit_id,outfits(id,name)', { count: 'exact' }).eq('user_id', context.userId).order('worn_on', { ascending: false }),
    admin.from('wardrobe_usage').select('clothing_item_id,worn_on,clothing_items(id,name,image_path,category_id,clothing_categories(name))').eq('user_id', context.userId).order('worn_on', { ascending: false }),
    admin.from('clothing_categories').select('id,name').or(`user_id.is.null,user_id.eq.${context.userId}`).eq('is_active', true).order('name')
  ]);
  if (clothingResult.error || outfitsResult.error || wearsResult.error || usageResult.error) return NextResponse.json({ error: 'Não foi possível calcular as estatísticas.' }, { status: 500 });
  const clothing = clothingResult.data || [];
  const outfits = outfitsResult.data || [];
  const usage = usageResult.data || [];
  const wears = wearsResult.data || [];
  const counts = new Map<string, number>();
  const lastUsed = new Map<string, string>();
  for (const row of usage) {
    counts.set(row.clothing_item_id, (counts.get(row.clothing_item_id) || 0) + 1);
    if (!lastUsed.has(row.clothing_item_id)) lastUsed.set(row.clothing_item_id, row.worn_on);
  }
  const usageByItem = clothing.map((item: any) => ({ id: item.id, name: item.name, image_path: item.image_path, category: item.clothing_categories?.name || 'Sem categoria', count: counts.get(item.id) || 0, last_used: lastUsed.get(item.id) || null })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const neverUsed = usageByItem.filter((item) => item.count === 0);
  const categoryCounts = new Map<string, number>();
  for (const item of clothing) { const category = item.clothing_categories?.name || 'Sem categoria'; categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1); }
  const categories = [...categoryCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return NextResponse.json({
    totals: { clothing: clothingResult.count || 0, outfits: outfitsResult.count || 0, favorite_clothing: favoritesItemsResult.count || 0, favorite_outfits: favoritesOutfitsResult.count || 0, wears: wearsResult.count || 0, never_used: neverUsed.length },
    most_used: usageByItem.slice(0, 6),
    never_used: neverUsed.slice(0, 12),
    categories: categories.slice(0, 8),
    recent_wears: wears.slice(0, 8).map((wear: any) => ({ id: wear.id, worn_on: wear.worn_on, outfit_name: wear.outfits?.name || 'Look' }))
  });
}
