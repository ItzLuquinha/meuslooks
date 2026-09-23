"use client";
import Link from 'next/link';
import { Bug, Home, Images, MessageCircle, MoreHorizontal, Settings, Shirt, UserRound, Tags, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  ['/admin','Visão geral',Home],
  ['/admin/usuaria','Usuária',UserRound],
  ['/admin/guarda-roupa','Guarda-Roupa',Shirt],
  ['/admin/looks','Looks',Images],
  ['/admin/mensagens','Mensagens',MessageCircle],
  ['/admin/categorias','Categorias',Tags],
  ['/admin/configuracoes','Configurações',Settings],
  ['/admin/debug','Debug',Bug],
] as const;

export default function AdminNav() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = links.slice(0, 3);
  const more = links.slice(3);
  const moreActive = more.some(([href]) => path.startsWith(href));
  return <>
    <aside className="admin-sidebar"><div className="brand">Meu Look</div><nav className="admin-nav">{links.map(([href,label,Icon]) => <Link key={href} href={href} className={path === href ? 'active' : ''}><Icon size={17}/>{label}</Link>)}</nav><div className="admin-sidebar-note">Administrador</div></aside>
    <nav className="mobile-nav admin-mobile-nav">{primary.map(([href,label,Icon]) => <Link key={href} href={href} className={path === href ? 'active' : ''}><Icon size={17}/><span>{label}</span></Link>)}<button type="button" className={moreActive ? 'active' : ''} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal size={18}/><span>Mais</span></button></nav>
    {moreOpen && <div className="admin-more-sheet"><div className="admin-more-card card"><div className="section-head"><h2 className="section-title">Mais áreas</h2><button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setMoreOpen(false)}><X size={18}/></button></div>{more.map(([href,label,Icon]) => <Link key={href} href={href} className={path === href ? 'active' : ''} onClick={() => setMoreOpen(false)}><Icon size={17}/>{label}</Link>)}</div></div>}
  </>;
}
