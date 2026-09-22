import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptText, validatePassword } from '@/lib/security';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; password?: unknown } | null;
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json({ error: 'A senha precisa ter entre 8 e 128 caracteres.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'user' },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Não foi possível criar sua conta.' }, { status: 400 });
  }

  const userId = data.user.id;
  const encryptedPassword = encryptText(password);
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    name,
    email,
    role: 'user',
    is_blocked: false,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Não foi possível criar o perfil da conta.' }, { status: 500 });
  }

  const { error: credentialError } = await admin.from('private_credentials').insert({
    user_id: userId,
    encrypted_password: encryptedPassword,
  });

  if (credentialError) {
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Não foi possível preparar a segurança da conta.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
