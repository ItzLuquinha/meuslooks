import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import AppNav from '@/components/layout/AppNav';

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <div className="app-shell"><AppNav /><main className="content-area">{children}</main></div>;
}
