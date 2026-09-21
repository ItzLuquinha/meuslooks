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
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    setUsers(data.users || []);
    setSelected(data.selected || '');
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function selectUser(value: string) {
    setSelected(value);
    if (!value) return;
    const response = await fetch('/api/admin/target', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: value }) });
    if (response.ok) window.location.reload();
    else void load();
  }

  return <div className="admin-target-bar"><div className="admin-target-label"><UserRound size={17}/><span>Usuária selecionada</span></div><select className="select admin-target-select" value={selected} onChange={(event) => void selectUser(event.target.value)} disabled={loading || !users.length}><option value="">{loading ? 'Carregando…' : users.length ? 'Selecione uma usuária' : 'Nenhuma usuária cadastrada'}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></div>;
}
