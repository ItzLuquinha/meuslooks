"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Shirt, Trash2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';

type CalendarItem = { clothing_item_id: string; clothing_items?: { id: string; name: string; image_path: string | null } | null };
type Outfit = { id: string; name: string; occasion?: string | null; outfit_items?: CalendarItem[] | null };
type Entry = { id: string; outfit_id: string; worn_on: string; note?: string | null; outfits?: Outfit | Outfit[] | null };
const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekdays = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function outfitValue(value: Entry['outfits']): Outfit | null { if (!value) return null; return Array.isArray(value) ? value[0] || null : value; }

export default function CalendarClient() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  async function load() {
    const [calendarResponse, outfitsResponse] = await Promise.all([fetch(`/api/calendar?month=${monthKey}`, { cache: 'no-store' }), fetch('/api/outfits', { cache: 'no-store' })]);
    const calendarData = await calendarResponse.json().catch(() => ({}));
    const outfitsData = await outfitsResponse.json().catch(() => ({}));
    if (!calendarResponse.ok || !outfitsResponse.ok) throw new Error(calendarData.error || outfitsData.error || 'Não foi possível carregar o calendário.');
    setEntries(calendarData.entries || []);
    setOutfits(outfitsData.outfits || []);
  }

  useEffect(() => { void load().catch((error) => { const text = error instanceof Error ? error.message : 'Não foi possível carregar o calendário.'; setMessage(text); showToast(text, 'error'); }); }, [monthKey, showToast]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  }, [cursor]);

  const byDate = new Map(entries.map((entry) => [entry.worn_on, entry]));
  const selectedEntry = entries.find((entry) => entry.id === selectedId) || null;
  const todayKey = localDateKey(today);

  function openNew(date?: string) {
    setAdding(true);
    setEditing(null);
    if (date) setSelectedId(`date:${date}`);
    setMessage('');
  }

  async function submitWear(event: FormEvent<HTMLFormElement>, mode: 'create' | 'edit') {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = { outfit_id: String(form.get('outfit_id') || ''), worn_on: String(form.get('worn_on') || ''), note: String(form.get('note') || '') };
    if (mode === 'edit' && !editing) return;
    const response = await fetch('/api/calendar', { method: mode === 'edit' ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(mode === 'edit' ? { ...payload, id: editing?.id } : payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const text = data.error || 'Não foi possível salvar o registro.';
      setMessage(text);
      showToast(text, 'error');
    } else {
      setAdding(false);
      setEditing(null);
      await load();
      showToast(mode === 'edit' ? 'Registro atualizado' : 'Look registrado no calendário', 'success');
    }
    setBusy(false);
  }

  async function removeEntry() {
    if (!deleting) return;
    setBusy(true);
    const response = await fetch('/api/calendar', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: deleting.id }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) showToast(data.error || 'Não foi possível remover o registro.', 'error');
    else { setDeleting(null); setSelectedId(null); await load(); showToast('Registro removido', 'success'); }
    setBusy(false);
  }

  return (
    <>
      <PageHeader />
      <div className="section-head calendar-head"><div><h1 className="page-title">Calendário</h1><p className="page-subtitle">Registre os looks que você usou e veja seu histórico.</p></div><button className="btn btn-primary" onClick={() => openNew(todayKey)}><CalendarDays size={17}/>Registrar look</button></div>
      {message && <div className="card inline-message" role="alert">{message}</div>}

      <section className="section calendar-layout">
        <div className="card calendar-card">
          <div className="calendar-toolbar"><button className="icon-btn" aria-label="Mês anterior" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft size={18}/></button><div><h2 className="calendar-month">{months[cursor.getMonth()]}</h2><span>{cursor.getFullYear()}</span></div><button className="icon-btn" aria-label="Próximo mês" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight size={18}/></button></div>
          <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="calendar-cell empty-cell"/>;
              const key = `${monthKey}-${String(day).padStart(2, '0')}`;
              const entry = byDate.get(key);
              const isToday = key === todayKey;
              return <button key={key} type="button" className={`calendar-cell ${isToday ? 'today' : ''} ${selectedId === key || selectedId === entry?.id ? 'selected' : ''} ${entry ? 'has-look' : ''}`} onClick={() => entry ? setSelectedId(entry.id) : openNew(key)}><span className="calendar-day-number">{day}</span>{entry ? <><span className="calendar-look-dot"/><span className="calendar-look-name">{outfitValue(entry.outfits)?.name || 'Look'}</span></> : <span className="calendar-add">+</span>}</button>;
            })}
          </div>
        </div>

        <aside className="card calendar-side">
          {selectedEntry ? <CalendarDetail entry={selectedEntry} onEdit={() => { setEditing(selectedEntry); setAdding(true); }} onDelete={() => setDeleting(selectedEntry)} busy={busy}/> : <div className="empty calendar-empty"><Check className="empty-icon"/><h3 className="empty-title">Escolha um dia</h3><p className="empty-copy">Dias marcados já têm um look registrado. Toque em outro dia para adicionar um.</p></div>}
        </aside>
      </section>

      {adding && <CalendarForm entry={editing} outfits={outfits} onSubmit={(event) => void submitWear(event, editing ? 'edit' : 'create')} onCancel={() => { setAdding(false); setEditing(null); }} busy={busy} defaultDate={selectedId?.startsWith('date:') ? selectedId.slice(5) : editing?.worn_on || todayKey}/>} 
      {deleting && <ConfirmModal title="Remover registro?" message="O registro do calendário e o uso dessas peças nessa data serão removidos." confirmLabel="Remover" onConfirm={() => void removeEntry()} onCancel={() => setDeleting(null)} busy={busy}/>} 
    </>
  );
}

function CalendarDetail({ entry, onEdit, onDelete, busy }: { entry: Entry; onEdit: () => void; onDelete: () => void; busy: boolean }) {
  const outfit = outfitValue(entry.outfits);
  const selectedDate = new Date(`${entry.worn_on}T12:00:00`);
  return <><span className="card-kicker">{selectedDate.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}</span><h2 className="card-title">{outfit?.name || 'Look'}</h2><p className="page-subtitle">{outfit?.occasion || 'Sem ocasião'}</p><div className="calendar-side-preview">{(outfit?.outfit_items || []).slice(0,4).map((item) => item.clothing_items?.image_path ? <img key={item.clothing_item_id} src={`/api/media?path=${encodeURIComponent(item.clothing_items.image_path)}`} alt={item.clothing_items.name || ''}/> : <div key={item.clothing_item_id} className="placeholder-art"><Shirt size={20}/></div>)}</div>{entry.note && <p className="calendar-note">{entry.note}</p>}<div className="inline-actions calendar-detail-actions"><button className="btn btn-soft" onClick={onEdit} disabled={busy}>Editar</button><button className="btn btn-danger" onClick={onDelete} disabled={busy}><Trash2 size={15}/>Remover</button></div></>;
}

function CalendarForm({ entry, outfits, onSubmit, onCancel, busy, defaultDate }: { entry: Entry | null; outfits: Outfit[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; busy: boolean; defaultDate: string }) {
  const currentOutfit = outfitValue(entry?.outfits)?.id || entry?.outfit_id || '';
  return <Modal title={entry ? 'Editar registro' : 'Registrar look usado'} onClose={onCancel}><form className="auth-form" onSubmit={onSubmit}><div className="field"><label className="label">Data</label><input className="input" type="date" name="worn_on" defaultValue={defaultDate} required/></div><div className="field"><label className="label">Look</label><select className="select" name="outfit_id" required defaultValue={currentOutfit}><option value="" disabled>Escolher um look</option>{outfits.map((outfit) => <option key={outfit.id} value={outfit.id}>{outfit.name}{outfit.occasion ? ` · ${outfit.occasion}` : ''}</option>)}</select></div><div className="field"><label className="label">Nota (opcional)</label><textarea className="textarea" name="note" defaultValue={entry?.note || ''} placeholder="Como foi usar esse look?" maxLength={240}/></div><div className="modal-actions inline-actions"><button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : entry ? 'Salvar alterações' : 'Registrar'}</button></div></form></Modal>;
}
