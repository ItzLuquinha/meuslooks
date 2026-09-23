import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
export async function DELETE(){const c=await getCurrentContext();if(c.kind!=='user'||!c.userId)return NextResponse.json({error:'Não autenticado.'},{status:401});const admin=createAdminClient();const {error}=await admin.from('outfits').update({is_day_look:false}).eq('user_id',c.userId).eq('is_day_look',true);if(error)return NextResponse.json({error:'Não foi possível remover o Look do Dia.'},{status:500});return NextResponse.json({ok:true});}
