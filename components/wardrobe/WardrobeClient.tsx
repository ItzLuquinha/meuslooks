"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Heart, Plus, Shirt, Upload } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import CameraCapture from './CameraCapture';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';

const defaults = ['Camisetas','Blusas','Camisas','Croppeds','Vestidos','Saias','Shorts','Calças','Jeans','Casacos','Jaquetas','Moletons','Pijamas','Roupas íntimas','Lingerie','Sutiãs','Calcinhas','Meias','Sapatos','Tênis','Sandálias','Botas','Bolsas','Acessórios','Outros'];

type ClothingItem = {
  id: string; name: string; category_id?: string | null; subcategory?: string | null; color?: string | null; size?: string | null; brand?: string | null; occasion?: string | null; season?: string | null; notes?: string | null; image_path?: string | null; is_favorite: boolean; clothing_categories?: { id?: string; name?: string; is_active?: boolean } | null;
};

const emptyForm = { name: '', category_id: '', subcategory: '', color: '', size: '', brand: '', occasion: '', season: '', notes: '', is_favorite: false };

export default function WardrobeClient() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todas');
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
  const editFileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/clothing', { cache: 'no-store' });
      const data = await response.json();
      setItems(data.items || []);
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const availableCategories = categories.length ? categories : defaults.map((name) => ({ id: name, name, is_active: true }));
  const filtered = filter === 'Todas' ? items : items.filter((item) => item.clothing_categories?.name === filter);
  const photoUrl = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  async function addClothing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) { setMessage('Escolha ou tire uma foto antes de salvar.'); return; }
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    form.set('category', availableCategories.find((category: any) => category.id === form.get('category_id'))?.name || '');
    form.set('image', photo);
    form.delete('category_id');
    const response = await fetch('/api/clothing', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || 'Não foi possível salvar essa peça.');
    else { event.currentTarget.reset(); setPhoto(null); setCamera(false); setAdding(false); await load(); }
    setBusy(false);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(`/api/clothing/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, category_id: String(payload.category_id || '') || null, is_favorite: form.get('is_favorite') === 'on' }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || 'Não foi possível atualizar essa peça.');
    else { setEditing(null); await load(); }
    setBusy(false);
  }

  async function toggleFavorite(item: ClothingItem) {
    const response = await fetch(`/api/clothing/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_favorite: !item.is_favorite }) });
    if (response.ok) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_favorite: !item.is_favorite } : entry));
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const response = await fetch(`/api/clothing/${deleting.id}`, { method: 'DELETE' });
    if (response.ok) { setItems((current) => current.filter((item) => item.id !== deleting.id)); setDeleting(null); }
    setBusy(false);
  }

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    const value = categoryName.trim();
    if (value.length < 2) return;
    setBusy(true); setMessage('');
    const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || 'Não foi possível criar a categoria.');
    else { setCategoryModal(false); setCategoryName(''); await load(); }
    setBusy(false);
  }

  const startAdd = () => { setAdding(true); setCamera(false); setPhoto(null); setMessage(''); };
  const closeAdd = () => { setAdding(false); setCamera(false); setPhoto(null); setMessage(''); };

  return <>
    <PageHeader />
    <div className="section-head"><div><h1 className="page-title">Meu Guarda-Roupa</h1><p className="page-subtitle">Tudo o que você já cadastrou, em um só lugar.</p></div><button className="btn btn-primary" onClick={startAdd}><Plus size={17}/>Adicionar peça</button></div>
    <div className="category-filter-row"><button className={`btn ${filter === 'Todas' ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setFilter('Todas')}>Todas</button>{availableCategories.map((category: any) => <button className={`btn ${filter === category.name ? 'btn-soft' : 'btn-ghost'}`} key={category.id} onClick={() => setFilter(category.name)}>{category.name}</button>)}<button className="btn btn-ghost" onClick={() => setCategoryModal(true)}><Plus size={16}/>Nova categoria</button></div>
    {message && <div className="card inline-message" role="alert">{message}</div>}
    <section className="section">{loading ? <div className="empty">Carregando…</div> : filtered.length ? <div className="grid">{filtered.map((item) => <article key={item.id} className="card clothing-card"><button aria-label={item.is_favorite ? 'Desfavoritar' : 'Favoritar'} className="favorite-btn" onClick={() => toggleFavorite(item)}><Heart size={17} fill={item.is_favorite ? 'currentColor' : 'none'} /></button><div className="clothing-image">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt={item.name}/> : <div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{item.clothing_categories?.name || 'Sem categoria'}{item.color ? ` · ${item.color}` : ''}</div><div className="inline-actions" style={{marginTop:8}}><button className="btn btn-soft" onClick={() => setEditing(item)}>Editar</button><button className="btn btn-danger" onClick={() => setDeleting(item)}>Excluir</button></div></div></article>)}</div> : <div className="empty"><Shirt className="empty-icon"/><h3 className="empty-title">Seu guarda-roupa ainda está vazio.</h3><p className="empty-copy">Cadastre sua primeira peça com uma foto.</p><button className="btn btn-soft" onClick={startAdd}>Adicionar minha primeira peça</button></div>}</section>

    {adding && <Modal title={camera ? 'Tirar foto' : photo ? 'Confirmar foto' : 'Adicionar peça'} onClose={closeAdd} wide>{camera ? <CameraCapture onUse={(file) => { setPhoto(file); setCamera(false); }} onCancel={() => setCamera(false)} /> : photo ? <><div className="photo-confirm"><img src={photoUrl || ''} alt="Prévia da foto da peça" /></div><div className="inline-actions" style={{marginTop:12}}><button type="button" className="btn btn-soft" onClick={() => setCamera(true)}>Tirar outra</button><button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={17}/>Escolher outra</button></div><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPhoto(file); }} /><ClothingForm onSubmit={addClothing} categories={availableCategories} submitLabel="Salvar peça" busy={busy} /></> : <><div className="camera-source-grid"><button className="btn btn-soft" onClick={() => setCamera(true)}><Camera size={18}/>Tirar foto</button><button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={18}/>Escolher da galeria</button></div><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPhoto(file); }} /></>}</Modal>}
    {editing && <Modal title="Editar peça" onClose={() => setEditing(null)} wide><ClothingForm initial={editing} onSubmit={saveEdit} categories={availableCategories} submitLabel="Salvar alterações" busy={busy} /></Modal>}
    {deleting && <ConfirmModal title="Excluir peça?" message="Esta ação não poderá ser desfeita." confirmLabel="Excluir" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} busy={busy}/>} 
    {categoryModal && <Modal title="Nova categoria" onClose={() => setCategoryModal(false)}><form className="auth-form" onSubmit={createCategory}><div className="field"><label className="label">Nome da categoria</label><input className="input" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} maxLength={40} required /></div><div className="modal-actions inline-actions"><button type="button" className="btn btn-ghost" onClick={() => setCategoryModal(false)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>Criar categoria</button></div></form></Modal>}
  </>;
}

function ClothingForm({ initial, onSubmit, categories, submitLabel, busy }: { initial?: ClothingItem; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; categories: any[]; submitLabel: string; busy: boolean }) {
  return <form onSubmit={onSubmit} style={{marginTop:16}}><div className="form-grid"><div className="field"><label className="label">Nome</label><input className="input" name="name" defaultValue={initial?.name || ''} required /></div><div className="field"><label className="label">Categoria</label><select className="select" name="category_id" defaultValue={initial?.category_id || ''}><option value="">Selecionar</option>{categories.map((category: any) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div><div className="field"><label className="label">Subcategoria</label><input className="input" name="subcategory" defaultValue={initial?.subcategory || ''}/></div><div className="field"><label className="label">Cor</label><input className="input" name="color" defaultValue={initial?.color || ''}/></div><div className="field"><label className="label">Tamanho</label><input className="input" name="size" defaultValue={initial?.size || ''}/></div><div className="field"><label className="label">Marca</label><input className="input" name="brand" defaultValue={initial?.brand || ''}/></div><div className="field"><label className="label">Ocasião</label><input className="input" name="occasion" defaultValue={initial?.occasion || ''}/></div><div className="field"><label className="label">Estação</label><input className="input" name="season" defaultValue={initial?.season || ''}/></div><div className="field full"><label className="label">Observações</label><textarea className="textarea" name="notes" defaultValue={initial?.notes || ''}/></div></div><label className="check-row"><input type="checkbox" name="is_favorite" defaultChecked={Boolean(initial?.is_favorite)}/><Heart size={17}/> Favorito</label><button className="btn btn-primary" style={{width:'100%',marginTop:16}} disabled={busy}>{busy ? 'Salvando…' : submitLabel}</button></form>;
}
