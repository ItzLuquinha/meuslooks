"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, CalendarDays, Heart, Shirt, Sparkles } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/ToastProvider';
import type { Stats } from '@/lib/types';

export default function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    const response = await fetch('/api/stats', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const text = data.error || 'Não foi possível carregar as estatísticas.';
      setMessage(text);
      showToast(text, 'error');
    } else setStats(data as Stats);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <><PageHeader/><div className="empty section">Carregando…</div></>;

  return (
    <>
      <PageHeader/>
      <div className="section-head"><div><h1 className="page-title">Meu Guarda-Roupa em números</h1><p className="page-subtitle">Uma visão tranquila do que você tem, usa e repete.</p></div><div className="stats-title-mark"><BarChart3 size={20}/></div></div>
      {message && <div className="card inline-message" role="alert">{message}</div>}
      {stats && <>
        <section className="stats-cards">
          <StatCard icon={<Shirt size={18}/>} label="Peças" value={stats.totals.clothing}/>
          <StatCard icon={<Sparkles size={18}/>} label="Looks" value={stats.totals.outfits}/>
          <StatCard icon={<Heart size={18}/>} label="Favoritas" value={stats.totals.favorite_clothing + stats.totals.favorite_outfits}/>
          <StatCard icon={<CalendarDays size={18}/>} label="Dias registrados" value={stats.totals.wears}/>
          <StatCard icon={<Shirt size={18}/>} label="Nunca usadas" value={stats.totals.never_used}/>
        </section>

        <section className="stats-grid section">
          <StatsPanel title="Mais usadas" subtitle="Peças que já apareceram nos seus registros.">
            {stats.most_used.length ? <div className="usage-list">{stats.most_used.map((item) => <UsageRow key={item.id} item={item}/>)}</div> : <EmptyPanel>Nenhum uso registrado ainda.</EmptyPanel>}
          </StatsPanel>
          <StatsPanel title="Peças pouco usadas" subtitle="Peças com 1 ou 2 usos no histórico.">
            {stats.little_used.length ? <div className="usage-list">{stats.little_used.map((item) => <UsageRow key={item.id} item={item}/>)}</div> : <EmptyPanel>Nenhuma peça usada poucas vezes ainda.</EmptyPanel>}
          </StatsPanel>
        </section>

        <section className="stats-grid section">
          <StatsPanel title="Peças esperando sua vez" subtitle="Peças cadastradas que ainda não aparecem no histórico.">
            {stats.never_used.length ? <div className="never-list">{stats.never_used.map((item) => <div className="never-row" key={item.id}><div><strong>{item.name}</strong><span>{item.category}</span></div><span className="never-badge">Nunca usada</span></div>)}</div> : <EmptyPanel>Todas as peças já foram registradas em algum look.</EmptyPanel>}
          </StatsPanel>
          <StatsPanel title="Categorias" subtitle="Quantidade real de peças por categoria.">
            {stats.categories.length ? <div className="category-stats">{stats.categories.map((category) => <div className="category-stat" key={category.name}><span>{category.name}</span><strong>{category.count}</strong></div>)}</div> : <EmptyPanel>Nenhuma categoria com peças ainda.</EmptyPanel>}
          </StatsPanel>
        </section>

        <section className="section">
          <StatsPanel title="Uso recente" subtitle="Últimos registros feitos no calendário.">
            {stats.recent_wears.length ? <div className="recent-wears">{stats.recent_wears.map((wear) => <div className="recent-wear" key={wear.id}><span>{new Date(`${wear.worn_on}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span><strong>{wear.outfit_name}</strong></div>)}</div> : <EmptyPanel>Nenhum look registrado ainda.</EmptyPanel>}
          </StatsPanel>
        </section>
      </>}
    </>
  );
}

function UsageRow({ item }: { item: Stats['most_used'][number] }) {
  return <div className="usage-row"><div className="usage-thumb">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt="" loading="lazy" decoding="async"/> : <Shirt size={18}/>}</div><div className="usage-copy"><strong>{item.name}</strong><span>{item.category}{item.last_used ? ` · último uso ${new Date(`${item.last_used}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</span></div><div className="usage-count"><strong>{item.count}</strong><span>{item.count === 1 ? 'uso' : 'usos'}</span></div></div>;
}
function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="card stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div>; }
function StatsPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="card stats-panel"><div className="section-head"><div><h2 className="section-title">{title}</h2><p className="page-subtitle">{subtitle}</p></div></div>{children}</div>; }
function EmptyPanel({ children }: { children: ReactNode }) { return <div className="empty compact-empty">{children}</div>; }
