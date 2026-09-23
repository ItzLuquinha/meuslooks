# Meu Look · Painel Debug

A área `/admin/debug` é exclusiva da sessão administrativa.

## Visualizador responsivo

Permite testar larguras reais de referência de iPhone, Galaxy, Pixel e Motorola. A prévia fica em um viewport com a largura/altura escolhidas, permite retrato/paisagem, safe area e troca entre as principais páginas do app.

A prévia é visual: usa os mesmos estilos globais do Meu Look e dados representativos para análise de layout. Ela não altera dados reais.

## Monitoramento de performance

Quando a aba Debug é aberta, o monitoramento local é ativado no navegador. Ele registra:

- navegações e tempo de troca de rota;
- cliques/toques e resposta visual do primeiro frame;
- duração e status das chamadas `fetch`;
- erros JavaScript e rejeições não tratadas;
- LCP, mudanças de layout e long tasks quando o navegador suporta;
- recursos lentos observados na página;
- conectividade, viewport, DPR e alguns sinais de memória quando expostos pelo navegador.

Os registros ficam somente em `localStorage` do navegador e têm limite para evitar crescimento indefinido.

## Verificações de layout

O painel consegue testar no viewport escolhido:

- overflow horizontal;
- elementos interativos menores que a área de toque recomendada pelo app;
- imagens sem `alt`;
- quantidade de elementos interativos.

## Laboratório de movimento

Inclui testes visuais locais para conferir microinterações, favorito, fade e press feedback.

## Copiar diagnóstico

O botão "Copiar diagnóstico" copia um resumo textual sem cookies, senhas ou segredos.

## Banco

Nenhuma tabela ou migration nova é necessária para o painel Debug. Todas as métricas são coletadas no cliente e permanecem no navegador.
