import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';

const MAX_SIZE = 3_800_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user' || !context.userId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const recipient = process.env.PHOTO_EMAIL_TO?.trim();
  if (!recipient) return NextResponse.json({ error: 'O envio de fotos ainda não foi configurado no servidor.' }, { status: 503 });

  const form = await request.formData();
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
    const response = await fetch(`https://formsubmit.co/${encodeURIComponent(recipient)}`, {
      method: 'POST',
      body: forward,
    });
    if (!response.ok) return NextResponse.json({ error: 'O serviço de e-mail recusou o envio.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível enviar a foto agora. Tente novamente.' }, { status: 502 });
  }
}
