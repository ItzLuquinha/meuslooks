import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readAdminSession } from '@/lib/security';
import { createClient } from '@/lib/supabase/server';

export async function getCurrentContext() {
  const adminToken = (await cookies()).get('meu_look_admin')?.value;
  const admin = readAdminSession(adminToken);
  if (admin) return { kind: 'admin' as const, email: admin.email, userId: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: 'guest' as const, email: null, userId: null };
  const { data: profile } = await supabase.from('profiles').select('id,name,email,role,is_blocked').eq('id', user.id).maybeSingle();
  if (profile?.is_blocked) return { kind: 'blocked' as const, email: user.email ?? null, userId: user.id };
  return { kind: 'user' as const, email: user.email ?? null, userId: user.id, profile };
}

export async function requireUser() {
  const ctx = await getCurrentContext();
  if (ctx.kind !== 'user' || !ctx.userId) redirect('/login');
  return ctx;
}

export async function requireAdmin() {
  const ctx = await getCurrentContext();
  if (ctx.kind !== 'admin') redirect('/login');
  return ctx;
}

