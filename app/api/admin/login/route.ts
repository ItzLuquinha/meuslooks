import { NextResponse } from 'next/server';
import { createAdminSession, validatePassword } from '@/lib/security';

export async function POST(request: Request){
  const body=await request.json().catch(()=>null) as {email?:string;password?:string}|null;
  if(!body?.email||!body.password) return NextResponse.json({error:'Credenciais inválidas.'},{status:400});
  const ok=body.email.trim().toLowerCase()===process.env.ADMIN_EMAIL?.trim().toLowerCase() && validatePassword(body.password) && body.password===process.env.ADMIN_PASSWORD;
  if(!ok) return NextResponse.json({error:'Credenciais inválidas.'},{status:401});
  const response=NextResponse.json({ok:true});
  response.cookies.set('meu_look_admin',createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
  return response;
}
