import { NextResponse } from 'next/server';
export async function POST(){const r=NextResponse.json({ok:true});r.cookies.set('meu_look_admin','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return r;}
