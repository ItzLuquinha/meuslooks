"use client";

import { useEffect, useState } from 'react';
import { Heart, Shirt, Trash2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import OutfitEditor, { type OutfitEditorItem, type OutfitSaveValue } from '@/components/outfits/OutfitEditor';
import { useToast } from '@/components/ui/ToastProvider';

type FavoriteItem = { id: string; name: string; image_path: string | null; is_favorite: boolean; clothing_categories?: { id: string; name: string } | null };
type FavoriteOutfit = OutfitSaveValue & { id: string; is_favorite: boolean };

type Data = { items: FavoriteItem[]; outfits: FavoriteOutfit[] };

export default function FavoritesClient() {
  const [data, setData] = useState<Data>({ items: [], outfits: [] });
  const [items, setItems] = useState<OutfitEditorItem[]>([]);
  const [editing, setEditing] = useState<FavoriteOutfit | null>(null);
  const [deleting, setDeleting] = useState<FavoriteOutfit | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  async function load() {
    setMessage('');
    const [favoriteResponse, clothingResponse] = await Promise.all([fetch('/api/favorites', { cache: 'no-store' }), fetch('/api/clothing', { cache: 'no-store' })]);
    const favorite = await favoriteResponse.json().catch(() => ({}));
    const clothing = await clothingResponse.json().catch(() => ({}));
    if (!favoriteResponse.ok) {
      setMessage(favorite.error || 'Não foi possível carregar os favoritos.');
      return;
    }
    setData({ items: favorite.items || [], outfits: favorite.outfits || [] });
    setItems(clothing.items || []);
  }
  useEffect(() => { void load(); }, []);

  async function toggleItem(item: FavoriteItem) {
    setBusy(true);
    const response = await fetch(`/api/clothing/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_favorite: false }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setData((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }));
      showToast('Favorito atualizado', 'success');
    } else showToast(body.error || 'Não foi possível atualizar o favorito.', 'error');
    setBusy(false);
  }

  async function saveOutfit(value: OutfitSaveValue) {
    if (!editing) return;
    setBusy(true);
    const response = await fetch(`/api/outfits/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setEditing(null);
      await load();
      showToast('Look atualizado', 'success');
    } else showToast(body.error || 'Não foi possível atualizar o look.', 'error');
    setBusy(false);
  }

  async function deleteOutfit() {
    if (!deleting) return;
    setBusy(true);
    const response = await fetch(`/api/outfits/${deleting.id}`, { method: 'DELETE' });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setData((current) => ({ ...current, outfits: current.outfits.filter((entry) => entry.id !== deleting.id) }));
      setDeleting(null);
      showToast('Look excluído', 'success');
    } else showToast(body.error || 'Não foi possível excluir o look.', 'error');
    setBusy(false);
  }

  return (
    <>
      <PageHeader />
      <div className="section-head"><div><h1 className="page-title">Favoritos</h1><p className="page-subtitle">As peças e os looks que você marcou para encontrar depois.</p></div></div>
      {message && <div className="card inline-message" role="alert">{message}</div>}
      <section className="section">
        <div className="section-head"><h2 className="section-title">Peças favoritas</h2></div>
        {data.items.length ? <div className="grid">{data.items.map((item) => <article className="card clothing-card" key={item.id}><button className="favorite-btn" aria-label="Desfavoritar" onClick={() => void toggleItem(item)} disabled={busy}><Heart size={17} fill="currentColor"/></button><div className="clothing-image">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt={item.name} loading="lazy" decoding="async"/> : <div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{item.clothing_categories?.name || 'Sem categoria'}</div></div></article>)}</div> : <div className="empty"><Heart className="empty-icon"/><h3 className="empty-title">Nenhuma peça favorita.</h3><p className="empty-copy">Marque uma peça com o coração para ela aparecer aqui.</p></div>}
      </section>
      <section className="section">
        <div className="section-head"><h2 className="section-title">Looks favoritos</h2></div>
        {data.outfits.length ? <div className="grid">{data.outfits.map((outfit) => <article className="card outfit-card" key={outfit.id}><div className="outfit-preview">{(outfit.outfit_items || []).slice(0,3).map((item) => item.clothing_items?.image_path ? <img key={item.clothing_item_id} src={`/api/media?path=${encodeURIComponent(item.clothing_items.image_path)}`} alt=""/> : null)}{!(outfit.outfit_items || []).length && <div className="outfit-placeholder"><Shirt/></div>}</div><div className="outfit-info"><div className="outfit-title">{outfit.name}</div><div className="outfit-meta">{outfit.occasion || 'Sem ocasião'}</div><div className="inline-actions" style={{marginTop:10}}><button className="btn btn-soft" onClick={() => setEditing(outfit)}>Editar</button><button className="btn btn-danger" onClick={() => setDeleting(outfit)}><Trash2 size={15}/>Excluir</button></div></div></article>)}</div> : <div className="empty"><Heart className="empty-icon"/><h3 className="empty-title">Nenhum look favorito.</h3><p className="empty-copy">Marque um look como favorito para mantê-lo por perto.</p></div>}
      </section>
      {editing && <Modal title="Editar look" onClose={() => setEditing(null)} wide><OutfitEditor initial={editing} items={items} onSave={(value) => void saveOutfit(value)} onCancel={() => setEditing(null)} saving={busy}/></Modal>}
      {deleting && <ConfirmModal title="Excluir look?" message="A composição será removida e esta ação não poderá ser desfeita." confirmLabel="Excluir look" onConfirm={() => void deleteOutfit()} onCancel={() => setDeleting(null)} busy={busy}/>} 
    </>
  );
}
