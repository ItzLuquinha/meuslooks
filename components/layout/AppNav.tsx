"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Heart, Home, Settings, Shirt } from 'lucide-react';

const items = [
  ['/inicio','Início',Home],
  ['/guarda-roupa','Meu Guarda-Roupa',Shirt],
  ['/favoritos','Favoritos',Heart],
  ['/camera','Câmera',Camera],
  ['/configuracoes','Configurações',Settings],
] as const;

function NavLinks({ mobile=false }: { mobile?: boolean }) {
  const path = usePathname();
  return <>{items.map(([href,label,Icon]) => <Link key={href} href={href} className={`${mobile ? 'mobile-link' : 'nav-link'} ${path.startsWith(href) ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></Link>)}</>;
}

export default function AppNav() {
  return <>
    <aside className="sidebar"><div className="brand brand-with-lily"><img src="/pink-lily.svg" alt="" className="brand-lily" aria-hidden="true"/><span>Meu Look ♡</span></div><nav className="nav-stack"><NavLinks /></nav></aside>
    <nav className="mobile-nav"><NavLinks mobile /></nav>
  </>;
}
