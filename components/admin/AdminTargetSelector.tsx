"use client";
import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';

type AdminUser = { id: string; name: string; email: string; is_blocked: boolean };

export default function AdminTargetSelector() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as usuárias.');
      setUsers(Array.isArray(data.users) ? data.users : []);
      setSelected(typeof data.selected === 'string' ? data.selected : '');
    } catch {
      setUsers([]);
      setSelected('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function selectUser(value: string) {
    setSelected(value);
    if (!value) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/target', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: value }) });
      if (!response.ok) throw new Error('Não foi possível selecionar a usuária.');
      window.location.reload();
    } catch {
      await load();
    }
  }

  return <div className="admin-target-bar"><div className="admin-target-label"><UserRound size={17}/><span>Usuária selecionada</span></div><select className="select admin-target-select" value={selected} onChange={(event) => void selectUser(event.target.value)} disabled={loading || !users.length}><option value="">{loading ? 'Carregando…' : users.length ? 'Selecione uma usuária' : 'Nenhuma usuária cadastrada'}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></div>;
}
