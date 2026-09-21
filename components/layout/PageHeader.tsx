"use client";
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PageHeader({ compact=false }: { compact?: boolean }) {
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/login'; }
  return <div className="topbar"><div className="topbar-brand-slot">{compact ? null : <div className="mobile-brand"><img src="/pink-lily.svg" alt="" className="mobile-brand-lily" aria-hidden="true"/><span>Meu Look</span></div>}</div><button className="icon-btn" onClick={logout} aria-label="Sair"><LogOut size={18}/></button></div>;
}
