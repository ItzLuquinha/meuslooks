import type { ReactNode } from 'react';
import Link from 'next/link';
export default function AuthShell({ title, subtitle, children, linkText, linkHref }: { title:string; subtitle:string; children?:ReactNode; linkText:string; linkHref:string }) {
 return <main className="auth-page"><section className="auth-card"><div className="flower-row"><i className="flower a"/><i className="flower b"/><i className="flower c"/><i className="flower d"/></div><div className="auth-brand">Meu Look ♡</div><p className="auth-copy">{subtitle}</p><h1 className="sr-only">{title}</h1>{children}<div className="link-row"><Link className="text-link" href={linkHref}>{linkText}</Link><Link className="text-link" href="/auth/esqueci">Esqueci minha senha</Link></div></section></main>
}
