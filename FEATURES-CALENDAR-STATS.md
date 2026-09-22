# Calendário, histórico e estatísticas

## Novas áreas
- `/calendario`: registra um look por dia, mostra o mês e permite remover registros.
- `/estatisticas`: mostra peças, looks, favoritos, dias registrados, peças nunca usadas, peças mais usadas, categorias e uso recente.

## Persistência
A nova migration `supabase/migrations/20260922_calendar_usage_stats.sql` cria `outfit_wears` e `wardrobe_usage`. Execute-a no SQL Editor do Supabase antes de usar essas áreas em produção.

O `supabase/schema.sql` também contém essas tabelas para instalações novas.

## Histórico de peças
Ao registrar um look no calendário, cada peça presente naquele look recebe uma entrada de uso. Excluir o registro do calendário remove esse uso. Excluir um look mantém o histórico das peças que já foram usadas, mas a referência ao look é liberada.
