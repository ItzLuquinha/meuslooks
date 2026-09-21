import { NextResponse } from 'next/server';
import { decryptText, encryptText, validatePassword } from '@/lib/security';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const user = await getSelectedAdminUser();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!validatePassword(password)) return NextResponse.json({ error: 'Senha inválida.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: stored } = await admin.from('private_credentials').select('encrypted_password').eq('user_id', user.id).maybeSingle();
  const previousPassword = stored?.encrypted_password ? decryptText(stored.encrypted_password) : null;
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: credentialError } = await admin.from('private_credentials').upsert({ user_id: user.id, encrypted_password: encryptText(password), updated_at: new Date().toISOString() });
  if (credentialError) {
    if (previousPassword) await admin.auth.admin.updateUserById(user.id, { password: previousPassword });
    return NextResponse.json({ error: 'Não foi possível concluir a redefinição. A senha anterior foi preservada.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
