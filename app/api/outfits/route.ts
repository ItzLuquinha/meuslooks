import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RawCategory = { id: string; name: string };
type RawItem = { id: string; name: string; image_path: string | null; category_id: string | null; clothing_categories: RawCategory[] | null };
type RawOutfit = { id: string; user_id: string; name: string; occasion: string | null; notes: string | null; is_favorite: boolean; is_day_look: boolean; created_at: string; outfit_items: Array<{ clothing_item_id: string; clothing_items: RawItem | null }> | null };

function uniqueIds(value: unknown) { return Array.isArray(value) ? [...new Set(value.map((id) => String(id)).filter(Boolean))].slice(0, 12) : []; }
function normalizeCategory(value: RawCategory[] | null) { return value?.[0] ?? null; }
function normalizeOutfit(outfit: RawOutfit) { return { ...outfit, outfit_items: (outfit.outfit_items || []).map((entry) => ({ ...entry, clothing_items: entry.clothing_items ? { ...entry.clothing_items, clothing_categories: normalizeCategory(entry.clothing_items.clothing_categories) } : null })) }; }

export async function GET() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from('outfits').select('id,user_id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path,category_id,clothing_categories(id,name)))').eq('user_id', context.userId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ outfits: ((data || []) as RawOutfit[]).map(normalizeOutfit) });
}

export async function POST(req: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const itemIds = uniqueIds(body.item_ids);
  if (!name || !itemIds.length) return NextResponse.json({ error: 'Nome e pelo menos uma peça são necessários.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: items } = await admin.from('clothing_items').select('id').eq('user_id', context.userId).in('id', itemIds);
  if (!items || items.length !== itemIds.length) return NextResponse.json({ error: 'Uma ou mais peças não pertencem à conta.' }, { status: 403 });

  const isDayLook = Boolean(body.is_day_look);
  let previousDayIds: string[] = [];
  if (isDayLook) {
    const { data: previousDay } = await admin.from('outfits').select('id').eq('user_id', context.userId).eq('is_day_look', true);
    previousDayIds = (previousDay || []).map((entry: { id: string }) => entry.id);
    const { error: clearDayError } = await admin.from('outfits').update({ is_day_look: false }).eq('user_id', context.userId);
    if (clearDayError) return NextResponse.json({ error: 'Não foi possível atualizar o Look do Dia.' }, { status: 400 });
  }

  const { data: outfit, error } = await admin.from('outfits').insert({ user_id: context.userId, name, occasion: String(body.occasion || '').trim() || null, notes: String(body.notes || '').trim() || null, is_favorite: Boolean(body.is_favorite), is_day_look: isDayLook }).select('*').single();
  if (error || !outfit) {
    if (previousDayIds.length) await admin.from('outfits').update({ is_day_look: true }).in('id', previousDayIds).eq('user_id', context.userId);
    return NextResponse.json({ error: error?.message || 'Não foi possível criar o look.' }, { status: 400 });
  }
  const { error: itemError } = await admin.from('outfit_items').insert(itemIds.map((id) => ({ outfit_id: outfit.id, clothing_item_id: id })));
  if (itemError) {
    await admin.from('outfits').delete().eq('id', outfit.id).eq('user_id', context.userId);
    if (previousDayIds.length) await admin.from('outfits').update({ is_day_look: true }).in('id', previousDayIds).eq('user_id', context.userId);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }
  return NextResponse.json({ outfit }, { status: 201 });
}
