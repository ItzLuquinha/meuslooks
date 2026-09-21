import { NextResponse } from 'next/server';
import { getCurrentContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
export async function GET(){const ctx=await getCurrentContext();if(ctx.kind!=='user'||!ctx.userId)return NextResponse.json({error:'Não autenticado.'},{status:401});const supabase=await createClient();const [{data:profile},{data:message},{data:outfits},{data:saved}]=await Promise.all([
 supabase.from('profiles').select('id,name,email').eq('id',ctx.userId).single(),
 supabase.from('admin_messages').select('id,title,body,active').eq('active',true).maybeSingle(),
 supabase.from('outfits').select('id,name,occasion,notes,is_favorite,is_day_look,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path))').eq('user_id',ctx.userId).order('created_at',{ascending:false}).limit(8),
 supabase.from('outfits').select('id,name,occasion,is_favorite,created_at,outfit_items(clothing_item_id,clothing_items(id,name,image_path))').eq('user_id',ctx.userId).eq('is_favorite',true).order('created_at',{ascending:false}).limit(8)
]);return NextResponse.json({profile,message,outfits:outfits||[],saved:saved||[]});}
