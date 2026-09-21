import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptText, validatePassword } from '@/lib/security';

export async function POST(req: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!validatePassword(password)) return NextResponse.json({ error: 'Senha inválida.' }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from('private_credentials').upsert({ user_id: context.userId, encrypted_password: encryptText(password), updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'Não foi possível sincronizar a credencial recuperável.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
