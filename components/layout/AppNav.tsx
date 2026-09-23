"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, CalendarDays, ChevronUp, Heart, Home, Settings, Shirt, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const items = [
  ['/inicio','Início',Home],
  ['/guarda-roupa','Meu Guarda-Roupa',Shirt],
  ['/favoritos','Favoritos',Heart],
  ['/calendario','Calendário',CalendarDays],
  ['/estatisticas','Estatísticas',BarChart3],
  ['/configuracoes','Configurações',Settings],
] as const;

const mobilePrimary = items.slice(0, 4);
const mobileMore = items.slice(4);

function isActive(path: string, href: string) { return path === href || path.startsWith(`${href}/`); }

export default function AppNav() {
  const path = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    mobilePrimary.forEach(([href]) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    if (!moreOpen) return;
    mobileMore.forEach(([href]) => router.prefetch(href));
  }, [moreOpen, router]);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <>
      <aside className="sidebar">
        <div className="brand brand-with-lily"><img src="/pink-lily.svg" alt="" className="brand-lily" aria-hidden="true"/><span>Meu Look ♡</span></div>
        <nav className="nav-stack">{items.map(([href,label,Icon]) => <Link key={href} href={href} prefetch={true} aria-current={isActive(path, href) ? 'page' : undefined} className={`nav-link ${isActive(path, href) ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></Link>)}</nav>
      </aside>

      <nav className="mobile-nav" aria-label="Navegação principal">
        {mobilePrimary.map(([href,label,Icon]) => <Link key={href} href={href} prefetch={true} aria-current={isActive(path, href) ? 'page' : undefined} className={`mobile-link ${isActive(path, href) ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></Link>)}
        <button type="button" className={`mobile-link mobile-more-button ${moreOpen || mobileMore.some(([href]) => isActive(path, href)) ? 'active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
          <ChevronUp size={18}/><span>Mais</span>
        </button>
      </nav>

      {moreOpen && <div className="more-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setMoreOpen(false); }}>
        <section className="more-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title">
          <div className="section-head"><div><span className="card-kicker">Meu Look</span><h2 className="section-title" id="more-title">Mais</h2></div><button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setMoreOpen(false)}><X size={18}/></button></div>
          <div className="more-sheet-grid">{mobileMore.map(([href,label,Icon]) => <Link key={href} href={href} prefetch={true} aria-current={isActive(path, href) ? 'page' : undefined} className={`more-sheet-link ${isActive(path, href) ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></Link>)}</div>
        </section>
      </div>}
    </>
  );
}
