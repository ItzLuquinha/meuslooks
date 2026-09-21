import { NextResponse } from 'next/server';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

async function guard() {
  if (!(await requireAdminSession())) return null;
  return await getSelectedAdminUser();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: current } = await admin.from('clothing_items').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Peça não encontrada.' }, { status: 404 });

  const changes: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
    changes.name = name;
  }
  for (const key of ['subcategory', 'color', 'size', 'brand', 'occasion', 'season', 'notes']) {
    if (body[key] !== undefined) changes[key] = String(body[key] || '').trim() || null;
  }
  if (body.is_favorite !== undefined) changes.is_favorite = Boolean(body.is_favorite);
  if (body.category_id !== undefined) {
    const categoryId = body.category_id ? String(body.category_id) : null;
    if (categoryId) {
      const { data: category } = await admin.from('clothing_categories').select('id').eq('id', categoryId).eq('is_active', true).or(`user_id.is.null,user_id.eq.${user.id}`).maybeSingle();
      if (!category) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
    }
    changes.category_id = categoryId;
  }
  const { data: item, error } = await admin.from('clothing_items').update(changes).eq('id', id).eq('user_id', user.id).select('*,clothing_categories(id,name,is_active)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: item } = await admin.from('clothing_items').select('image_path').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!item) return NextResponse.json({ error: 'Peça não encontrada.' }, { status: 404 });
  if (item.image_path) await admin.storage.from('clothing').remove([item.image_path]);
  const { error } = await admin.from('clothing_items').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
