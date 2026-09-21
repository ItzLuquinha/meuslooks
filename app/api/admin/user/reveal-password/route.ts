import { NextResponse } from 'next/server';
import { decryptText } from '@/lib/security';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSelectedAdminUser, requireAdminSession } from '@/lib/admin';

export async function POST() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const user = await getSelectedAdminUser();
  if (!user) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
  const admin = createAdminClient();
  const { data: cred } = await admin.from('private_credentials').select('encrypted_password').eq('user_id', user.id).single();
  if (!cred) return NextResponse.json({ error: 'Senha recuperável não cadastrada.' }, { status: 404 });
  try {
    return NextResponse.json({ password: decryptText(cred.encrypted_password) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível recuperar a senha armazenada.' }, { status: 500 });
  }
}
