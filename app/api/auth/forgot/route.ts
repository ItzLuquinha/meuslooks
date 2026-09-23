import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/redefinir`,
  });
  if (error) return NextResponse.json({ error: 'Não foi possível iniciar a recuperação de senha agora.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
