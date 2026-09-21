"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AuthShell from './AuthShell';

export default function LoginForm() {
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); const supabase=createClient();
   const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   if(response.ok){ window.location.href='/admin'; return; }
   const {error: userError}=await supabase.auth.signInWithPassword({email,password});
   if(!userError){ window.location.href='/inicio'; return; }
   setError('E-mail ou senha incorretos.'); setBusy(false);
 }
 return <AuthShell title="Entrar" subtitle="Seu cantinho para organizar roupas e looks." linkText="Criar minha conta" linkHref="/cadastro"><form className="auth-form" onSubmit={submit}><div className="field"><label className="label">E-mail</label><input className="input" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label className="label">Senha</label><input className="input" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<p className="card-copy" role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy?'Entrando…':'Entrar'}</button></form></AuthShell>
}
