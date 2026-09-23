import { requireAdmin } from '@/lib/auth';
import AdminPreviewDocument from '@/components/admin/AdminPreviewDocument';

type Props = { searchParams: Promise<{ page?: string }> };

export default async function Page({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = typeof params.page === 'string' ? params.page : '/inicio';
  return <AdminPreviewDocument page={page} />;
}
