"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { LogOut, Save, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/ToastProvider';

type Profile = { id: string; name: string; email: string; created_at: string };
type ProfileResponse = { profile?: Profile; error?: string };

export default function SettingsClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        const data = await response.json().catch((): ProfileResponse => ({}));
        if (!response.ok || !data.profile) throw new Error(data.error || 'Não foi possível carregar seu perfil.');
        if (active) setProfile(data.profile);
      } catch (error) {
        if (active) showToast(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [showToast]);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profile.name }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar seu nome.');
      showToast('Nome atualizado', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar seu nome.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwords.next !== passwords.confirm) {
      showToast('As novas senhas não conferem.', 'error');
      return;
    }
    if (passwords.next.length < 8 || passwords.next.length > 128) {
      showToast('A nova senha precisa ter entre 8 e 128 caracteres.', 'error');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwords) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível alterar a senha.');
      setPasswords({ current: '', next: '', confirm: '' });
      showToast('Senha alterada', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível alterar a senha.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = '/login';
  }

  return (
    <>
      <PageHeader />
      <h1 className="page-title">Configurações</h1>
      <p className="page-subtitle">Sua conta, preferências e segurança.</p>

      {loading ? <div className="empty section">Carregando suas configurações…</div> : <>
        <section className="section">
          <div className="section-head"><h2 className="section-title">Minha conta</h2></div>
          <form className="card form-card" onSubmit={saveName}>
            <div className="form-grid">
              <div className="field"><label className="label">Nome</label><input className="input" value={profile?.name || ''} onChange={(event) => setProfile((current) => current ? { ...current, name: event.target.value } : current)} required maxLength={80} /></div>
              <div className="field"><label className="label">E-mail</label><input className="input" value={profile?.email || ''} disabled /></div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || !profile?.name.trim()}><Save size={16}/>{busy ? 'Salvando…' : 'Salvar'}</button>
          </form>
        </section>

        <section className="section">
          <div className="section-head"><div><h2 className="section-title">Segurança</h2><p className="page-subtitle">A senha de acesso é atualizada no Supabase Auth e na credencial recuperável do aplicativo.</p></div><ShieldCheck size={20} aria-hidden="true" /></div>
          <form className="card form-card" onSubmit={savePassword}>
            <div className="form-grid">
              <div className="field full"><label className="label">Senha atual</label><input className="input" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))} required /></div>
              <div className="field"><label className="label">Nova senha</label><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={passwords.next} onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))} required /></div>
              <div className="field"><label className="label">Confirmar nova senha</label><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={passwords.confirm} onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))} required /></div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Alterando…' : 'Alterar senha'}</button>
          </form>
        </section>

        <section className="section"><div className="card form-card"><strong>Sobre</strong><p className="page-subtitle" style={{ marginTop: 7 }}>Meu Look · versão 1.0.0</p><button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => void logout}><LogOut size={16}/>Sair</button></div></section>
      </>}
    </>
  );
}
