"use client";
import { useMemo, useState } from 'react';
import { Heart, Save, Shirt } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export type OutfitEditorItem = {
  id: string;
  name: string;
  image_path?: string | null;
  clothing_categories?: { id?: string; name?: string | null } | null;
};

export type OutfitEditorValue = {
  id?: string;
  name: string;
  occasion?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  is_day_look?: boolean;
  outfit_items?: Array<{ clothing_item_id: string; clothing_items?: OutfitEditorItem | null }>;
};

const GROUPS = [
  { key: 'Parte de cima', words: ['camiseta', 'blusa', 'camisa', 'cropped'] },
  { key: 'Parte de baixo', words: ['saia', 'short', 'calça', 'jeans'] },
  { key: 'Terceira peça', words: ['casaco', 'jaqueta', 'moletom'] },
  { key: 'Roupa íntima', words: ['íntima', 'lingerie', 'sutiã', 'calcinha', 'meia', 'pijama'] },
  { key: 'Sapato', words: ['sapato', 'tênis', 'sandália', 'bota'] },
  { key: 'Bolsa', words: ['bolsa'] },
  { key: 'Acessório', words: ['acessório'] },
  { key: 'Outros', words: [] },
];

function groupFor(item: OutfitEditorItem) {
  const category = (item.clothing_categories?.name || '').toLocaleLowerCase('pt-BR');
  return GROUPS.find((group) => group.words.some((word) => category.includes(word)))?.key || 'Outros';
}

export default function OutfitEditor({ initial, items, onSave, onCancel, saving = false }: { initial: OutfitEditorValue; items: OutfitEditorItem[]; onSave: (value: { name: string; occasion: string; notes: string; is_favorite: boolean; is_day_look: boolean; item_ids: string[] }) => void; onCancel?: () => void; saving?: boolean }) {
  const [name, setName] = useState(initial.name || 'Look de hoje');
  const [occasion, setOccasion] = useState(initial.occasion || '');
  const [notes, setNotes] = useState(initial.notes || '');
  const [favorite, setFavorite] = useState(Boolean(initial.is_favorite));
  const [dayLook, setDayLook] = useState(Boolean(initial.is_day_look));
  const initialIds = (initial.outfit_items || []).map((item) => item.clothing_item_id);
  const [selected, setSelected] = useState<string[]>(initialIds);
  const grouped = useMemo(() => GROUPS.map((group) => ({ ...group, items: items.filter((item) => groupFor(item) === group.key) })).filter((group) => group.items.length), [items]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length >= 12 ? current : [...current, id]);
  }

  const selectedItems = items.filter((item) => selected.includes(item.id));

  return (
    <div className="outfit-editor">
      <div className="form-grid">
        <div className="field"><label className="label">Nome do look</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label className="label">Ocasião</label><input className="input" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Ex.: sair, trabalho, jantar" /></div>
        <div className="field full"><label className="label">Observações</label><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>

      <div className="section compact-section">
        <div className="section-head"><div><h3 className="section-title">Peças escolhidas</h3><p className="page-subtitle">{selected.length}/12 peças selecionadas.</p></div></div>
        {selectedItems.length ? <div className="grid outfit-selected-grid">{selectedItems.map((item) => <article className="card clothing-card" key={item.id}><div className="clothing-image">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt={item.name} /> : <div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{item.clothing_categories?.name || 'Sem categoria'}</div></div></article>)}</div> : <div className="empty">Nenhuma peça selecionada ainda.</div>}
      </div>

      <div className="section compact-section">
        <div className="section-head"><div><h3 className="section-title">Escolher peças</h3><p className="page-subtitle">Você não precisa preencher todas as funções.</p></div></div>
        <div className="outfit-groups">
          {grouped.map((group) => <div className="outfit-group" key={group.key}><h4>{group.key}</h4><div className="grid">{group.items.map((item) => <button type="button" key={item.id} className={`card pick-card${selected.includes(item.id) ? ' selected' : ''}`} onClick={() => toggle(item.id)}><div className="clothing-image">{item.image_path ? <img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt="" /> : <div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{selected.includes(item.id) ? 'Selecionada' : 'Toque para selecionar'}</div></div></button>)}</div></div>)}
        </div>
      </div>

      <label className="check-row"><input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} /><Heart size={17} /> Favoritar look</label>
      <label className="check-row"><input type="checkbox" checked={dayLook} onChange={(e) => setDayLook(e.target.checked)} /> Usar como Look do Dia</label>
      <div className="inline-actions modal-actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>}
        <button type="button" className="btn btn-primary" onClick={() => onSave({ name: name.trim(), occasion: occasion.trim(), notes: notes.trim(), is_favorite: favorite, is_day_look: dayLook, item_ids: selected })} disabled={saving || !name.trim() || !selected.length}><Save size={17}/>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </div>
  );
}
