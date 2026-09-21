import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptText, encryptText, validatePassword } from '@/lib/security';

export async function PATCH(req: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId || !context.email) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.current || '');
  const nextPassword = String(body.next || '');
  if (!currentPassword || !validatePassword(nextPassword)) return NextResponse.json({ error: 'Informe uma senha válida.' }, { status: 400 });

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: context.email, password: currentPassword });
  if (verifyError) return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: stored } = await admin.from('private_credentials').select('encrypted_password').eq('user_id', context.userId).maybeSingle();
  const previousPassword = stored?.encrypted_password ? decryptText(stored.encrypted_password) : null;
  const { error: authError } = await supabase.auth.updateUser({ password: nextPassword });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error: credentialError } = await admin.from('private_credentials').upsert({
    user_id: context.userId,
    encrypted_password: encryptText(nextPassword),
    updated_at: new Date().toISOString(),
  });
  if (credentialError) {
    if (previousPassword) await admin.auth.admin.updateUserById(context.userId, { password: previousPassword });
    return NextResponse.json({ error: 'Não foi possível concluir a alteração da senha. A senha anterior foi preservada.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
