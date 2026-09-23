"use client";
import Link from 'next/link';
import { FolderHeart, MessageCircle, Shirt, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type AdminUser = { id: string; name: string; email: string; is_blocked: boolean };
type DashboardData = { user: AdminUser | null; users?: AdminUser[]; counts?: { clothing: number; outfits: number }; error?: string };

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/admin/summary', { cache: 'no-store' });
        const body = await response.json().catch((): DashboardData => ({} as DashboardData));
        if (!response.ok) throw new Error(body.error || 'Não foi possível carregar o painel.');
        if (active) setData(body);
      } catch (error) {
        if (active) showToast(error instanceof Error ? error.message : 'Não foi possível carregar o painel.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [showToast]);

  const selected = data?.user;
  return <><h1 className="page-title">Visão geral</h1><p className="page-subtitle">Controle do aplicativo e da conta selecionada.</p>{loading ? <div className="empty section">Carregando painel…</div> : !selected ? <div className="card empty admin-select-empty"><UserRound className="empty-icon"/><h3 className="empty-title">Selecione uma usuária</h3><p className="empty-copy">Use o seletor acima para escolher qual conta será administrada.</p><Link className="btn btn-soft" href="/admin/usuaria">Abrir administração da usuária</Link></div> : <div className="admin-grid section"><div className="card stat-card"><div className="stat-label">Nome</div><div className="stat-value">{selected.name}</div></div><div className="card stat-card"><div className="stat-label">Roupas</div><div className="stat-value">{data?.counts?.clothing ?? 0}</div></div><div className="card stat-card"><div className="stat-label">Looks</div><div className="stat-value">{data?.counts?.outfits ?? 0}</div></div><div className="card stat-card"><div className="stat-label">Conta</div><div className="stat-value" style={{ fontSize: 24 }}>{selected.is_blocked ? 'Bloqueada' : 'Ativa'}</div></div></div>}<section className="section"><div className="card form-card"><strong>Atalhos</strong><div className="inline-actions" style={{ marginTop: 14 }}><Link className="btn btn-soft" href="/admin/usuaria"><UserRound size={16}/>Administrar conta</Link><Link className="btn btn-ghost" href="/admin/guarda-roupa"><Shirt size={16}/>Administrar roupas</Link><Link className="btn btn-ghost" href="/admin/looks"><FolderHeart size={16}/>Administrar looks</Link><Link className="btn btn-ghost" href="/admin/mensagens"><MessageCircle size={16}/>Mensagem inicial</Link></div></div></section></>;
}
