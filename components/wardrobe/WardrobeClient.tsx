"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Camera, Heart, Plus, Shirt, Upload } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import CameraCapture from './CameraCapture';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import type { Category, ClothingItem } from '@/lib/types';

const EMPTY_FORM = { name: '', category_id: '', subcategory: '', color: '', size: '', brand: '', occasion: '', season: '', notes: '', is_favorite: false };

type FormState = typeof EMPTY_FORM;

type ClothingFormProps = {
  initial?: ClothingItem;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  categories: Category[];
  submitLabel: string;
  busy: boolean;
};

export default function WardrobeClient() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [camera, setCamera] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [editing, setEditing] = useState<ClothingItem | null>(null);
  const [deleting, setDeleting] = useState<ClothingItem | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/clothing', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o guarda-roupa.');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Não foi possível carregar o guarda-roupa.';
      setMessage(text);
      showToast(text, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = filter === 'all' ? items : items.filter((item) => item.category_id === filter);
  const photoUrl = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  function startAdd() {
    setAdding(true);
    setCamera(false);
    setPhoto(null);
    setMessage('');
  }

  function closeAdd() {
    setAdding(false);
    setCamera(false);
    setPhoto(null);
    setMessage('');
  }

  async function addClothing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) {
      setMessage('Escolha ou tire uma foto antes de salvar.');
      return;
    }
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    form.set('image', photo);
    const response = await fetch('/api/clothing', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const text = data.error || 'Não foi possível salvar essa peça.';
      setMessage(text);
      showToast(text, 'error');
    } else {
      closeAdd();
      await load();
      showToast('Peça adicionada', 'success');
    }
    setBusy(false);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(`/api/clothing/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        category_id: String(payload.category_id || '') || null,
        is_favorite: form.get('is_favorite') === 'on',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const text = data.error || 'Não foi possível atualizar essa peça.';
      setMessage(text);
      showToast(text, 'error');
    } else {
      setEditing(null);
      await load();
      showToast('Peça atualizada', 'success');
    }
    setBusy(false);
  }

  async function toggleFavorite(item: ClothingItem) {
    setBusy(true);
    const next = !item.is_favorite;
    const response = await fetch(`/api/clothing/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: next }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_favorite: next } : entry));
      showToast(next ? 'Peça adicionada aos favoritos' : 'Peça removida dos favoritos', 'success');
    } else {
      showToast(data.error || 'Não foi possível atualizar o favorito.', 'error');
    }
    setBusy(false);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const response = await fetch(`/api/clothing/${deleting.id}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      showToast('Peça excluída', 'success');
    } else {
      showToast(data.error || 'Não foi possível excluir a peça.', 'error');
    }
    setBusy(false);
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = categoryName.trim();
    if (value.length < 2) {
      setMessage('Informe um nome de categoria válido.');
      return;
    }
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const text = data.error || 'Não foi possível criar a categoria.';
      setMessage(text);
      showToast(text, 'error');
    } else {
      setCategoryModal(false);
      setCategoryName('');
      await load();
      showToast('Categoria criada', 'success');
    }
    setBusy(false);
  }

  return (
    <>
      <PageHeader />
      <div className="section-head">
        <div>
          <h1 className="page-title">Meu Guarda-Roupa</h1>
          <p className="page-subtitle">Tudo o que você já cadastrou, em um só lugar.</p>
        </div>
        <button className="btn btn-primary" onClick={startAdd}><Plus size={17}/>Adicionar peça</button>
      </div>

      <div className="category-filter-row">
        <button className={`btn ${filter === 'all' ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setFilter('all')}>Todas</button>
        {categories.map((category) => (
          <button key={category.id} className={`btn ${filter === category.id ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setFilter(category.id)}>
            {category.name}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={() => setCategoryModal(true)}><Plus size={16}/>Nova categoria</button>
      </div>

      {message && <div className="card inline-message" role="alert">{message}</div>}

      <section className="section">
        {loading ? <div className="empty">Carregando…</div> : filtered.length ? (
          <div className="grid">
            {filtered.map((item) => (
              <article key={item.id} className="card clothing-card">
                <button aria-label={item.is_favorite ? 'Desfavoritar' : 'Favoritar'} className="favorite-btn" onClick={() => void toggleFavorite(item)} disabled={busy}>
                  <Heart size={17} fill={item.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <div className="clothing-image">
                  {item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt={item.name}/> : <div className="placeholder-art"><Shirt/></div>}
                </div>
                <div className="clothing-info">
                  <div className="clothing-name">{item.name}</div>
                  <div className="clothing-meta">{item.clothing_categories && !Array.isArray(item.clothing_categories) ? item.clothing_categories.name : 'Sem categoria'}{item.color ? ` · ${item.color}` : ''}</div>
                  <div className="clothing-usage">{item.usage_count ? `${item.usage_count} ${item.usage_count === 1 ? 'uso' : 'usos'}` : 'Ainda não usada'}{item.last_used ? ` · ${new Date(`${item.last_used}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}` : ''}</div>
                  <div className="inline-actions" style={{marginTop:8}}>
                    <button className="btn btn-soft" onClick={() => setEditing(item)}>Editar</button>
                    <button className="btn btn-danger" onClick={() => setDeleting(item)}>Excluir</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Shirt className="empty-icon"/>
            <h3 className="empty-title">{filter === 'all' ? 'Seu guarda-roupa ainda está vazio.' : 'Nenhuma peça nesta categoria.'}</h3>
            <p className="empty-copy">{filter === 'all' ? 'Cadastre sua primeira peça com uma foto.' : 'Você pode mudar o filtro ou adicionar uma nova peça.'}</p>
            {filter === 'all' && <button className="btn btn-soft" onClick={startAdd}>Adicionar minha primeira peça</button>}
          </div>
        )}
      </section>

      {adding && (
        <Modal title={camera ? 'Tirar foto' : photo ? 'Confirmar foto' : 'Adicionar peça'} onClose={closeAdd} wide>
          {camera ? (
            <CameraCapture onUse={(file) => { setPhoto(file); setCamera(false); }} onCancel={() => setCamera(false)} />
          ) : photo ? (
            <>
              <div className="photo-confirm"><img src={photoUrl || ''} alt="Prévia da foto da peça" /></div>
              <div className="inline-actions" style={{marginTop:12}}>
                <button type="button" className="btn btn-soft" onClick={() => setCamera(true)}>Tirar outra</button>
                <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={17}/>Escolher outra</button>
              </div>
              <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPhoto(file); }} />
              <ClothingForm onSubmit={addClothing} categories={categories} submitLabel="Salvar peça" busy={busy} />
            </>
          ) : (
            <>
              <div className="camera-source-grid">
                <button className="btn btn-soft" onClick={() => setCamera(true)}><Camera size={18}/>Tirar foto</button>
                <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={18}/>Escolher da galeria</button>
              </div>
              <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPhoto(file); }} />
            </>
          )}
        </Modal>
      )}

      {editing && <Modal title="Editar peça" onClose={() => setEditing(null)} wide><ClothingForm initial={editing} categories={categories} onSubmit={saveEdit} submitLabel="Salvar alterações" busy={busy}/></Modal>}
      {deleting && <ConfirmModal title="Excluir peça?" message="A peça e sua foto armazenada serão removidas." confirmLabel="Excluir" onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} busy={busy}/>} 
      {categoryModal && <Modal title="Nova categoria" onClose={() => setCategoryModal(false)}><form className="auth-form" onSubmit={createCategory}><div className="field"><label className="label">Nome</label><input className="input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={40} required /></div><div className="modal-actions inline-actions"><button type="button" className="btn btn-ghost" onClick={() => setCategoryModal(false)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Criar categoria'}</button></div></form></Modal>}
    </>
  );
}

function ClothingForm({ initial, onSubmit, categories, submitLabel, busy }: ClothingFormProps) {
  return (
    <form onSubmit={onSubmit} style={{marginTop:16}}>
      <div className="form-grid">
        <div className="field"><label className="label">Nome</label><input className="input" name="name" defaultValue={initial?.name || ''} required /></div>
        <div className="field"><label className="label">Categoria</label><select className="select" name="category_id" defaultValue={initial?.category_id || ''}><option value="">Sem categoria</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div>
        <div className="field"><label className="label">Subcategoria</label><input className="input" name="subcategory" defaultValue={initial?.subcategory || ''}/></div>
        <div className="field"><label className="label">Cor</label><input className="input" name="color" defaultValue={initial?.color || ''}/></div>
        <div className="field"><label className="label">Tamanho</label><input className="input" name="size" defaultValue={initial?.size || ''}/></div>
        <div className="field"><label className="label">Marca</label><input className="input" name="brand" defaultValue={initial?.brand || ''}/></div>
        <div className="field"><label className="label">Ocasião</label><input className="input" name="occasion" defaultValue={initial?.occasion || ''}/></div>
        <div className="field"><label className="label">Estação</label><input className="input" name="season" defaultValue={initial?.season || ''}/></div>
        <div className="field full"><label className="label">Observações</label><textarea className="textarea" name="notes" defaultValue={initial?.notes || ''}/></div>
      </div>
      <label className="check-row"><input type="checkbox" name="is_favorite" defaultChecked={Boolean(initial?.is_favorite)}/><Heart size={17}/> Favorito</label>
      <button className="btn btn-primary" style={{width:'100%',marginTop:16}} disabled={busy}>{busy ? 'Salvando…' : submitLabel}</button>
    </form>
  );
}
