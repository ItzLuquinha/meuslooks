import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptText, validatePassword } from '@/lib/security';

export async function POST(request:Request){
 const b=await request.json().catch(()=>null) as any; if(!b?.name||!b?.email||!b?.password) return NextResponse.json({error:'Preencha todos os campos.'},{status:400}); if(!validatePassword(b.password)) return NextResponse.json({error:'A senha precisa ter entre 8 e 128 caracteres.'},{status:400});
 const admin=createAdminClient(); const {data,error}=await admin.auth.admin.createUser({email:b.email,password:b.password,email_confirm:true,user_metadata:{name:b.name,role:'user'}}); if(error||!data.user) return NextResponse.json({error:error?.message||'Não foi possível criar sua conta.'},{status:400});
 await admin.from('profiles').upsert({id:data.user.id,name:b.name,email:b.email.toLowerCase(),role:'user',is_blocked:false});
 await admin.from('private_credentials').upsert({user_id:data.user.id,encrypted_password:encryptText(b.password)});
 // Sign the user in server-side through the publishable client after account creation.
 return NextResponse.json({ok:true});
}
