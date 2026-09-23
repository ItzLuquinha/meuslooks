import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import AppNav from '@/components/layout/AppNav';
import PageTransition from '@/components/layout/PageTransition';

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <div className="app-shell"><AppNav /><main className="content-area"><PageTransition>{children}</PageTransition></main></div>;
}
