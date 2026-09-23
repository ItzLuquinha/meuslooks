import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function cleanName(value: unknown) { return String(value || '').trim().slice(0, 40); }

export async function POST(req: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (name.length < 2) return NextResponse.json({ error: 'Informe um nome de categoria válido.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: duplicate } = await admin.from('clothing_categories').select('id').eq('is_active', true).or(`user_id.is.null,user_id.eq.${context.userId}`).ilike('name', name).limit(1).maybeSingle();
  if (duplicate) return NextResponse.json({ error: 'Essa categoria já existe.' }, { status: 409 });
  const { data, error } = await admin.from('clothing_categories').insert({ user_id: context.userId, name, is_active: true }).select('id,name,user_id,is_active').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data }, { status: 201 });
}
