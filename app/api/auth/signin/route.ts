import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(req:Request){const {email,password}=await req.json().catch(()=>({}));if(!email||!password)return NextResponse.json({error:'Credenciais inválidas.'},{status:400});const s=await createClient();const {error}=await s.auth.signInWithPassword({email,password});if(error)return NextResponse.json({error:'Credenciais inválidas.'},{status:401});return NextResponse.json({ok:true});}
