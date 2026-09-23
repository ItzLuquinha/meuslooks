"use client";

import { useMemo, useState } from 'react';
import { Heart, Save, Shirt, X } from 'lucide-react';
import type { Category } from '@/lib/types';

export type OutfitEditorItem = {
  id: string;
  name: string;
  image_path?: string | null;
  clothing_categories?: Category | Category[] | null;
};

export type OutfitEditorItemLink = {
  clothing_item_id: string;
  clothing_items?: OutfitEditorItem | null;
};

export type OutfitEditorValue = {
  id?: string;
  name: string;
  occasion?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  is_day_look?: boolean;
  outfit_items?: OutfitEditorItemLink[];
};

export type OutfitSaveValue = {
  name: string;
  occasion: string;
  notes: string;
  is_favorite: boolean;
  is_day_look: boolean;
  item_ids: string[];
};

const GROUPS = [
  { key: 'Parte de cima', words: ['camiseta', 'blusa', 'camisa', 'cropped'] },
  { key: 'Parte de baixo', words: ['saia', 'short', 'calça', 'jeans'] },
  { key: 'Terceira peça', words: ['casaco', 'jaqueta', 'moletom'] },
  { key: 'Sapatos', words: ['sapato', 'tênis', 'sandália', 'bota'] },
  { key: 'Bolsas', words: ['bolsa'] },
  { key: 'Acessórios', words: ['acessório'] },
  { key: 'Outros', words: [] },
] as const;

function categoryName(value: OutfitEditorItem['clothing_categories']) {
  if (!value) return 'Sem categoria';
  return Array.isArray(value) ? value[0]?.name || 'Sem categoria' : value.name;
}

function groupFor(item: OutfitEditorItem) {
  const name = categoryName(item.clothing_categories).toLocaleLowerCase('pt-BR');
  return GROUPS.find((group) => group.words.some((word) => name.includes(word)))?.key || 'Outros';
}

export default function OutfitEditor({ initial, items, onSave, onCancel, saving = false }: {
  initial: OutfitEditorValue;
  items: OutfitEditorItem[];
  onSave: (value: OutfitSaveValue) => void;
  onCancel?: () => void;
  saving?: boolean;
}) {
  const [name, setName] = useState(initial.name || 'Look de hoje');
  const [occasion, setOccasion] = useState(initial.occasion || '');
  const [notes, setNotes] = useState(initial.notes || '');
  const [favorite, setFavorite] = useState(Boolean(initial.is_favorite));
  const [dayLook, setDayLook] = useState(Boolean(initial.is_day_look));
  const [selected, setSelected] = useState<string[]>(() => (initial.outfit_items || []).map((item) => item.clothing_item_id));
  const grouped = useMemo(() => GROUPS.map((group) => ({ ...group, items: items.filter((item) => groupFor(item) === group.key) })).filter((group) => group.items.length), [items]);
  const selectedItems = items.filter((item) => selected.includes(item.id));

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length >= 12 ? current : [...current, id]);
  }

  return (
    <div className="outfit-editor">
      <div className="form-grid">
        <div className="field"><label className="label">Nome do look</label><input className="input" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></div>
        <div className="field"><label className="label">Ocasião</label><input className="input" value={occasion} onChange={(event) => setOccasion(event.target.value)} maxLength={80} placeholder="Ex.: jantar, trabalho, passeio" /></div>
        <div className="field full"><label className="label">Observações</label><textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></div>
      </div>

      <section className="section compact-section">
        <div className="section-head"><div><h3 className="section-title">Prévia do look</h3><p className="page-subtitle">{selected.length}/12 peças selecionadas.</p></div></div>
        {selectedItems.length ? <div className="grid outfit-selected-grid">{selectedItems.map((item) => <article className="card clothing-card selected-piece" key={item.id}><button type="button" className="favorite-btn" aria-label={`Remover ${item.name}`} onClick={() => toggle(item.id)}><X size={16}/></button><div className="clothing-image">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt={item.name}/> : <div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{categoryName(item.clothing_categories)}</div></div></article>)}</div> : <div className="empty">Nenhuma peça selecionada ainda.</div>}
      </section>

      <section className="section compact-section">
        <div className="section-head"><div><h3 className="section-title">Peças do look</h3><p className="page-subtitle">As categorias abaixo são apenas uma forma de organizar as peças que já existem no guarda-roupa.</p></div></div>
        <div className="outfit-groups">
          {grouped.map((group) => <section className="outfit-group" key={group.key}><h4>{group.key}</h4><div className="grid">{group.items.map((item) => { const picked = selected.includes(item.id); return <button type="button" key={item.id} className={`card pick-card${picked ? ' selected' : ''}`} onClick={() => toggle(item.id)} aria-pressed={picked}>{picked && <span className="pick-selection-mark" aria-hidden="true">✓</span>}<div className="clothing-image">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt=""/> : <div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{categoryName(item.clothing_categories)} · {picked ? 'Selecionada' : 'Selecionar'}</div></div></button>; })}</div></section>)}
        </div>
      </section>

      <label className={`check-row favorite-check-row${favorite ? ' checked' : ''}`}><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)}/><Heart size={17} fill={favorite ? 'currentColor' : 'none'}/> Favoritar look</label>
      <label className="check-row"><input type="checkbox" checked={dayLook} onChange={(event) => setDayLook(event.target.checked)}/> Usar como Look do Dia</label>
      <div className="inline-actions modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={() => onSave({ name: name.trim(), occasion: occasion.trim(), notes: notes.trim(), is_favorite: favorite, is_day_look: dayLook, item_ids: selected })} disabled={saving || !name.trim() || !selected.length}><Save size={17}/>{saving ? 'Salvando…' : 'Salvar look'}</button>
      </div>
    </div>
  );
}
