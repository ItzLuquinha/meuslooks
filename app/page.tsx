import { redirect } from 'next/navigation';
import { getCurrentContext } from '@/lib/auth';

export default async function Page() {
  const ctx = await getCurrentContext();
  if (ctx.kind === 'admin') redirect('/admin');
  if (ctx.kind === 'user') redirect('/inicio');
  redirect('/login');
}
