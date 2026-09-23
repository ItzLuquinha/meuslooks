# Meu Look

Aplicativo web privado para organização pessoal de roupas e looks. Esta pasta é uma revisão incremental do projeto existente, mantendo a identidade visual rosa/vinho, o uso de Supabase e a experiência mobile-first.

## Stack

- Next.js 16 + App Router
- React 19
- TypeScript
- Supabase Auth, Database e Storage
- `@supabase/ssr` para sessão SSR por cookies
- Lucide React
- CSS responsivo sem gradientes

## O que foi revisado

- Seleção explícita da usuária no painel administrativo por um cookie HTTP-only validado no servidor.
- APIs administrativas sempre resolvem e validam a usuária selecionada antes de ler ou alterar dados.
- Edição completa de looks, incluindo nome, ocasião, observações, peças, favorito e Look do Dia.
- Composição de looks agrupada por função: parte de cima, parte de baixo, terceira peça, roupa íntima, sapato, bolsa, acessório e outros.
- Favoritos de looks exibem as fotos reais das peças cadastradas.
- Gerenciamento de categorias pelo administrador com criação, edição, ativação/desativação e exclusão segura.
- Câmera com preview, captura sem upload imediato, confirmação por "Usar foto", "Tirar outra" e "Cancelar".
- Gerenciamento de `MediaStream` com referência estável e encerramento das tracks ao trocar/fechar.
- Substituição de `alert()`, `prompt()` e `confirm()` por modais e mensagens próprias da interface.
- Validação server-side e whitelisting dos campos de atualização de roupas.
- Proteção administrativa das imagens para a usuária selecionada.
- Sincronização entre Supabase Auth e `private_credentials` na troca/reset de senha.
- RLS de categorias separando leitura das categorias padrão de escrita nas categorias da própria conta.

## Configuração Supabase

1. Crie um projeto gratuito no Supabase.
2. Abra o SQL Editor e execute `supabase/schema.sql`.
3. Confirme que o bucket `clothing` existe e é privado.
4. Habilite autenticação por e-mail e senha.
5. Crie `.env.local` a partir de `.env.example`.

Variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ENCRYPTION_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` e `ENCRYPTION_KEY` são exclusivamente server-side. Nunca crie versões `NEXT_PUBLIC_*` desses secrets.

## Admin inicial

Configure as variáveis e execute em um ambiente seguro:

```bash
npm install
npm run bootstrap-admin
```

A senha administrativa vem apenas de `ADMIN_PASSWORD`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Build e testes

```bash
npm run typecheck
npm run build
```

O repositório deve ser validado novamente depois da instalação das dependências. Durante a auditoria nesta execução, o ambiente não conseguiu concluir `npm install` dentro do limite de execução, portanto o build de produção não foi declarado como aprovado.

## Vercel Free

1. Conecte o repositório GitHub à Vercel.
2. Configure as Environment Variables.
3. Execute `supabase/schema.sql` no projeto Supabase.
4. Faça o bootstrap do administrador usando um ambiente server-side com `SUPABASE_SERVICE_ROLE_KEY`.
5. Configure `NEXT_PUBLIC_SITE_URL` com o domínio da Vercel.
6. Teste login, cadastro, recuperação de senha, câmera, upload, guarda-roupa, looks, favoritos e `/admin`.

## Segurança

- RLS está habilitado nas tabelas do aplicativo.
- `private_credentials` não possui política para usuários autenticados comuns.
- A senha recuperável é armazenada como texto cifrado AES-256-GCM usando `ENCRYPTION_KEY` somente no servidor.
- A visualização da senha é individual e exige sessão administrativa válida e uma usuária selecionada.
- Senhas não são gravadas em logs, URLs, localStorage ou cookies.
- O Storage é privado.
- O service role key nunca deve chegar ao navegador.
- APIs administrativas não aceitam `role`, `isAdmin` ou `userId` como autoridade; a identidade administrativa é determinada pela sessão e a usuária-alvo é validada no servidor.

## Migração do schema

A revisão adiciona `clothing_categories.is_active` e novas políticas RLS para categorias. Execute o `supabase/schema.sql` completo no banco antes de usar a área administrativa de categorias.

### Detalhe floral
A decoração de lírios rosa foi desenhada localmente em SVG em uma direção botânica/aquarela inspirada em uma referência de lírio rosa pesquisada online. O arquivo local evita depender de hotlink externo e mantém o detalhe leve para o aplicativo.


## Câmera e e-mail

A aba de câmera permite capturar e editar fotos antes do envio. O e-mail é encaminhado pelo FormSubmit, sem SMTP ou senha de e-mail. A primeira utilização exige a confirmação única do endereço destinatário pelo próprio FormSubmit.


## Recuperação de senha

O fluxo usa `/auth/callback` para trocar o código de recuperação do Supabase pela sessão antes de abrir `/auth/redefinir`. Adicione a URL `https://SEU-DOMINIO/auth/callback` nas Redirect URLs do Supabase Authentication.
