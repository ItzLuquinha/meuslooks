import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSelectedAdminUser } from '@/lib/admin';

export async function GET(req: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' && context.kind !== 'admin') return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const path = new URL(req.url).searchParams.get('path');
  if (!path || path.includes('..')) return NextResponse.json({ error: 'Caminho inválido.' }, { status: 400 });
  if (context.kind === 'user' && !path.startsWith(`${context.userId}/`)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  if (context.kind === 'admin') {
    const target = await getSelectedAdminUser();
    if (!target) return NextResponse.json({ error: 'Selecione uma usuária.' }, { status: 400 });
    if (!path.startsWith(`${target.id}/`)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('clothing').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Imagem indisponível.' }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
