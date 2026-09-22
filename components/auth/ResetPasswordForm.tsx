"use client";
import { useState } from 'react';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (password.length < 8 || password.length > 128 || password !== confirm) {
      setMsg(password !== confirm ? 'As senhas não conferem.' : 'A senha precisa ter entre 8 e 128 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMsg(data.error || 'Não foi possível redefinir sua senha.');
        return;
      }
      setMsg('Senha alterada.');
      window.setTimeout(() => { window.location.href = '/inicio'; }, 600);
    } catch {
      setMsg('Não foi possível redefinir sua senha.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">Meu Look ♡</div>
        <p className="auth-copy">Crie uma nova senha para continuar.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label className="label">Nova senha</label>
            <input className="input" type="password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Confirmar nova senha</label>
            <input className="input" type="password" minLength={8} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {msg && <p className="card-copy" role="alert">{msg}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>
      </section>
    </main>
  );
}
