import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!url || !key || !email || !password) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL e ADMIN_PASSWORD.',
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Rian', role: 'admin' },
  });

  if (error && !error.message.toLowerCase().includes('already registered')) {
    throw error;
  }

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (listError) throw listError;

  const adminUser =
    list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ??
    created.user;

  if (!adminUser) throw new Error('Admin user não encontrado.');

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { password, email_confirm: true },
  );

  if (updateError) throw updateError;

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: adminUser.id,
    name: 'Administrador',
    email,
    role: 'admin',
    is_blocked: false,
  });

  if (profileError) throw profileError;

  console.log('Admin bootstrap concluído.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
