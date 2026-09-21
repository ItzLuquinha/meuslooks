import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSelectedAdminUser, requireAdminSession, adminTargetCookieName } from '@/lib/admin';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  return NextResponse.json({ user: await getSelectedAdminUser() });
}

export async function PATCH(req: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const user = await getSelectedAdminUser();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const name = body.name === undefined ? user.name : String(body.name || '').trim();
  const email = body.email === undefined ? user.email : String(body.email || '').trim().toLowerCase();
  const isBlocked = body.is_blocked === undefined ? user.is_blocked : Boolean(body.is_blocked);
  if (!name) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });

  const admin = createAdminClient();
  if (email !== user.email) {
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  }
  const { error: profileError } = await admin.from('profiles').update({ name, email, is_blocked: isBlocked }).eq('id', user.id).eq('role', 'user');
  if (profileError) {
    if (email !== user.email) await admin.auth.admin.updateUserById(user.id, { email: user.email, email_confirm: true });
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, user: { ...user, name, email, is_blocked: isBlocked } });
}

export async function DELETE() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const user = await getSelectedAdminUser();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminTargetCookieName(), '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
