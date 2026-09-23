import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('id,name,email,created_at').eq('id', context.userId).single();
  if (error) return NextResponse.json({ error: 'Não foi possível carregar seu perfil.' }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.name !== 'string' || body.name.trim().length < 1) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
  const name = body.name.trim().slice(0, 80);
  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ name }).eq('id', context.userId);
  if (error) return NextResponse.json({ error: 'Não foi possível salvar seu nome.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
