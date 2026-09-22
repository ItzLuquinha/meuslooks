import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: current } = await admin.from('clothing_items').select('*').eq('id', id).eq('user_id', context.userId).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Peça não encontrada.' }, { status: 404 });

  const changes: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
    changes.name = name;
  }
  for (const field of ['subcategory', 'color', 'size', 'brand', 'occasion', 'season', 'notes']) {
    if (body[field] !== undefined) changes[field] = String(body[field] || '').trim() || null;
  }
  if (body.is_favorite !== undefined) changes.is_favorite = Boolean(body.is_favorite);
  if (body.toggleFavorite === true) changes.is_favorite = !current.is_favorite;
  if (body.category_id !== undefined) {
    const categoryId = body.category_id ? String(body.category_id) : null;
    if (categoryId) {
      const { data: category } = await admin.from('clothing_categories').select('id').eq('id', categoryId).eq('is_active', true).or(`user_id.is.null,user_id.eq.${context.userId}`).maybeSingle();
      if (!category) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
    }
    changes.category_id = categoryId;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ item: current });
  const { data: item, error } = await admin.from('clothing_items').update(changes).eq('id', id).eq('user_id', context.userId).select('*,clothing_categories(id,name,is_active)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: item } = await admin.from('clothing_items').select('image_path').eq('id', id).eq('user_id', context.userId).maybeSingle();
  if (!item) return NextResponse.json({ error: 'Peça não encontrada.' }, { status: 404 });
  const { error } = await admin.from('clothing_items').delete().eq('id', id).eq('user_id', context.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (item.image_path) await admin.storage.from('clothing').remove([item.image_path]);
  return NextResponse.json({ ok: true });
}
