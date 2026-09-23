import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function uniqueIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.map((id) => String(id)).filter(Boolean))].slice(0, 12);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const itemIds = uniqueIds(body.item_ids);
  if (!name || !itemIds?.length) return NextResponse.json({ error: 'Nome e pelo menos uma peça são necessários.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: outfit } = await admin.from('outfits').select('id,user_id').eq('id', id).eq('user_id', context.userId).maybeSingle();
  if (!outfit) return NextResponse.json({ error: 'Look não encontrado.' }, { status: 404 });
  const { data: validItems } = await admin.from('clothing_items').select('id').eq('user_id', context.userId).in('id', itemIds);
  if (!validItems || validItems.length !== itemIds.length) return NextResponse.json({ error: 'Uma ou mais peças não pertencem à conta.' }, { status: 403 });
  const isDayLook = Boolean(body.is_day_look);
  let previousDayIds: string[] = [];
  if (isDayLook) {
    const { data: previousDay } = await admin.from('outfits').select('id').eq('user_id', context.userId).eq('is_day_look', true).neq('id', id);
    previousDayIds = (previousDay || []).map((entry: { id: string }) => entry.id);
    const { error: clearDayError } = await admin.from('outfits').update({ is_day_look: false }).eq('user_id', context.userId).neq('id', id);
    if (clearDayError) return NextResponse.json({ error: 'Não foi possível atualizar o Look do Dia.' }, { status: 400 });
  }
  const { data: previousOutfit } = await admin.from('outfits').select('*').eq('id', id).eq('user_id', context.userId).maybeSingle();
  const { data: previousItems } = await admin.from('outfit_items').select('clothing_item_id').eq('outfit_id', id);
  const { error } = await admin.from('outfits').update({
    name,
    occasion: String(body.occasion || '').trim() || null,
    notes: String(body.notes || '').trim() || null,
    is_favorite: Boolean(body.is_favorite),
    is_day_look: isDayLook,
  }).eq('id', id).eq('user_id', context.userId);
  if (error) {
    if (previousDayIds.length) await admin.from('outfits').update({ is_day_look: true }).in('id', previousDayIds).eq('user_id', context.userId);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const { error: deleteError } = await admin.from('outfit_items').delete().eq('outfit_id', id);
  if (deleteError) {
    if (previousOutfit) await admin.from('outfits').update(previousOutfit).eq('id', id).eq('user_id', context.userId);
    if (previousDayIds.length) await admin.from('outfits').update({ is_day_look: true }).in('id', previousDayIds).eq('user_id', context.userId);
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  const { error: itemError } = await admin.from('outfit_items').insert(itemIds.map((clothing_item_id) => ({ outfit_id: id, clothing_item_id })));
  if (itemError) {
    await admin.from('outfits').update(previousOutfit || {}).eq('id', id).eq('user_id', context.userId);
    await admin.from('outfit_items').delete().eq('outfit_id', id);
    if (previousItems?.length) await admin.from('outfit_items').insert(previousItems.map((entry: { clothing_item_id: string }) => ({ outfit_id: id, clothing_item_id: entry.clothing_item_id })));
    if (previousDayIds.length) await admin.from('outfits').update({ is_day_look: true }).in('id', previousDayIds).eq('user_id', context.userId);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from('outfits').delete().eq('id', id).eq('user_id', context.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
