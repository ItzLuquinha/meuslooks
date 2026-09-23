"use client";

import dynamic from 'next/dynamic';

const AdminPreview = dynamic(() => import('./AdminPreviewView'), { ssr: false });

export default function AdminPreviewDocument({ page }: { page: string }) {
  return <AdminPreview page={page} />;
}
