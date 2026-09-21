import { NextResponse } from 'next/server';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function uniqueIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((id) => String(id)).filter(Boolean))].slice(0, 7);
}

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const user = await getSelectedAdminUser();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('outfits')
    .select('id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path,category_id,clothing_categories(id,name)))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ outfits: data || [], user });
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const user = await getSelectedAdminUser();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const itemIds = uniqueIds(body.item_ids);
  if (!name || !itemIds.length) return NextResponse.json({ error: 'Nome e peças obrigatórios.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: valid } = await admin.from('clothing_items').select('id').eq('user_id', user.id).in('id', itemIds);
  if (!valid || valid.length !== itemIds.length) return NextResponse.json({ error: 'Peças inválidas.' }, { status: 400 });
  const { data: outfit, error } = await admin.from('outfits').insert({
    user_id: user.id,
    name,
    occasion: String(body.occasion || '').trim() || null,
    notes: String(body.notes || '').trim() || null,
    is_favorite: Boolean(body.is_favorite),
    is_day_look: false,
  }).select('*').single();
  if (error || !outfit) return NextResponse.json({ error: error?.message || 'Não foi possível criar o look.' }, { status: 400 });
  const { error: itemError } = await admin.from('outfit_items').insert(itemIds.map((clothing_item_id) => ({ outfit_id: outfit.id, clothing_item_id })));
  if (itemError) {
    await admin.from('outfits').delete().eq('id', outfit.id).eq('user_id', user.id);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }
  return NextResponse.json({ outfit }, { status: 201 });
}
