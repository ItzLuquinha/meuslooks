import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { readAdminSession } from '@/lib/security';

const TARGET_COOKIE = 'meu_look_admin_target';

type AdminTarget = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_blocked: boolean;
  created_at: string;
};

export async function requireAdminSession() {
  const token = (await cookies()).get('meu_look_admin')?.value;
  const session = readAdminSession(token);
  if (!session) return null;
  return session;
}

export async function getAdminUsers(): Promise<AdminTarget[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id,name,email,role,is_blocked,created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: true });
  return (data || []) as AdminTarget[];
}

export async function getSelectedAdminUser(): Promise<AdminTarget | null> {
  const session = await requireAdminSession();
  if (!session) return null;
  const targetId = (await cookies()).get(TARGET_COOKIE)?.value;
  if (!targetId) return null;
  const users = await getAdminUsers();
  return users.find((user) => user.id === targetId) || null;
}

export function adminTargetCookieName() {
  return TARGET_COOKIE;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
