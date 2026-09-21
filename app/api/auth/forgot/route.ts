import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(request:Request){const {email}=await request.json().catch(()=>({}));if(!email)return NextResponse.json({error:'E-mail obrigatório.'},{status:400});const supabase=await createClient();await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin}/auth/redefinir`});return NextResponse.json({ok:true});}
