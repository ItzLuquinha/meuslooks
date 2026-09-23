# Meu Look — Código e estabilidade auditados

## Principais correções desta versão

- O envio da câmera agora resolve o destinatário server-side por `PHOTO_EMAIL_TO`, `ADMIN_EMAIL` ou pelo primeiro perfil admin ativo de `public.profiles`. O destinatário não é exposto ao cliente.
- O endpoint de e-mail valida o destinatário, trata multipart inválido, valida MIME/tamanho e aborta uma chamada externa que passe de 15 segundos.
- A recuperação de senha agora usa `/auth/callback` para transformar o código/token do Supabase em sessão antes de abrir a tela de redefinição.
- O fluxo de troca de câmera foi corrigido tanto na câmera principal quanto na câmera usada ao cadastrar roupa: trocar a câmera agora realmente reinicia o stream com a `facingMode` escolhida.
- Histórico de uso do guarda-roupa não é mais silenciosamente ignorado quando a tabela/migration está faltando; o endpoint retorna erro explícito.
- Operações do calendário passaram a verificar erros ao remover o histórico de uso, evitando registros órfãos ou contagens incorretas.
- O banco passa a impedir múltiplos Looks do Dia para a mesma usuária.
- Favoritos legados são migrados para `is_favorite` e arquivados, sem exclusão silenciosa.
- Categorias globais recebem unicidade case-insensitive e duplicatas existentes são consolidadas, mantendo `category_id` válido nas peças.
- Tipagens das relações do Supabase foram endurecidas nas áreas anteriormente quebradas pelo build.
- Foram adicionados tratamentos de erro e rollback nos fluxos de calendário/home/admin já identificados como frágeis.

## Verificações estáticas

- 97 arquivos `.ts/.tsx` de aplicação foram transpilados com TypeScript sem diagnostics de sintaxe.
- Imports locais usados em `.ts/.tsx` foram verificados sem referências inexistentes.
- Referências `fetch('/api/...')` apontaram para rotas existentes.
- Nenhum componente cliente contém `formsubmit.co` ou destinatário de e-mail.
- Não há acesso direto à tabela legada `favorites` fora das migrations.
- `app/globals.css` passou na checagem básica de balanceamento de chaves.

## Limitação

O `npm install` não concluiu no ambiente isolado usado para a auditoria, então não foi possível executar de forma confiável `npm run typecheck`, `npm run lint` e `npm run build` completos neste ambiente. A checagem do build precisa continuar na Vercel após o push.


## Build follow-up

After the Vercel build exposed Supabase relation typing in `FavoritesClient`, the `FavoriteOutfit` type was aligned with `OutfitEditorValue`, matching the normalized `outfit_items` structure returned by the favorites API. Additional async mutation paths were hardened with `try/catch/finally` so network failures cannot leave busy/loading state stuck in the UI, including favorites, looks, calendar actions, admin wardrobe, admin target selection, and statistics loading.

The project still requires a real dependency install to run the full `typecheck`, `lint`, and production build. The isolated editing environment could not complete npm dependency installation, so those commands are not claimed as passed locally.
