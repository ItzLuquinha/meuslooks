"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Heart, Plus, Shirt } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import type { HomeData, Outfit } from '@/lib/types';

function imageUrl(path: string | null | undefined) { return path ? `/api/media?path=${encodeURIComponent(path)}` : undefined; }
function firstName(value: string | undefined) { return value?.trim().split(/\s+/)[0] || 'você'; }

export default function HomeClient() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/home', { cache: 'no-store' }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Não foi possível carregar a home.');
      setData(body as HomeData);
    }).catch((error) => setMessage(error instanceof Error ? error.message : 'Não foi possível carregar a home.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <><PageHeader/><div className="home-lily-corner" aria-hidden="true"><img src="/pink-lily.svg" alt=""/></div><div className="empty">Carregando seu guarda-roupa…</div></>;
  if (!data) return <><PageHeader/><div className="card inline-message" role="alert">{message || 'Não foi possível carregar a página.'}</div></>;

  return (
    <>
      <PageHeader/>
      <div className="home-lily-corner" aria-hidden="true"><img src="/pink-lily.svg" alt=""/></div>
      <header className="home-welcome">
        <span className="card-kicker">Meu Look</span>
        <h1 className="page-title">Meu Look ♡</h1>
        <p className="page-subtitle">Hoje é um bom dia para se sentir linda, {firstName(data.profile.name)}.</p>
      </header>

      {data.message && <section className="section"><div className="card message-card"><span className="message-mark">♡</span><div><strong className="message-title">{data.message.title}</strong><p className="message-body">{data.message.body}</p></div></div></section>}

      <section className="section home-main-section">
        <div className="home-day-look card">
          <div className="section-head"><div><span className="card-kicker">Hoje</span><h2 className="card-title">Look do Dia</h2><p className="page-subtitle">{data.dayLook ? data.dayLook.occasion || 'Sua composição escolhida para hoje.' : 'Uma composição para começar o dia.'}</p></div><Link className="text-link" href="/look-do-dia">{data.dayLook ? 'Visualizar e editar' : 'Montar agora'}</Link></div>
          {data.dayLook ? <OutfitPreview outfit={data.dayLook}/> : <div className="home-day-empty"><Shirt size={30}/><div><strong>Nenhum look definido.</strong><p>Monte uma composição com suas peças e marque como Look do Dia.</p></div><Link className="btn btn-soft" href="/look-do-dia">Montar Look do Dia</Link></div>}
        </div>

        <div className="home-quick-actions">
          <Link className="quick-action" href="/guarda-roupa"><span><Plus size={18}/></span><div><strong>Adicionar peça</strong><small>Atualize seu guarda-roupa</small></div><ArrowRight size={16}/></Link>
          <Link className="quick-action" href="/look-do-dia"><span><Shirt size={18}/></span><div><strong>Montar look</strong><small>Crie uma nova composição</small></div><ArrowRight size={16}/></Link>
          <Link className="quick-action" href="/calendario"><span><CalendarDays size={18}/></span><div><strong>Registrar uso</strong><small>Guarde o que você vestiu</small></div><ArrowRight size={16}/></Link>
        </div>
      </section>

      <section className="section home-summary-row">
        <div><strong>{data.summary.clothing}</strong><span>peças</span></div>
        <div><strong>{data.summary.outfits}</strong><span>looks</span></div>
        <div><strong>{data.summary.favorites}</strong><span>favoritas</span></div>
        <div><strong>{data.summary.never_used}</strong><span>esperando sua vez</span></div>
      </section>

      <section className="section home-content-grid">
        <div className="card home-list-panel">
          <div className="section-head"><div><h2 className="section-title">Usados recentemente</h2><p className="page-subtitle">Peças que apareceram nos últimos registros.</p></div><Link className="text-link" href="/calendario">Ver calendário</Link></div>
          {data.recentUsed.length ? <div className="home-piece-list">{data.recentUsed.map((item) => <Link href="/guarda-roupa" className="home-piece-row" key={item.id}><div className="home-piece-thumb">{item.image_path ? <img src={imageUrl(item.image_path)} alt=""/> : <Shirt size={17}/>}</div><div><strong>{item.name}</strong><span>{item.category}</span></div><ArrowRight size={15}/></Link>)}</div> : <div className="compact-empty">Ainda não há registros de uso.</div>}
        </div>
        <div className="card home-list-panel">
          <div className="section-head"><div><h2 className="section-title">Esperando sua vez</h2><p className="page-subtitle">Peças que ainda não aparecem no histórico.</p></div><Link className="text-link" href="/guarda-roupa">Ver guarda-roupa</Link></div>
          {data.waiting.length ? <div className="home-piece-list">{data.waiting.map((item) => <Link href="/guarda-roupa" className="home-piece-row" key={item.id}><div className="home-piece-thumb">{item.image_path ? <img src={imageUrl(item.image_path)} alt=""/> : <Shirt size={17}/>}</div><div><strong>{item.name}</strong><span>{item.category}</span></div><Heart size={15}/></Link>)}</div> : <div className="compact-empty">Todas as peças já foram usadas pelo menos uma vez.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Seus looks salvos</h2><p className="page-subtitle">As composições que você escolheu guardar.</p></div><Link className="text-link" href="/favoritos">Ver favoritos</Link></div>
        {data.saved.length ? <div className="grid">{data.saved.slice(0,4).map((outfit) => <OutfitCard key={outfit.id} outfit={outfit}/>)}</div> : <div className="empty"><Heart className="empty-icon"/><h3 className="empty-title">Nenhum look salvo ainda.</h3><p className="empty-copy">Monte uma composição e favorite quando quiser mantê-la por perto.</p><Link className="btn btn-soft" href="/look-do-dia">Montar um look</Link></div>}
      </section>
    </>
  );
}

function OutfitPreview({ outfit }: { outfit: Outfit }) {
  return <div className="outfit-preview home-day-preview">{(outfit.outfit_items || []).slice(0,4).map((entry) => entry.clothing_items?.image_path ? <img key={entry.clothing_item_id} src={imageUrl(entry.clothing_items.image_path)} alt={entry.clothing_items.name || ''}/> : null)}</div>;
}

function OutfitCard({ outfit }: { outfit: Outfit }) {
  return <article className="card outfit-card"><div className="outfit-preview">{(outfit.outfit_items || []).slice(0,3).map((entry) => entry.clothing_items?.image_path ? <img key={entry.clothing_item_id} src={imageUrl(entry.clothing_items.image_path)} alt=""/> : null)}{!(outfit.outfit_items || []).length && <div className="outfit-placeholder"><Shirt/></div>}</div><div className="outfit-info"><div className="outfit-title">{outfit.name}</div><div className="outfit-meta">{outfit.occasion || 'Sem ocasião'}{outfit.is_favorite ? ' · Favorito' : ''}</div></div></article>;
}
