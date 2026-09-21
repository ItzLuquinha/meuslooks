# Meu Look — configuração local

O projeto já vem com `.env.local` para desenvolvimento.

## Ainda falta preencher somente os dados do Supabase

No `.env.local`, substitua:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Esses três valores precisam vir do seu projeto Supabase.

## Depois

```powershell
npm run bootstrap-admin
npm run dev
```

O script `bootstrap-admin` agora carrega automaticamente `.env.local`, então você não precisa exportar as variáveis manualmente no PowerShell.

O `.env.local` está protegido pelo `.gitignore` e não deve ser enviado ao GitHub.
