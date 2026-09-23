import { NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/security';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

async function guard() {
  return readAdminSession((await cookies()).get('meu_look_admin')?.value);
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const admin = createAdminClient();
  const { data: message, error } = await admin.from('admin_messages').select('id,title,body,active,created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: 'Não foi possível carregar a mensagem.' }, { status: 500 });
  return NextResponse.json({ message });
}

export async function POST(request: Request) {
  if (!await guard()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim().slice(0, 100);
  const messageBody = String(body.body || '').trim().slice(0, 1000);
  const active = Boolean(body.active);
  if (!title || !messageBody) return NextResponse.json({ error: 'Título e mensagem são obrigatórios.' }, { status: 400 });

  const admin = createAdminClient();
  if (active) {
    const { error } = await admin.from('admin_messages').update({ active: false }).eq('active', true);
    if (error) return NextResponse.json({ error: 'Não foi possível atualizar a mensagem ativa.' }, { status: 500 });
  }
  const { data: current, error: currentError } = await admin.from('admin_messages').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (currentError) return NextResponse.json({ error: 'Não foi possível localizar a mensagem.' }, { status: 500 });
  const payload = { title, body: messageBody, active };
  const result = current?.id ? await admin.from('admin_messages').update(payload).eq('id', current.id) : await admin.from('admin_messages').insert(payload);
  if (result.error) return NextResponse.json({ error: 'Não foi possível salvar a mensagem.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!await guard()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const admin = createAdminClient();
  const { error } = await admin.from('admin_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return NextResponse.json({ error: 'Não foi possível remover a mensagem.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
