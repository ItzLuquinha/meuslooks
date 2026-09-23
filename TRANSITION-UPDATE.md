# Transição entre abas

A transição crossfade foi refinada para evitar o corte visual durante a troca de rota.

- A página anterior permanece montada durante toda a transição.
- A nova página é preparada com opacidade zero antes do início visual do fade.
- A troca para a nova página só acontece depois que o crossfade termina.
- Duração: 240ms.
- Sem blur, zoom, slide ou efeitos decorativos.
- Respeita `prefers-reduced-motion`.
- Aplicada somente ao conteúdo das páginas privadas; a navegação permanece fora da animação.
