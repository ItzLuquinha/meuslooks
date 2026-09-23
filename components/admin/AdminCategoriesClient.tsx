"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Edit3, Plus, Power, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import type { Category } from '@/lib/types';

export default function AdminCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function load() {
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Selecione uma usuária.');
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setMessage('');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Não foi possível carregar as categorias.';
      setMessage(text);
      showToast(text, 'error');
    }
  }

  useEffect(() => { void load(); }, [showToast]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar a categoria.');
      setName('');
      setCreating(false);
      await load();
      showToast('Categoria criada', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível criar a categoria.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, name: editing.name, is_active: editing.is_active }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar a categoria.');
      setEditing(null);
      await load();
      showToast('Categoria atualizada', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a categoria.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(category: Category) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: category.id, is_active: !category.is_active }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível alterar a categoria.');
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, is_active: !category.is_active } : item));
      showToast(category.is_active ? 'Categoria desativada' : 'Categoria ativada', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível alterar a categoria.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleting.id }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível excluir a categoria.');
      setDeleting(null);
      await load();
      showToast('Categoria excluída', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível excluir a categoria.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <h1 className="page-title">Categorias</h1>
    <p className="page-subtitle">Gerencie as categorias específicas da usuária selecionada. As categorias padrão continuam disponíveis.</p>
    {message && <div className="card inline-message" role="alert">{message}</div>}
    <div className="section-head section"><div><h2 className="section-title">Categorias</h2></div><button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={17}/>Criar categoria</button></div>
    <section className="section"><div className="category-admin-list">{categories.map((category) => <article className={`card category-admin-item${category.is_active ? '' : ' inactive'}`} key={category.id}><div><div className="clothing-name">{category.name}</div><div className="clothing-meta">{category.user_id ? 'Personalizada' : 'Padrão'} · {category.is_active ? 'Ativa' : 'Desativada'}</div></div>{category.user_id && <div className="inline-actions"><button type="button" className="btn btn-soft" onClick={() => setEditing(category)}><Edit3 size={15}/>Editar</button><button type="button" className="btn btn-ghost" onClick={() => void toggle(category)} disabled={busy}><Power size={15}/>{category.is_active ? 'Desativar' : 'Ativar'}</button><button type="button" className="btn btn-danger" onClick={() => setDeleting(category)} disabled={busy}><Trash2 size={15}/>Excluir</button></div>}</article>)}</div></section>
    {creating && <Modal title="Nova categoria" onClose={() => setCreating(false)}><form className="auth-form" onSubmit={create}><div className="field"><label className="label">Nome</label><input className="input" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} required/></div><div className="modal-actions inline-actions"><button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Criar categoria'}</button></div></form></Modal>}
    {editing && <Modal title="Editar categoria" onClose={() => setEditing(null)}><form className="auth-form" onSubmit={update}><div className="field"><label className="label">Nome</label><input className="input" maxLength={40} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required/></div><label className="check-row"><input type="checkbox" checked={Boolean(editing.is_active)} onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })}/><Check size={17}/> Categoria ativa</label><div className="modal-actions inline-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>Salvar alterações</button></div></form></Modal>}
    {deleting && <ConfirmModal title="Excluir categoria?" message="Categorias usadas por peças existentes não podem ser apagadas. Nesse caso, use a opção de desativar." confirmLabel="Excluir" onConfirm={() => void remove()} onCancel={() => setDeleting(null)} busy={busy}/>} 
  </>;
}
