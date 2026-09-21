import { NextResponse } from 'next/server';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function guard() {
  if (!(await requireAdminSession())) return null;
  return await getSelectedAdminUser();
}

export async function GET() {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const admin = createAdminClient();
  const [{ data: items }, { data: categories }] = await Promise.all([
    admin.from('clothing_items').select('*,clothing_categories(id,name,is_active)').eq('user_id', user.id).order('created_at', { ascending: false }),
    admin.from('clothing_categories').select('id,name,user_id,is_active').or(`user_id.is.null,user_id.eq.${user.id}`).eq('is_active', true).order('name'),
  ]);
  return NextResponse.json({ user, items: items || [], categories: categories || [] });
}

export async function POST(req: Request) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const form = await req.formData();
  const name = String(form.get('name') || '').trim();
  if (!name) return NextResponse.json({ error: 'Nome obrigatório.' }, { status: 400 });
  const file = form.get('image');
  if (file && (!(file instanceof File) || file.size > 8 * 1024 * 1024 || !allowedTypes.has(file.type))) return NextResponse.json({ error: 'Imagem inválida. Use JPG, PNG ou WEBP de até 8 MB.' }, { status: 400 });
  const admin = createAdminClient();
  let categoryId: string | null = null;
  const requestedCategoryId = String(form.get('category_id') || '').trim();
  const category = String(form.get('category') || '').trim();
  if (requestedCategoryId) {
    const { data: cat } = await admin.from('clothing_categories').select('id').eq('id', requestedCategoryId).eq('is_active', true).or(`user_id.is.null,user_id.eq.${user.id}`).maybeSingle();
    if (!cat) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
    categoryId = cat.id;
  } else if (category) {
    const { data: cat } = await admin.from('clothing_categories').select('id').eq('name', category).eq('is_active', true).or(`user_id.is.null,user_id.eq.${user.id}`).limit(1).maybeSingle();
    categoryId = cat?.id || null;
  }
  let imagePath: string | null = null;
  if (file instanceof File && file.size) {
    const id = crypto.randomUUID();
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
    imagePath = `${user.id}/${id}.${ext}`;
    const { error } = await admin.storage.from('clothing').upload(imagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: 'Não foi possível guardar a imagem.' }, { status: 400 });
  }
  const payload = {
    user_id: user.id, name, category_id: categoryId,
    subcategory: String(form.get('subcategory') || '') || null,
    color: String(form.get('color') || '') || null,
    size: String(form.get('size') || '') || null,
    brand: String(form.get('brand') || '') || null,
    occasion: String(form.get('occasion') || '') || null,
    season: String(form.get('season') || '') || null,
    notes: String(form.get('notes') || '') || null,
    image_path: imagePath,
    is_favorite: form.get('favorite') === 'true',
  };
  const { data: item, error } = await admin.from('clothing_items').insert(payload).select('*,clothing_categories(id,name,is_active)').single();
  if (error) {
    if (imagePath) await admin.storage.from('clothing').remove([imagePath]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ item });
}
