"use client";
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PageHeader({ compact=false }: { compact?: boolean }) {
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/login'; }
  return <div className="topbar"><div>{compact ? null : <span className="sr-only">Meu Look</span>}</div><button className="icon-btn" onClick={logout} aria-label="Sair"><LogOut size={18}/></button></div>;
}
