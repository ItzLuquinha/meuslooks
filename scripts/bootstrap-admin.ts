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

  // Avoid calling createUser for an already existing email. In some Node/Windows
  // combinations, handling the duplicate-user error can leave the HTTP client
  // closing while the process exits, which can trigger a libuv assertion.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (listError) throw listError;

  let adminUser =
    list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;

  if (!adminUser) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Rian', role: 'admin' },
    });

    if (createError) throw createError;
    adminUser = created.user;
  } else {
    console.log('Usuário administrador já existe; atualizando a senha e o perfil.');
  }

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

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
