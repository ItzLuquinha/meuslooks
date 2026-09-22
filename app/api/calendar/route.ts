import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const month = new URL(request.url).searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'Mês inválido.' }, { status: 400 });
  const [year, monthNumber] = month.split('-').map(Number);
  const endDate = new Date(Date.UTC(year, monthNumber, 0));
  const start = `${month}-01`;
  const end = `${month}-${String(endDate.getUTCDate()).padStart(2, '0')}`;
  const admin = createAdminClient();
  const { data, error } = await admin.from('outfit_wears').select('id,outfit_id,worn_on,note,outfits(id,name,occasion,outfit_items(clothing_item_id,clothing_items(id,name,image_path)))').eq('user_id', context.userId).gte('worn_on', start).lte('worn_on', end).order('worn_on', { ascending: true });
  if (error) return NextResponse.json({ error: 'Não foi possível carregar o calendário.' }, { status: 500 });
  return NextResponse.json({ entries: data || [] });
}

export async function POST(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const outfitId = String(body.outfit_id || '');
  const wornOn = String(body.worn_on || '');
  const note = String(body.note || '').trim().slice(0, 240) || null;
  if (!outfitId || !datePattern.test(wornOn)) return NextResponse.json({ error: 'Escolha um look e uma data válida.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: outfit } = await admin.from('outfits').select('id,user_id,outfit_items(clothing_item_id)').eq('id', outfitId).eq('user_id', context.userId).maybeSingle();
  if (!outfit) return NextResponse.json({ error: 'Look não encontrado.' }, { status: 404 });
  const { data: existing } = await admin.from('outfit_wears').select('id').eq('user_id', context.userId).eq('worn_on', wornOn).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Já existe um look registrado nesse dia.' }, { status: 409 });
  const { data: entry, error } = await admin.from('outfit_wears').insert({ user_id: context.userId, outfit_id: outfitId, worn_on: wornOn, note }).select('id,outfit_id,worn_on,note').single();
  if (error || !entry) return NextResponse.json({ error: 'Não foi possível registrar o look.' }, { status: 500 });
  const itemRows = (outfit.outfit_items || []).map((item: { clothing_item_id: string }) => ({ user_id: context.userId, clothing_item_id: item.clothing_item_id, outfit_id: outfitId, worn_on: wornOn }));
  if (itemRows.length) {
    const { error: usageError } = await admin.from('wardrobe_usage').upsert(itemRows, { onConflict: 'user_id,clothing_item_id,outfit_id,worn_on', ignoreDuplicates: true });
    if (usageError) {
      await admin.from('outfit_wears').delete().eq('id', entry.id).eq('user_id', context.userId);
      return NextResponse.json({ error: 'Não foi possível atualizar o histórico das peças.' }, { status: 500 });
    }
  }
  return NextResponse.json({ entry });
}

export async function DELETE(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Registro inválido.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: entry } = await admin.from('outfit_wears').select('id,outfit_id,worn_on').eq('id', id).eq('user_id', context.userId).maybeSingle();
  if (!entry) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
  await admin.from('wardrobe_usage').delete().eq('user_id', context.userId).eq('outfit_id', entry.outfit_id).eq('worn_on', entry.worn_on);
  const { error } = await admin.from('outfit_wears').delete().eq('id', id).eq('user_id', context.userId);
  if (error) return NextResponse.json({ error: 'Não foi possível remover o registro.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
