import { NextResponse } from 'next/server';
import { adminTargetCookieName, getAdminUsers, getSelectedAdminUser, isUuid, requireAdminSession } from '@/lib/admin';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  return NextResponse.json({ user: await getSelectedAdminUser() });
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body.userId)) return NextResponse.json({ error: 'Usuária inválida.' }, { status: 400 });
  const users = await getAdminUsers();
  const user = users.find((candidate) => candidate.id === body.userId);
  if (!user) return NextResponse.json({ error: 'Usuária não encontrada.' }, { status: 404 });

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(adminTargetCookieName(), user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
