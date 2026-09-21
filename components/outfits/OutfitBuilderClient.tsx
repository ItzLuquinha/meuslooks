"use client";
import { useEffect, useState } from 'react';
import { Edit3, Heart, Shirt, Trash2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import OutfitEditor, { OutfitEditorItem, OutfitEditorValue } from './OutfitEditor';

type Outfit = OutfitEditorValue & { id: string };

export default function OutfitBuilderClient() {
  const [items, setItems] = useState<OutfitEditorItem[]>([]);
  const [saved, setSaved] = useState<Outfit[]>([]);
  const [editing, setEditing] = useState<Outfit | null>(null);
  const [deleting, setDeleting] = useState<Outfit | null>(null);
  const [dayLook, setDayLook] = useState<Outfit | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [clothingResponse, outfitResponse] = await Promise.all([fetch('/api/clothing', { cache: 'no-store' }), fetch('/api/outfits', { cache: 'no-store' })]);
    const clothing = await clothingResponse.json().catch(() => ({}));
    const outfits = await outfitResponse.json().catch(() => ({}));
    setItems(clothing.items || []);
    const list = outfits.outfits || [];
    setSaved(list);
    setDayLook(list.find((outfit: Outfit) => outfit.is_day_look) || null);
  }
  useEffect(() => { void load(); }, []);

  async function save(value: any, target?: Outfit) {
    setBusy(true); setMessage('');
    const response = await fetch(target ? `/api/outfits/${target.id}` : '/api/outfits', { method: target ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setCreating(false); setEditing(null); await load(); } else setMessage(data.error || 'Não foi possível salvar o look.');
    setBusy(false);
  }

  async function deleteOutfit() {
    if (!deleting) return;
    setBusy(true);
    const response = await fetch(`/api/outfits/${deleting.id}`, { method: 'DELETE' });
    if (response.ok) { setDeleting(null); await load(); } else { const data = await response.json().catch(() => ({})); setMessage(data.error || 'Não foi possível excluir o look.'); }
    setBusy(false);
  }

  async function clearDay() {
    const response = await fetch('/api/outfits/day', { method: 'DELETE' });
    if (response.ok) await load();
  }

  return <>
    <PageHeader /><div className="section-head"><div><h1 className="page-title">Look do Dia</h1><p className="page-subtitle">Monte manualmente usando as peças que você já cadastrou.</p></div><button className="btn btn-primary" onClick={() => setCreating(true)}>Criar novo look</button></div>
    {message && <div className="card inline-message" role="alert">{message}</div>}
    <section className="section"><div className="card day-look-card">{dayLook ? <><div className="section-head"><div><span className="card-kicker">Hoje</span><h2 className="card-title">{dayLook.name}</h2><p className="page-subtitle">{dayLook.occasion || 'Sem ocasião'}</p></div><button className="btn btn-ghost" onClick={() => void clearDay()}><Trash2 size={16}/>Remover do dia</button></div><div className="outfit-preview day-look-preview">{(dayLook.outfit_items || []).map((entry:any)=><img key={entry.clothing_item_id} src={entry.clothing_items?.image_path ? `/api/media?path=${encodeURIComponent(entry.clothing_items.image_path)}` : undefined} alt={entry.clothing_items?.name || ''}/>)}</div></> : <div className="empty"><Shirt className="empty-icon"/><h3 className="empty-title">Nenhum Look do Dia escolhido.</h3><p className="empty-copy">Crie ou edite um look e marque a opção “Usar como Look do Dia”.</p><button className="btn btn-soft" onClick={() => setCreating(true)}>Montar Look do Dia</button></div>}</div></section>
    <section className="section"><div className="section-head"><div><h2 className="section-title">Seus looks salvos</h2><p className="page-subtitle">Edite a composição, troque peças ou altere os detalhes.</p></div></div>{saved.length ? <div className="grid">{saved.map((outfit) => <article className="card outfit-card" key={outfit.id}><div className="outfit-preview">{(outfit.outfit_items || []).slice(0,3).map((entry:any)=><img key={entry.clothing_item_id} src={entry.clothing_items?.image_path ? `/api/media?path=${encodeURIComponent(entry.clothing_items.image_path)}` : undefined} alt=""/>)}{!(outfit.outfit_items || []).length && <div className="outfit-placeholder"><Shirt/></div>}</div><div className="outfit-info"><div className="outfit-title">{outfit.name}</div><div className="outfit-meta">{outfit.occasion || 'Sem ocasião'}{outfit.is_favorite ? ' · Favorito' : ''}{outfit.is_day_look ? ' · Look do Dia' : ''}</div><div className="inline-actions" style={{marginTop:10}}><button className="btn btn-soft" onClick={() => setEditing(outfit)}><Edit3 size={15}/>Editar</button><button className="btn btn-danger" onClick={() => setDeleting(outfit)}><Trash2 size={15}/>Excluir</button></div></div></article>)}</div> : <div className="empty"><Heart className="empty-icon"/><h3 className="empty-title">Você ainda não salvou nenhum look.</h3><p className="empty-copy">Monte uma composição com as peças que você já tem.</p><button className="btn btn-soft" onClick={() => setCreating(true)}>Criar meu primeiro look</button></div>}</section>
    {creating && <Modal title="Criar look" onClose={() => setCreating(false)} wide><OutfitEditor initial={{name:'',occasion:'',notes:'',is_favorite:false,is_day_look:true,outfit_items:[]}} items={items} onSave={(value) => void save(value)} onCancel={() => setCreating(false)} saving={busy}/></Modal>}
    {editing && <Modal title="Editar look" onClose={() => setEditing(null)} wide><OutfitEditor initial={editing} items={items} onSave={(value) => void save(value, editing)} onCancel={() => setEditing(null)} saving={busy}/></Modal>}
    {deleting && <ConfirmModal title="Excluir look?" message="A composição será removida e esta ação não poderá ser desfeita." confirmLabel="Excluir look" onConfirm={() => void deleteOutfit()} onCancel={() => setDeleting(null)} busy={busy}/>} 
  </>;
}
