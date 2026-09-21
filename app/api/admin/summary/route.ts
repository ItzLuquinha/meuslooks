import { NextResponse } from 'next/server';
import { getAdminUsers, getSelectedAdminUser, requireAdminSession } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  const [user, users] = await Promise.all([getSelectedAdminUser(), getAdminUsers()]);
  if (!user) return NextResponse.json({ user: null, users, counts: { clothing: 0, outfits: 0 } });
  const admin = createAdminClient();
  const [{ count: clothing }, { count: outfits }] = await Promise.all([
    admin.from('clothing_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    admin.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);
  return NextResponse.json({ user, users, counts: { clothing: clothing || 0, outfits: outfits || 0 } });
}
