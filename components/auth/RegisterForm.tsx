"use client";

import { useState } from 'react';
import AuthShell from './AuthShell';

export default function RegisterForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Não foi possível criar sua conta.');
        return;
      }

      const login = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!login.ok) {
        setError('Conta criada. Entre com suas credenciais para continuar.');
        return;
      }
      window.location.href = '/inicio';
    } catch {
      setError('Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <AuthShell title="Criar conta" subtitle="Vamos começar seu guarda-roupa." linkText="Já tenho uma conta" linkHref="/login"><form className="auth-form" onSubmit={submit}><div className="field"><label className="label">Nome</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div><div className="field"><label className="label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div><div className="field"><label className="label">Senha</label><input className="input" type="password" minLength={8} maxLength={128} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div><div className="field"><label className="label">Confirmar senha</label><input className="input" type="password" minLength={8} maxLength={128} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required /></div>{error && <p className="card-copy" role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Criando…' : 'Criar minha conta'}</button></form></AuthShell>;
}
