import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
type CalendarItem = { clothing_item_id: string };

type CalendarOutfit = {
  id: string;
  name: string;
  occasion: string | null;
  outfit_items: CalendarItem[] | null;
};

async function userContext() {
  const context = await getCurrentContext();
  return context.kind === 'user' && context.userId ? context : null;
}

async function hydrateUsage(admin: ReturnType<typeof createAdminClient>, userId: string, outfitId: string, wornOn: string) {
  const { data: outfit } = await admin.from('outfits').select('id,outfit_items(clothing_item_id)').eq('id', outfitId).eq('user_id', userId).maybeSingle();
  if (!outfit) return false;
  const rows = ((outfit.outfit_items || []) as CalendarItem[]).map((item) => ({ user_id: userId, clothing_item_id: item.clothing_item_id, outfit_id: outfitId, worn_on: wornOn }));
  if (!rows.length) return true;
  const { error } = await admin.from('wardrobe_usage').upsert(rows, { onConflict: 'user_id,clothing_item_id,outfit_id,worn_on', ignoreDuplicates: true });
  return !error;
}

export async function GET(request: Request) {
  const context = await userContext();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
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
  const context = await userContext();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const outfitId = String(body.outfit_id || '');
  const wornOn = String(body.worn_on || '');
  const note = String(body.note || '').trim().slice(0, 240) || null;
  if (!outfitId || !isValidDate(wornOn)) return NextResponse.json({ error: 'Escolha um look e uma data válida.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: outfit } = await admin.from('outfits').select('id,user_id,outfit_items(clothing_item_id)').eq('id', outfitId).eq('user_id', context.userId).maybeSingle();
  if (!outfit) return NextResponse.json({ error: 'Look não encontrado.' }, { status: 404 });
  const { data: existing } = await admin.from('outfit_wears').select('id').eq('user_id', context.userId).eq('worn_on', wornOn).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Já existe um look registrado nesse dia.' }, { status: 409 });
  const { data: entry, error } = await admin.from('outfit_wears').insert({ user_id: context.userId, outfit_id: outfitId, worn_on: wornOn, note }).select('id,outfit_id,worn_on,note').single();
  if (error || !entry) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Já existe um registro para esse dia.' }, { status: 409 });
    return NextResponse.json({ error: 'Não foi possível registrar o look.' }, { status: 500 });
  }
  if (!(await hydrateUsage(admin, context.userId, outfitId, wornOn))) {
    await admin.from('outfit_wears').delete().eq('id', entry.id).eq('user_id', context.userId);
    return NextResponse.json({ error: 'Não foi possível atualizar o histórico das peças.' }, { status: 500 });
  }
  return NextResponse.json({ entry });
}

export async function PATCH(request: Request) {
  const context = await userContext();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  const outfitId = String(body.outfit_id || '');
  const wornOn = String(body.worn_on || '');
  const note = String(body.note || '').trim().slice(0, 240) || null;
  if (!id || !outfitId || !isValidDate(wornOn)) return NextResponse.json({ error: 'Registro inválido.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: current } = await admin.from('outfit_wears').select('id,outfit_id,worn_on,note').eq('id', id).eq('user_id', context.userId).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
  const { data: outfit } = await admin.from('outfits').select('id,outfit_items(clothing_item_id)').eq('id', outfitId).eq('user_id', context.userId).maybeSingle();
  if (!outfit) return NextResponse.json({ error: 'Look não encontrado.' }, { status: 404 });
  const { data: conflict } = await admin.from('outfit_wears').select('id').eq('user_id', context.userId).eq('worn_on', wornOn).neq('id', id).maybeSingle();
  if (conflict) return NextResponse.json({ error: 'Já existe um look registrado nesse dia.' }, { status: 409 });

  const { error: updateError } = await admin.from('outfit_wears').update({ outfit_id: outfitId, worn_on: wornOn, note }).eq('id', id).eq('user_id', context.userId);
  if (updateError) return NextResponse.json({ error: 'Não foi possível atualizar o registro.' }, { status: 500 });
  const { error: oldUsageDeleteError } = await admin.from('wardrobe_usage').delete().eq('user_id', context.userId).eq('outfit_id', current.outfit_id).eq('worn_on', current.worn_on);
  if (oldUsageDeleteError) {
    await admin.from('outfit_wears').update({ outfit_id: current.outfit_id, worn_on: current.worn_on, note: current.note }).eq('id', id).eq('user_id', context.userId);
    return NextResponse.json({ error: 'Não foi possível atualizar o histórico das peças.' }, { status: 500 });
  }
  if (!(await hydrateUsage(admin, context.userId, outfitId, wornOn))) {
    await admin.from('outfit_wears').update({ outfit_id: current.outfit_id, worn_on: current.worn_on, note: current.note }).eq('id', id).eq('user_id', context.userId);
    await hydrateUsage(admin, context.userId, current.outfit_id, current.worn_on);
    return NextResponse.json({ error: 'Não foi possível atualizar o histórico das peças.' }, { status: 500 });
  }
  return NextResponse.json({ entry: { ...current, outfit_id: outfitId, worn_on: wornOn, note } });
}

export async function DELETE(request: Request) {
  const context = await userContext();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Registro inválido.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: entry } = await admin.from('outfit_wears').select('id,outfit_id,worn_on').eq('id', id).eq('user_id', context.userId).maybeSingle();
  if (!entry) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
  const { error: usageDeleteError } = await admin.from('wardrobe_usage').delete().eq('user_id', context.userId).eq('outfit_id', entry.outfit_id).eq('worn_on', entry.worn_on);
  if (usageDeleteError) return NextResponse.json({ error: 'Não foi possível remover o histórico das peças.' }, { status: 500 });
  const { error } = await admin.from('outfit_wears').delete().eq('id', id).eq('user_id', context.userId);
  if (error) return NextResponse.json({ error: 'Não foi possível remover o registro.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
