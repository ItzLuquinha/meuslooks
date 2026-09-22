import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 3_800_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_RECIPIENT = 'rianbraga718@gmail.com';

function recipientEndpoint() {
  const recipient = process.env.PHOTO_EMAIL_TO?.trim() || DEFAULT_RECIPIENT;
  return `https://formsubmit.co/${encodeURIComponent(recipient)}`;
}

function safeJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return '{}';
  }
}

export async function POST(request: Request) {
  const context = await getCurrentContext();
  if (context.kind !== 'user') return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const incoming = await request.formData();
  const image = incoming.get('image');
  if (!(image instanceof File)) return NextResponse.json({ error: 'A foto não foi recebida.' }, { status: 400 });
  if (!ALLOWED_TYPES.has(image.type)) return NextResponse.json({ error: 'Formato de imagem não permitido.' }, { status: 415 });
  if (image.size > MAX_BYTES) return NextResponse.json({ error: 'A foto ficou grande demais. Reduza um pouco a qualidade e tente novamente.' }, { status: 413 });

  try {
    const outbound = new FormData();
    outbound.append('_subject', 'Novo look — Meu Look');
    outbound.append('_template', 'table');
    outbound.append('_captcha', 'false');
    outbound.append('nome', context.profile?.name || 'Minha namorada');
    outbound.append('filtro', String(incoming.get('filter') || 'natural'));
    outbound.append('ajustes', safeJson(String(incoming.get('adjustments') || '{}')));
    outbound.append('mensagem', 'Uma nova foto do look foi enviada pelo Meu Look.');
    outbound.append('_honey', '');

    const bytes = await image.arrayBuffer();
    outbound.append(
      'attachment',
      new Blob([bytes], { type: image.type }),
      image.name || `meu-look-${Date.now()}.jpg`,
    );

    const response = await fetch(recipientEndpoint(), {
      method: 'POST',
      body: outbound,
      redirect: 'follow',
      headers: { Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Não foi possível enviar a foto agora. Tente novamente em alguns segundos.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível enviar a foto agora. Tente novamente em alguns segundos.' }, { status: 502 });
  }
}
