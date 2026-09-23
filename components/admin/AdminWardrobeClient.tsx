"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Edit3, Heart, Plus, Shirt, Trash2, Upload } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/ToastProvider';
import type { Category, Profile } from '@/lib/types';

type Item = {
  id: string;
  name: string;
  category_id: string | null;
  subcategory: string | null;
  color: string | null;
  size: string | null;
  brand: string | null;
  occasion: string | null;
  season: string | null;
  notes: string | null;
  image_path: string | null;
  is_favorite: boolean;
  clothing_categories?: Category | Category[] | null;
};
type FormState = { name: string; category_id: string; subcategory: string; color: string; size: string; brand: string; occasion: string; season: string; notes: string; is_favorite: boolean };
type SelectedUser = Pick<Profile, 'id' | 'name' | 'email'>;
const EMPTY_FORM: FormState = { name:'', category_id:'', subcategory:'', color:'', size:'', brand:'', occasion:'', season:'', notes:'', is_favorite:false };

function categoryName(value: Item['clothing_categories']) { return Array.isArray(value) ? value[0]?.name || 'Sem categoria' : value?.name || 'Sem categoria'; }

export default function AdminWardrobeClient() {
  const [items,setItems]=useState<Item[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [user,setUser]=useState<SelectedUser|null>(null);
  const [edit,setEdit]=useState<Item|null>(null);
  const [remove,setRemove]=useState<Item|null>(null);
  const [addOpen,setAddOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [add,setAdd]=useState<FormState>(EMPTY_FORM);
  const fileRef=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null);
  const { showToast } = useToast();

  async function load(){
    const response=await fetch('/api/admin/wardrobe',{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(response.ok){setItems(data.items||[]);setCategories(data.categories||[]);setUser(data.user||null);}
    else {const text=data.error||'Selecione uma usuária.';setMessage(text);showToast(text,'error');}
  }
  useEffect(()=>{void load()},[showToast]);
  const addPreview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
  useEffect(()=>()=>{if(addPreview)URL.revokeObjectURL(addPreview)},[addPreview]);

  function closeAdd(){setAddOpen(false);setAdd(EMPTY_FORM);setFile(null);if(fileRef.current)fileRef.current.value='';}

  async function submitAdd(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!add.name.trim()) return;
    setBusy(true); setMessage('');
    const body=new FormData();
    for(const [key,value] of Object.entries(add)) body.set(key,key==='is_favorite'?(value?'true':'false'):String(value));
    body.set('favorite',add.is_favorite?'true':'false');
    if(file)body.set('image',file);
    const response=await fetch('/api/admin/wardrobe',{method:'POST',body});
    const data=await response.json().catch(()=>({}));
    if(response.ok){closeAdd();await load();showToast('Peça adicionada','success');}
    else{const text=data.error||'Não foi possível adicionar a peça.';setMessage(text);showToast(text,'error');}
    setBusy(false);
  }

  async function submitEdit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!edit)return;
    setBusy(true);
    const form=new FormData(event.currentTarget); const payload=Object.fromEntries(form.entries());
    const response=await fetch(`/api/admin/wardrobe/${edit.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,category_id:String(payload.category_id||'')||null,is_favorite:form.get('is_favorite')==='on'})});
    const data=await response.json().catch(()=>({}));
    if(response.ok){setEdit(null);await load();showToast('Peça atualizada','success');}
    else showToast(data.error||'Não foi possível atualizar a peça.','error');
    setBusy(false);
  }

  async function deleteItem(){
    if(!remove)return;
    setBusy(true);
    const response=await fetch(`/api/admin/wardrobe/${remove.id}`,{method:'DELETE'});
    const data=await response.json().catch(()=>({}));
    if(response.ok){setItems((current)=>current.filter((item)=>item.id!==remove.id));setRemove(null);showToast('Peça excluída','success');}
    else showToast(data.error||'Não foi possível excluir a peça.','error');
    setBusy(false);
  }

  return <>
    <h1 className="page-title">Guarda-Roupa</h1>
    <p className="page-subtitle">{user ? `Guarda-Roupa de ${user.name}` : 'Escolha uma usuária para continuar.'}</p>
    {message&&<div className="card inline-message" role="alert">{message}</div>}
    {user&&<>
      <div className="section-head section"><div><h2 className="section-title">Peças</h2><p className="page-subtitle">Adicione, edite ou remova roupas da conta selecionada.</p></div><button className="btn btn-primary" onClick={()=>setAddOpen(true)}><Plus size={17}/>Adicionar peça</button></div>
      <section className="section">{items.length?<div className="grid">{items.map((item)=><article key={item.id} className="card clothing-card"><button className="favorite-btn" aria-label={item.is_favorite?'Desfavoritar':'Favoritar'} onClick={()=>setEdit(item)}><Heart size={17} fill={item.is_favorite?'currentColor':'none'}/></button><div className="clothing-image">{item.image_path?<img src={`/api/media?path=${encodeURIComponent(item.image_path)}`} alt={item.name}/>:<div className="placeholder-art"><Shirt/></div>}</div><div className="clothing-info"><div className="clothing-name">{item.name}</div><div className="clothing-meta">{categoryName(item.clothing_categories)}{item.color?` · ${item.color}`:''}</div><div className="inline-actions" style={{marginTop:8}}><button className="btn btn-soft" onClick={()=>setEdit(item)}><Edit3 size={15}/>Editar</button><button className="btn btn-danger" onClick={()=>setRemove(item)}><Trash2 size={15}/>Excluir</button></div></div></article>)}</div>:<div className="empty"><Shirt className="empty-icon"/><h3 className="empty-title">Nenhuma peça cadastrada.</h3><p className="empty-copy">Adicione a primeira peça para esta usuária.</p></div>}</section>
    </>}
    {addOpen&&<Modal title="Adicionar peça" onClose={closeAdd} wide><ClothingAdminForm value={add} setValue={setAdd} categories={categories} onSubmit={submitAdd} busy={busy} fileRef={fileRef} file={file} setFile={setFile} filePreview={addPreview}/></Modal>}
    {edit&&<Modal title="Editar peça" onClose={()=>setEdit(null)} wide><EditAdminForm item={edit} categories={categories} onSubmit={submitEdit} busy={busy}/></Modal>}
    {remove&&<ConfirmModal title="Excluir peça?" message="Esta ação não poderá ser desfeita e a foto armazenada também será removida." confirmLabel="Excluir" onConfirm={()=>void deleteItem()} onCancel={()=>setRemove(null)} busy={busy}/>} 
  </>;
}

function ClothingAdminForm({value,setValue,categories,onSubmit,busy,fileRef,file,setFile,filePreview}:{value:FormState;setValue:(value:FormState)=>void;categories:Category[];onSubmit:(event:FormEvent<HTMLFormElement>)=>void;busy:boolean;fileRef:RefObject<HTMLInputElement|null>;file:File|null;setFile:(file:File|null)=>void;filePreview:string|null}){
  const field=(name:keyof Omit<FormState,'is_favorite'|'category_id'>,label:string)=><div className="field"><label className="label">{label}</label><input className="input" value={value[name]} onChange={event=>setValue({...value,[name]:event.target.value})}/></div>;
  return <form onSubmit={onSubmit}><div className="photo-upload-row"><button type="button" className="btn btn-ghost" onClick={()=>fileRef.current?.click()}><Upload size={16}/>{file?.name||'Escolher foto'}</button>{filePreview&&<div className="admin-mini-preview"><img src={filePreview} alt="Prévia"/></div>}</div><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>setFile(event.target.files?.[0]||null)}/><div className="form-grid" style={{marginTop:14}}>{field('name','Nome')}<div className="field"><label className="label">Categoria</label><select className="select" name="category_id" value={value.category_id} onChange={event=>setValue({...value,category_id:event.target.value})}><option value="">Sem categoria</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></div>{field('subcategory','Subcategoria')}{field('color','Cor')}{field('size','Tamanho')}{field('brand','Marca')}{field('occasion','Ocasião')}{field('season','Estação')}<div className="field full"><label className="label">Observações</label><textarea className="textarea" value={value.notes} onChange={event=>setValue({...value,notes:event.target.value})}/></div></div><label className="check-row"><input type="checkbox" checked={value.is_favorite} onChange={event=>setValue({...value,is_favorite:event.target.checked})}/><Heart size={17}/> Favorito</label><button className="btn btn-primary" style={{width:'100%',marginTop:16}} disabled={busy}>{busy?'Salvando…':'Salvar peça'}</button></form>;
}

function EditAdminForm({item,categories,onSubmit,busy}:{item:Item;categories:Category[];onSubmit:(event:FormEvent<HTMLFormElement>)=>void;busy:boolean}){return <form onSubmit={onSubmit}><div className="form-grid"><div className="field"><label className="label">Nome</label><input className="input" name="name" defaultValue={item.name} required/></div><div className="field"><label className="label">Categoria</label><select className="select" name="category_id" defaultValue={item.category_id||''}><option value="">Sem categoria</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="field"><label className="label">Subcategoria</label><input className="input" name="subcategory" defaultValue={item.subcategory||''}/></div><div className="field"><label className="label">Cor</label><input className="input" name="color" defaultValue={item.color||''}/></div><div className="field"><label className="label">Tamanho</label><input className="input" name="size" defaultValue={item.size||''}/></div><div className="field"><label className="label">Marca</label><input className="input" name="brand" defaultValue={item.brand||''}/></div><div className="field"><label className="label">Ocasião</label><input className="input" name="occasion" defaultValue={item.occasion||''}/></div><div className="field"><label className="label">Estação</label><input className="input" name="season" defaultValue={item.season||''}/></div><div className="field full"><label className="label">Observações</label><textarea className="textarea" name="notes" defaultValue={item.notes||''}/></div></div><label className="check-row"><input type="checkbox" name="is_favorite" defaultChecked={item.is_favorite}/><Heart size={17}/> Favorito</label><button className="btn btn-primary" style={{width:'100%',marginTop:16}} disabled={busy}>{busy?'Salvando…':'Salvar alterações'}</button></form>}
