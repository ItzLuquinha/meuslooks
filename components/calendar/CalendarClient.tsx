"use client";
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Check, Shirt, Trash2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';

type Outfit = { id: string; name: string; occasion?: string | null; outfit_items?: any[] };
type Entry = { id: string; outfit_id: string; worn_on: string; note?: string | null; outfits?: Outfit | null };
const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const weekdays = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }

export default function CalendarClient() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;
  async function load() {
    setMessage('');
    const [calendarResponse, outfitsResponse] = await Promise.all([fetch(`/api/calendar?month=${monthKey}`, { cache: 'no-store' }), fetch('/api/outfits', { cache: 'no-store' })]);
    const calendarData = await calendarResponse.json().catch(() => ({}));
    const outfitsData = await outfitsResponse.json().catch(() => ({}));
    setEntries(calendarData.entries || []); setOutfits(outfitsData.outfits || []);
    if (calendarData.error) setMessage(calendarData.error);
  }
  useEffect(() => { void load(); }, [monthKey]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({length: days}, (_, i) => i+1)];
  }, [cursor]);
  const byDate = new Map(entries.map((entry) => [entry.worn_on, entry]));
  const selectedEntry = entries.find((entry) => entry.id === selected) || null;

  async function addWear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/calendar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ outfit_id: form.get('outfit_id'), worn_on: form.get('worn_on'), note: form.get('note') }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(data.error || 'Não foi possível registrar o look.'); else { setAdding(false); await load(); }
    setBusy(false);
  }
  async function removeEntry() {
    if (!selectedEntry) return;
    setBusy(true);
    const response = await fetch('/api/calendar', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:selectedEntry.id}) });
    if (response.ok) { setSelected(null); await load(); } else { const data = await response.json().catch(() => ({})); setMessage(data.error || 'Não foi possível remover.'); }
    setBusy(false);
  }
  const todayKey = localDateKey(today);
  const selectedDate = selectedEntry ? new Date(`${selectedEntry.worn_on}T12:00:00`) : null;
  const defaultDate = selected || todayKey;

  return <>
    <PageHeader />
    <div className="section-head calendar-head"><div><h1 className="page-title">Calendário</h1><p className="page-subtitle">Registre os looks que você usou e veja seu histórico.</p></div><button className="btn btn-primary" onClick={() => { setMessage(''); setAdding(true); }}><CalendarDays size={17}/>Registrar look</button></div>
    {message && <div className="card inline-message" role="alert">{message}</div>}
    <section className="section calendar-layout">
      <div className="card calendar-card">
        <div className="calendar-toolbar"><button className="icon-btn" aria-label="Mês anterior" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}><ChevronLeft size={18}/></button><div><h2 className="calendar-month">{months[cursor.getMonth()]}</h2><span>{cursor.getFullYear()}</span></div><button className="icon-btn" aria-label="Próximo mês" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}><ChevronRight size={18}/></button></div>
        <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{cells.map((day, index) => { if (!day) return <div key={`empty-${index}`} className="calendar-cell empty-cell"/>; const key = `${monthKey}-${String(day).padStart(2,'0')}`; const entry = byDate.get(key); const isToday = key === todayKey; return <button key={key} className={`calendar-cell ${isToday ? 'today' : ''} ${selected === key || selected === entry?.id ? 'selected' : ''} ${entry ? 'has-look' : ''}`} onClick={() => entry ? setSelected(entry.id) : (setSelected(key), setAdding(true))}><span className="calendar-day-number">{day}</span>{entry ? <><span className="calendar-look-dot"/><span className="calendar-look-name">{entry.outfits?.name || 'Look'}</span></> : <span className="calendar-add">+</span>}</button>; })}</div>
      </div>
      <aside className="card calendar-side">
        {selectedEntry ? <><span className="card-kicker">{selectedDate ? selectedDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}) : 'Look usado'}</span><h2 className="card-title">{selectedEntry.outfits?.name || 'Look'}</h2><p className="page-subtitle">{selectedEntry.outfits?.occasion || 'Sem ocasião'}</p><div className="calendar-side-preview">{(selectedEntry.outfits?.outfit_items || []).slice(0,4).map((item:any) => item.clothing_items?.image_path ? <img key={item.clothing_item_id} src={`/api/media?path=${encodeURIComponent(item.clothing_items.image_path)}`} alt={item.clothing_items.name || ''}/> : <div key={item.clothing_item_id} className="placeholder-art"><Shirt size={20}/></div>)}</div>{selectedEntry.note && <p className="calendar-note">{selectedEntry.note}</p>}<button className="btn btn-danger" onClick={() => void removeEntry()} disabled={busy}><Trash2 size={15}/>Remover registro</button></> : <div className="empty calendar-empty"><Check className="empty-icon"/><h3 className="empty-title">Escolha um dia</h3><p className="empty-copy">Dias com um pequeno marcador já têm um look registrado. Toque em qualquer outro dia para adicionar um.</p></div>}
      </aside>
    </section>
    {adding && <Modal title="Registrar look usado" onClose={() => setAdding(false)}><form className="auth-form" onSubmit={addWear}><div className="field"><label className="label">Data</label><input className="input" type="date" name="worn_on" defaultValue={selected && selected.length === 10 ? selected : defaultDate} required/></div><div className="field"><label className="label">Look</label><select className="select" name="outfit_id" required defaultValue=""><option value="" disabled>Escolher um look</option>{outfits.map((outfit) => <option key={outfit.id} value={outfit.id}>{outfit.name}{outfit.occasion ? ` · ${outfit.occasion}` : ''}</option>)}</select></div><div className="field"><label className="label">Nota (opcional)</label><textarea className="textarea" name="note" placeholder="Como foi usar esse look?" maxLength={240}/></div><div className="modal-actions inline-actions"><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Registrar'}</button></div></form></Modal>}
  </>;
}
