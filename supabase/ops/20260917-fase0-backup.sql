-- Fase 0 — rede de segurança (aplicada em 2026-09-17, projeto mvmmxkkllufoqtnyiqwm)
--
-- Não é uma migration: estas tabelas são temporárias e devem ser removidas
-- quando a Fase 2 for dada como boa. Ficam no schema `backup`, que não é
-- exposto pelo PostgREST — uma cópia de `payments` no `public` sem RLS seria
-- legível por qualquer usuário autenticado, de qualquer academia.
--
-- Rollback: drop schema backup cascade;  (nada em produção foi tocado)

create schema if not exists backup;
revoke all on schema backup from anon, authenticated;

-- cópia integral, some quando a Fase 2 for dada como boa
create table backup.payments_20260917 as select * from public.payments;
create table backup.clients_20260917  as select * from public.clients;

-- foto dos números de hoje, por academia, pra comparar depois da Fase 3.
-- Subqueries em vez dos dois LEFT JOIN do plano: o join de clients com
-- payments multiplica as linhas e infla o sum(amount).
create table backup.audit_snapshot_20260917 as
select g.id as gym_id, g.gym_name,
  (select count(*) from public.clients  c where c.gym_id = g.id) as clientes,
  (select count(*) from public.payments p where p.gym_id = g.id) as pagamentos,
  coalesce((select sum(p.amount) from public.payments p where p.gym_id = g.id),0) as recebido_total,
  now() as tirado_em
from public.gym_profiles g;

revoke all on all tables in schema backup from anon, authenticated;

-- Verificado em 17/09/2026:
--   backup.payments_20260917        966 linhas  (public.payments      966)
--   backup.clients_20260917         854 linhas  (public.clients       854)
--   backup.audit_snapshot_20260917   27 linhas  (public.gym_profiles   27)
--   sum(recebido_total) = sum(payments.amount) = 111305
