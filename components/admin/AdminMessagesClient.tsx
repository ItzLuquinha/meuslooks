"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

type MessageState = { title: string; body: string; active: boolean };
export default function AdminMessagesClient() {
  const [form, setForm] = useState<MessageState>({ title: 'Uma mensagem para você ♡', body: '', active: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/admin/messages', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a mensagem.');
        if (active && data.message) setForm({ title: data.message.title, body: data.message.body, active: data.message.active });
      } catch (error) {
        if (active) showToast(error instanceof Error ? error.message : 'Não foi possível carregar a mensagem.', 'error');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [showToast]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/admin/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
      showToast('Mensagem atualizada', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error'); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/messages', { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível remover.');
      setForm((current) => ({ ...current, active: false, body: '' }));
      showToast('Mensagem removida', 'success');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível remover.', 'error'); } finally { setBusy(false); }
  }

  if (loading) return <div className="empty section">Carregando mensagem…</div>;
  return <><h1 className="page-title">Mensagens</h1><p className="page-subtitle">Uma mensagem ativa aparece no topo da página inicial.</p><section className="section"><form className="card form-card" onSubmit={save}><div className="field"><label className="label">Título</label><input className="input" value={form.title} maxLength={100} onChange={e => setForm({...form,title:e.target.value})} required /></div><div className="field" style={{marginTop:13}}><label className="label">Mensagem</label><textarea className="textarea" value={form.body} maxLength={1000} onChange={e => setForm({...form,body:e.target.value})} required /></div><label style={{display:'flex',alignItems:'center',gap:8,marginTop:13,fontWeight:700}}><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Ativa</label><div className="inline-actions" style={{marginTop:16}}><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar mensagem'}</button><button type="button" className="btn btn-danger" onClick={() => void remove()} disabled={busy}>Excluir</button></div></form></section></>;
}
