"use client";
import Link from 'next/link';
import { FolderHeart, MessageCircle, Shirt, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminDashboard(){
  const [data,setData]=useState<any>(null);
  useEffect(()=>{fetch('/api/admin/summary',{cache:'no-store'}).then(r=>r.json()).then(setData)},[]);
  const selected=data?.user;
  return <><h1 className="page-title">Visão geral</h1><p className="page-subtitle">Controle do aplicativo e da conta selecionada.</p>{!selected?<div className="card empty admin-select-empty"><UserRound className="empty-icon"/><h3 className="empty-title">Selecione uma usuária</h3><p className="empty-copy">Use o seletor acima para escolher qual conta será administrada.</p><Link className="btn btn-soft" href="/admin/usuaria">Abrir administração da usuária</Link></div>:<div className="admin-grid section"><div className="card stat-card"><div className="stat-label">Nome</div><div className="stat-value">{selected.name}</div></div><div className="card stat-card"><div className="stat-label">Roupas</div><div className="stat-value">{data.counts?.clothing??0}</div></div><div className="card stat-card"><div className="stat-label">Looks</div><div className="stat-value">{data.counts?.outfits??0}</div></div><div className="card stat-card"><div className="stat-label">Conta</div><div className="stat-value" style={{fontSize:24}}>{selected.is_blocked?'Bloqueada':'Ativa'}</div></div></div>}
  <section className="section"><div className="card form-card"><strong>Atalhos</strong><div className="inline-actions" style={{marginTop:14}}><Link className="btn btn-soft" href="/admin/usuaria"><UserRound size={16}/>Administrar conta</Link><Link className="btn btn-ghost" href="/admin/guarda-roupa"><Shirt size={16}/>Administrar roupas</Link><Link className="btn btn-ghost" href="/admin/looks"><FolderHeart size={16}/>Administrar looks</Link><Link className="btn btn-ghost" href="/admin/mensagens"><MessageCircle size={16}/>Mensagem inicial</Link></div></div></section></>;
}
