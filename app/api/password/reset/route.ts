import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptText, validatePassword } from '@/lib/security';

export async function POST(req: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!validatePassword(password)) {
    return NextResponse.json({ error: 'A senha precisa ter entre 8 e 128 caracteres.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: previous } = await admin
    .from('private_credentials')
    .select('encrypted_password')
    .eq('user_id', context.userId)
    .maybeSingle();

  const previousEncryptedPassword = previous?.encrypted_password || null;
  const { error: credentialError } = await admin.from('private_credentials').upsert({
    user_id: context.userId,
    encrypted_password: encryptText(password),
    updated_at: new Date().toISOString(),
  });
  if (credentialError) {
    return NextResponse.json({ error: 'Não foi possível preparar a nova senha.' }, { status: 500 });
  }

  const { error: authError } = await admin.auth.admin.updateUserById(context.userId, { password });
  if (authError) {
    if (previousEncryptedPassword) {
      await admin.from('private_credentials').update({
        encrypted_password: previousEncryptedPassword,
        updated_at: new Date().toISOString(),
      }).eq('user_id', context.userId);
    } else {
      await admin.from('private_credentials').delete().eq('user_id', context.userId);
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
