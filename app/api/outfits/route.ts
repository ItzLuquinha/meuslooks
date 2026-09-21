import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function uniqueIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((id) => String(id)).filter(Boolean))].slice(0, 7);
}

async function getUser() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return null;
  return context;
}

export async function GET() {
  const context = await getUser();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('outfits')
    .select('id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path,category_id,clothing_categories(id,name)))')
    .eq('user_id', context.userId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ outfits: data || [] });
}

export async function POST(req: Request) {
  const context = await getUser();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const itemIds = uniqueIds(body.item_ids);
  if (!name || !itemIds.length) return NextResponse.json({ error: 'Nome e pelo menos uma peça são necessários.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: items } = await admin.from('clothing_items').select('id').eq('user_id', context.userId).in('id', itemIds);
  if (!items || items.length !== itemIds.length) return NextResponse.json({ error: 'Uma ou mais peças não pertencem à conta.' }, { status: 403 });

  const isDayLook = Boolean(body.is_day_look);
  if (isDayLook) await admin.from('outfits').update({ is_day_look: false }).eq('user_id', context.userId);
  const { data: outfit, error } = await admin.from('outfits').insert({
    user_id: context.userId,
    name,
    occasion: String(body.occasion || '').trim() || null,
    notes: String(body.notes || '').trim() || null,
    is_favorite: Boolean(body.is_favorite),
    is_day_look: isDayLook,
  }).select('*').single();
  if (error || !outfit) return NextResponse.json({ error: error?.message || 'Não foi possível criar o look.' }, { status: 400 });
  const { error: itemError } = await admin.from('outfit_items').insert(itemIds.map((id) => ({ outfit_id: outfit.id, clothing_item_id: id })));
  if (itemError) {
    await admin.from('outfits').delete().eq('id', outfit.id).eq('user_id', context.userId);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }
  return NextResponse.json({ outfit }, { status: 201 });
}
