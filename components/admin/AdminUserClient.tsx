"use client";
import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Shield, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';

type User = { id: string; name: string; email: string; created_at: string; is_blocked: boolean };

export default function AdminUserClient() {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/admin/user', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    setUser(data.user || null);
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!user) return;
    setBusy(true); setMessage('');
    const response = await fetch('/api/admin/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user.name, email: user.email }) });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'Dados atualizados.' : data.error || 'Não foi possível atualizar.');
    setBusy(false);
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    const response = await fetch('/api/admin/user/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPassword }) });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'Senha redefinida.' : data.error || 'Não foi possível redefinir a senha.');
    if (response.ok) { setShowReset(false); setNewPassword(''); setVisible(false); setPassword(''); }
    setBusy(false);
  }

  async function reveal() {
    setBusy(true); setMessage('');
    const response = await fetch('/api/admin/user/reveal-password', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setPassword(data.password); setVisible(true); } else setMessage(data.error || 'Não foi possível visualizar a senha.');
    setBusy(false);
  }

  async function toggleBlock() {
    if (!user) return;
    setBusy(true);
    const response = await fetch('/api/admin/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_blocked: !user.is_blocked }) });
    if (response.ok) setUser({ ...user, is_blocked: !user.is_blocked });
    else { const data = await response.json().catch(() => ({})); setMessage(data.error || 'Não foi possível alterar o status.'); }
    setBusy(false);
  }

  async function deleteAccount() {
    setBusy(true);
    const response = await fetch('/api/admin/user', { method: 'DELETE' });
    if (response.ok) window.location.href = '/admin';
    else { const data = await response.json().catch(() => ({})); setMessage(data.error || 'Não foi possível excluir a conta.'); setBusy(false); }
  }

  if (!user) return <div className="empty"><Shield className="empty-icon"/><h3 className="empty-title">Nenhuma usuária selecionada.</h3><p className="empty-copy">Escolha uma usuária no seletor acima para administrar a conta.</p></div>;

  return <>
    <h1 className="page-title">Usuária</h1><p className="page-subtitle">Dados da conta e ações administrativas.</p>
    {message && <div className="card inline-message" role="alert">{message}</div>}
    <section className="section"><div className="card form-card"><div className="form-grid"><div className="field"><label className="label">Nome</label><input className="input" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })}/></div><div className="field"><label className="label">E-mail</label><input className="input" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })}/></div><div className="field"><label className="label">Data de cadastro</label><input className="input" value={new Date(user.created_at).toLocaleDateString('pt-BR')} disabled/></div><div className="field"><label className="label">Status</label><input className="input" value={user.is_blocked ? 'Bloqueada' : 'Ativa'} disabled/></div></div><div className="inline-actions" style={{marginTop:16}}><button className="btn btn-primary" onClick={() => void save()} disabled={busy}>Salvar dados</button><button className="btn btn-soft" onClick={() => setShowReset(true)} disabled={busy}><KeyRound size={16}/>Redefinir senha</button><button className="btn btn-ghost" onClick={() => void toggleBlock()} disabled={busy}>{user.is_blocked ? 'Desbloquear' : 'Bloquear'} conta</button><button className="btn btn-danger" onClick={() => setShowDelete(true)} disabled={busy}><Trash2 size={16}/>Excluir conta</button></div></div></section>
    <section className="section"><div className="card form-card"><div className="section-head"><div><h2 className="section-title">Senha da usuária</h2><p className="page-subtitle" style={{marginTop:6}}>A senha permanece oculta até uma ação administrativa explícita.</p></div><span className="badge">Acesso individual</span></div><div className="password-reveal"><input className="input" readOnly value={visible ? password : '••••••••'} aria-label="Senha da usuária"/><button className="btn btn-soft" onClick={() => void reveal()} disabled={busy}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>} {visible ? 'Atualizar senha' : 'Mostrar senha'}</button>{visible && <button className="btn btn-ghost" onClick={() => void navigator.clipboard.writeText(password)}>Copiar senha</button>}</div></div></section>
    {showReset && <Modal title="Redefinir senha" onClose={() => { setShowReset(false); setNewPassword(''); }}><form className="auth-form" onSubmit={resetPassword}><div className="field"><label className="label">Nova senha</label><input className="input" type="password" minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus/><span className="field-hint">Use entre 8 e 128 caracteres.</span></div><div className="inline-actions modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setShowReset(false)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Redefinir senha'}</button></div></form></Modal>}
    {showDelete && <ConfirmModal title="Excluir conta?" message="A conta da usuária e os dados relacionados serão removidos. Esta ação não poderá ser desfeita." confirmLabel="Excluir conta" onConfirm={() => void deleteAccount()} onCancel={() => setShowDelete(false)} busy={busy}/>} 
  </>;
}
