import { NextResponse } from 'next/server';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

async function guard() {
  const session = await requireAdminSession();
  if (!session) return null;
  return await getSelectedAdminUser();
}

function cleanName(value: unknown) {
  return String(value || '').trim().slice(0, 40);
}

export async function GET() {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('clothing_categories')
    .select('id,name,user_id,created_at,is_active')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('user_id', { ascending: true })
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ categories: data || [] });
}

export async function POST(req: Request) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (name.length < 2) return NextResponse.json({ error: 'Informe um nome válido.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: duplicate } = await admin.from('clothing_categories').select('id').eq('is_active', true).or(`user_id.is.null,user_id.eq.${user.id}`).ilike('name', name).limit(1).maybeSingle();
  if (duplicate) return NextResponse.json({ error: 'Essa categoria já existe.' }, { status: 409 });
  const { data, error } = await admin.from('clothing_categories').insert({ user_id: user.id, name, is_active: true }).select('id,name,user_id,created_at,is_active').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function PATCH(req: Request) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
  const admin = createAdminClient();
  const changes: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = cleanName(body.name);
    if (name.length < 2) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
    const { data: duplicate } = await admin.from('clothing_categories').select('id').neq('id', id).eq('is_active', true).or(`user_id.is.null,user_id.eq.${user.id}`).ilike('name', name).limit(1).maybeSingle();
    if (duplicate) return NextResponse.json({ error: 'Essa categoria já existe.' }, { status: 409 });
    changes.name = name;
  }
  if (body.is_active !== undefined) changes.is_active = Boolean(body.is_active);
  const { data: category } = await admin.from('clothing_categories').select('id,user_id').eq('id', id).maybeSingle();
  if (!category || category.user_id !== user.id) return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  const { error } = await admin.from('clothing_categories').update(changes).eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: category } = await admin.from('clothing_categories').select('id,user_id').eq('id', id).maybeSingle();
  if (!category || category.user_id !== user.id) return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  const { count } = await admin.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('category_id', id);
  if ((count || 0) > 0) return NextResponse.json({ error: 'Essa categoria está em uso por peças existentes. Desative-a em vez de apagar.' }, { status: 409 });
  const { error } = await admin.from('clothing_categories').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
