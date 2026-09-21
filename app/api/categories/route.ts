import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
export async function POST(req:Request){const c=await getCurrentContext();if(c.kind!=='user'||!c.userId)return NextResponse.json({error:'Não autenticado.'},{status:401});const {name}=await req.json().catch(()=>({}));const value=String(name||'').trim();if(value.length<2||value.length>40)return NextResponse.json({error:'Categoria inválida.'},{status:400});const s=createAdminClient();const {data,error}=await s.from('clothing_categories').insert({user_id:c.userId,name:value}).select('id,name').single();if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({category:data});}
