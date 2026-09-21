import { NextResponse } from 'next/server';
import { getAdminUsers, requireAdminSession, getSelectedAdminUser } from '@/lib/admin';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const [users, selected] = await Promise.all([getAdminUsers(), getSelectedAdminUser()]);
  return NextResponse.json({ users, selected: selected?.id || null });
}
