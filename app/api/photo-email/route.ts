import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_SIZE = 3_800_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let recipient = (process.env.PHOTO_EMAIL_TO || process.env.ADMIN_EMAIL || '').trim();
  if (!recipient) {
    const admin = createAdminClient();
    const { data: adminProfile } = await admin
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
      .eq('is_blocked', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    recipient = String(adminProfile?.email || '').trim();
  }
  if (!/^\S+@\S+\.\S+$/.test(recipient)) return NextResponse.json({ error: 'Não foi possível definir o destinatário do envio. Configure PHOTO_EMAIL_TO/ADMIN_EMAIL ou mantenha um perfil admin válido no Supabase.' }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler a foto enviada.' }, { status: 400 });
  }
  const photo = form.get('photo');
  if (!(photo instanceof File)) return NextResponse.json({ error: 'Nenhuma foto foi recebida.' }, { status: 400 });
  if (photo.size > MAX_SIZE) return NextResponse.json({ error: 'A foto final ficou grande demais para envio.' }, { status: 413 });
  if (!ALLOWED_TYPES.has(photo.type)) return NextResponse.json({ error: 'Formato de foto não suportado.' }, { status: 400 });

  const forward = new FormData();
  forward.append('_subject', `Novo look — Meu Look${String(form.get('name') || '').trim() ? ` · ${String(form.get('name')).trim()}` : ''}`);
  forward.append('_template', 'table');
  forward.append('_captcha', 'false');
  forward.append('_honey', '');
  forward.append('filtro', String(form.get('filter') || 'natural'));
  forward.append('ajustes', String(form.get('adjustments') || '{}'));
  forward.append('usuario_id', context.userId);
  forward.append('photo', photo, photo.name || 'meu-look.jpg');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`https://formsubmit.co/${encodeURIComponent(recipient)}`, {
      method: 'POST',
      body: forward,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return NextResponse.json({ error: 'O serviço de e-mail recusou o envio.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'O envio demorou demais para responder. Tente novamente.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Não foi possível enviar a foto agora. Tente novamente.' }, { status: 502 });
  }
}
