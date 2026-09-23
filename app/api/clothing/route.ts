import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type UsageRow = { clothing_item_id: string; worn_on: string };
type ClothingRow = { id: string; [key: string]: unknown };

async function currentUser() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return null;
  return context;
}

async function validateCategory(categoryId: string | null, userId: string) {
  if (!categoryId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('clothing_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('is_active', true)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

export async function GET() {
  const context = await currentUser();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const admin = createAdminClient();
  const [{ data: items, error: itemsError }, { data: categories, error: categoriesError }, { data: usage, error: usageError }] = await Promise.all([
    admin.from('clothing_items').select('*,clothing_categories(id,name,is_active)').eq('user_id', context.userId).order('created_at', { ascending: false }),
    admin.from('clothing_categories').select('id,name,is_active,user_id').or(`user_id.is.null,user_id.eq.${context.userId}`).eq('is_active', true).order('name'),
    admin.from('wardrobe_usage').select('clothing_item_id,worn_on').eq('user_id', context.userId).order('worn_on', { ascending: false }),
  ]);
  if (itemsError || categoriesError || usageError) return NextResponse.json({ error: 'Não foi possível carregar o guarda-roupa. Verifique se a migration de histórico do calendário foi aplicada no Supabase.' }, { status: 500 });

  const usageMap = new Map<string, { count: number; last_used: string | null }>();
  for (const row of (usage || []) as UsageRow[]) {
    const current = usageMap.get(row.clothing_item_id) || { count: 0, last_used: null };
    current.count += 1;
    if (!current.last_used) current.last_used = row.worn_on;
    usageMap.set(row.clothing_item_id, current);
  }

  const enriched = (items || []).map((item: ClothingRow) => ({
    ...item,
    usage_count: usageMap.get(item.id)?.count || 0,
    last_used: usageMap.get(item.id)?.last_used || null,
  }));
  return NextResponse.json({ items: enriched, categories: categories || [] });
}

export async function POST(req: Request) {
  const context = await currentUser();
  if (!context) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('image');
  const name = String(form.get('name') || '').trim();
  if (!(file instanceof File) || !name) return NextResponse.json({ error: 'Foto e nome são obrigatórios.' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024 || !ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Imagem inválida. Use JPG, PNG ou WEBP de até 8 MB.' }, { status: 400 });

  const categoryId = String(form.get('category_id') || '').trim() || null;
  if (categoryId && !(await validateCategory(categoryId, context.userId))) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });

  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `${context.userId}/${id}.${ext}`;
  const { error: uploadError } = await admin.storage.from('clothing').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: 'Não foi possível guardar a imagem.' }, { status: 400 });

  const { data: item, error } = await admin.from('clothing_items').insert({
    id,
    user_id: context.userId,
    name,
    category_id: categoryId,
    subcategory: String(form.get('subcategory') || '').trim() || null,
    color: String(form.get('color') || '').trim() || null,
    size: String(form.get('size') || '').trim() || null,
    brand: String(form.get('brand') || '').trim() || null,
    occasion: String(form.get('occasion') || '').trim() || null,
    season: String(form.get('season') || '').trim() || null,
    notes: String(form.get('notes') || '').trim() || null,
    image_path: path,
    is_favorite: ['on', 'true', '1'].includes(String(form.get('is_favorite') ?? form.get('favorite') ?? '').toLowerCase()),
  }).select('*,clothing_categories(id,name,is_active)').single();

  if (error) {
    await admin.storage.from('clothing').remove([path]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ item }, { status: 201 });
}
