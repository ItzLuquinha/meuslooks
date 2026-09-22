import { NextResponse } from 'next/server';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function uniqueIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.map((id) => String(id)).filter(Boolean))].slice(0, 12);
}

async function guard() {
  if (!(await requireAdminSession())) return null;
  return await getSelectedAdminUser();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const itemIds = uniqueIds(body.item_ids);
  if (!name || !itemIds?.length) return NextResponse.json({ error: 'Nome e peças são obrigatórios.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: outfit } = await admin.from('outfits').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!outfit) return NextResponse.json({ error: 'Look não encontrado.' }, { status: 404 });
  const { data: valid } = await admin.from('clothing_items').select('id').eq('user_id', user.id).in('id', itemIds);
  if (!valid || valid.length !== itemIds.length) return NextResponse.json({ error: 'Peças inválidas.' }, { status: 400 });
  const { data: previousOutfit } = await admin.from('outfits').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  const { data: previousItems } = await admin.from('outfit_items').select('clothing_item_id').eq('outfit_id', id);
  const { error } = await admin.from('outfits').update({
    name,
    occasion: String(body.occasion || '').trim() || null,
    notes: String(body.notes || '').trim() || null,
    is_favorite: Boolean(body.is_favorite),
  }).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: deleteError } = await admin.from('outfit_items').delete().eq('outfit_id', id);
  if (deleteError) {
    if (previousOutfit) await admin.from('outfits').update(previousOutfit).eq('id', id).eq('user_id', user.id);
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  const { error: itemError } = await admin.from('outfit_items').insert(itemIds.map((clothing_item_id) => ({ outfit_id: id, clothing_item_id })));
  if (itemError) {
    if (previousOutfit) await admin.from('outfits').update(previousOutfit).eq('id', id).eq('user_id', user.id);
    await admin.from('outfit_items').delete().eq('outfit_id', id);
    if (previousItems?.length) await admin.from('outfit_items').insert(previousItems.map((entry) => ({ outfit_id: id, clothing_item_id: entry.clothing_item_id })));
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from('outfits').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
