import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import AdminTargetSelector from '@/components/admin/AdminTargetSelector';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <div className="admin-shell"><AdminNav /><main className="admin-content"><AdminTargetSelector />{children}</main></div>;
}
