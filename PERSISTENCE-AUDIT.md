# Auditoria de persistência e correções

## Dados que permanecem após atualizar a página

Roupas, imagens, categorias, looks, peças de looks, favoritos, Look do Dia, perfil e mensagem administrativa são persistidos no Supabase. Não existe uso de `localStorage` ou `sessionStorage` para manter esses dados.

As telas privadas recarregam os dados por API com `cache: no-store`, e as imagens são buscadas pelo `image_path` persistido no banco através de URL assinada.

## Correções aplicadas nesta revisão

- Cadastro agora faz rollback do usuário Auth se a criação de `profiles` ou `private_credentials` falhar.
- Redefinição de senha passou a sincronizar Auth e `private_credentials` pelo servidor.
- Favorito marcado ao cadastrar uma roupa agora é salvo corretamente quando o formulário envia `true`.
- Alteração de Look do Dia restaura o estado anterior quando uma etapa posterior da operação falha.
- Edição de look restaura composição anterior se a substituição dos itens falhar.
- Exclusão de roupa apaga primeiro o registro do banco e só depois remove o arquivo, evitando perder a imagem caso a exclusão do registro falhe.
- Looks aceitam até 12 peças para acomodar sobreposições e múltiplos acessórios.

## Verificações estáticas

- Busca por `localStorage`/`sessionStorage`: nenhum uso nas áreas do aplicativo.
- Busca por `alert(`/`prompt(`/`confirm(`: nenhum diálogo nativo de aplicativo encontrado.
- Proxy de sessão do Next.js 16 adicionado para renovar tokens do Supabase e manter cookies atualizados.
- Uploads de imagens das peças continuam armazenados no Supabase Storage e referenciados por `image_path`.
- Nenhum valor real de `ADMIN_PASSWORD`, `ENCRYPTION_KEY` ou service role key deve ser colocado no código-fonte.

## Limitação do ambiente de validação

O build completo (`npm run build`) precisa ser executado no ambiente local ou CI onde as dependências possam ser instaladas. Esta revisão inclui validação sintática dos arquivos TypeScript/TSX, mas não declara um build de produção como aprovado sem executá-lo.
