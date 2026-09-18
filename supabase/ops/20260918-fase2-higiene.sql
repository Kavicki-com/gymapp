-- Fase 2 — higiene de dados (partes SEM decisão pendente)
--
-- APLICADO EM 2026-09-18, junto com o arquivo de grupos divergentes, numa
-- única transação. Resultado conferido: payments 966 -> 940, meses inválidos
-- 2 -> 0, grupos duplicados 26 -> 1, receita 111305 -> 109600 (-1705).
-- Precedido de dry-run idêntico com rollback.
-- Projeto mvmmxkkllufoqtnyiqwm. Depende da Fase 0 (schema `backup`) estar aplicada.
--
-- NÃO inclui: os grupos de valor divergente (ver 20260918-fase2-grupos-divergentes.sql)
-- NÃO inclui: a constraint unique — ver o rodapé daquele arquivo (não aplica).
--
-- A conta `Empreendimentos S&S` é intocável por decisão do Kavicki (18/09).
-- Verificado em 18/09: nenhum dos blocos abaixo a atingiria de qualquer forma
-- (os 23 duplicados estão em Dy fitness 8, Letz 5, Cactus 5, e 1 em cada uma
-- de outras 5; os 34 sem referência estão em GT 3, Hero 2, Gym WM 17,
-- Kavicki 12). O predicado `gym_id <> :ses` abaixo é só trava, não filtro.
--
-- Rollback ao final do arquivo.

begin;

-- trava: id da conta que não pode ser tocada
create temp table _nao_tocar as
select id from public.gym_profiles where gym_name = 'Empreendimentos S&S';

-- ---------------------------------------------------------------- 2a
-- 23 duplicatas de valor idêntico: mantém a mais antiga do grupo.
with grupo as (
  select client_id, reference_month
  from public.payments
  where reference_month is not null
  group by 1,2
  having count(*) > 1 and count(distinct amount) = 1
)
delete from public.payments where id in (
  select id from (
    select p.id, row_number() over (
      partition by p.client_id, p.reference_month
      order by p.created_at asc nulls last, p.payment_date asc, p.id asc) as rn
    from public.payments p
    join grupo g on g.client_id = p.client_id
                and g.reference_month = p.reference_month
    where p.gym_id not in (select id from _nao_tocar)
  ) t where rn > 1
);
-- esperado: DELETE 23

-- ---------------------------------------------------------------- 2b
-- Os 2 meses inválidos ('30/2026' e '00/4202', ambos Dy fitness).
--
-- CORREÇÃO AO PLANO: o plano mandava corrigi-los para a competência do
-- payment_date. Não dá — os dois clientes JÁ TÊM um pagamento em 04/2026,
-- de mesmo valor (R$ 50) e mesma data (30/04), criado no próprio dia 30/04.
-- Os registros inválidos foram criados em 04/05, quatro dias depois: são a
-- segunda digitação do mesmo pagamento, com o mês errado.
--
-- Corrigir para 04/2026 criaria uma duplicata exata. O certo é apagar.
-- (E, ao contrário do que o plano dizia, esses alunos NÃO estão marcados
--  como devedores — o lançamento bom de 04/2026 já existe.)
delete from public.payments
where reference_month in ('30/2026', '00/4202')
  and gym_id not in (select id from _nao_tocar);
-- esperado: DELETE 2

-- ---------------------------------------------------------------- 2c
-- Dos 34 pagamentos sem reference_month, preenche pela competência do
-- payment_date só os que NÃO colidem com um lançamento existente.
--
-- Os 12 que colidem são todos da conta de teste "Kavicki" (seed relançado).
-- Ficam com reference_month NULL de propósito: a constraint da 2e é parcial
-- (`where reference_month is not null`), então linha nula não a viola.
-- Deixar quieto é mais barato e menos destrutivo que apagar.

-- 2c1 — antes de preencher: 2 linhas nulas do MESMO cliente caem na mesma
-- competência (Academia Hero / Jorginho da Silva, 02/2026, R$ 50 as duas,
-- criadas com 24s de diferença). O backfill puro criaria uma duplicata nova.
-- Mesma regra da 2a: valor idêntico, mantém a mais antiga.
with alvo as (
  select p.id, p.client_id, p.amount, p.created_at, p.payment_date,
         to_char(p.payment_date, 'MM/YYYY') as comp
  from public.payments p
  where p.reference_month is null and p.payment_date is not null
    and p.gym_id not in (select id from _nao_tocar)
    and not exists (
      select 1 from public.payments x
      where x.client_id = p.client_id
        and x.reference_month = to_char(p.payment_date, 'MM/YYYY'))
),
dup as (
  select client_id, comp from alvo
  group by 1,2 having count(*) > 1 and count(distinct amount) = 1
)
delete from public.payments where id in (
  select id from (
    select a.id, row_number() over (
      partition by a.client_id, a.comp
      order by a.created_at asc nulls last, a.payment_date asc, a.id asc) as rn
    from alvo a join dup d on d.client_id = a.client_id and d.comp = a.comp
  ) t where rn > 1
);
-- esperado: DELETE 1

-- 2c2 — agora o backfill é seguro.
update public.payments p
set reference_month = to_char(p.payment_date, 'MM/YYYY')
where p.reference_month is null
  and p.payment_date is not null
  and p.gym_id not in (select id from _nao_tocar)
  and not exists (
    select 1 from public.payments x
    where x.client_id = p.client_id
      and x.reference_month = to_char(p.payment_date, 'MM/YYYY')
  );
-- esperado: UPDATE 21

-- ---------------------------------------------------------------- verificação
-- Rode ANTES do commit. Se qualquer linha divergir, dê rollback.
select
  (select count(*) from public.payments) as payments,               -- esperado 940
  (select count(*) from public.payments
    where reference_month is null) as sem_referencia,               -- esperado 12
  (select count(*) from public.payments
    where reference_month is not null
      and reference_month !~ '^(0[1-9]|1[0-2])/20[0-9]{2}$')
    as meses_invalidos,                                             -- esperado 0
  (select count(*) from (
     select 1 from public.payments where reference_month is not null
     group by client_id, reference_month having count(*) > 1) t)
    as grupos_duplicados_restantes;                                 -- esperado 3
  -- (2 da Cactus Fit, corrigidos no outro arquivo; 1 da S&S, que fica)

commit;

-- ================================================================ ROLLBACK
-- Antes do commit:  rollback;
--
-- Depois do commit, reinsere o que foi apagado e desfaz o backfill:
--
--   insert into public.payments
--   select * from backup.payments_20260917 b
--   where not exists (select 1 from public.payments p where p.id = b.id);
--
--   update public.payments p
--   set reference_month = b.reference_month
--   from backup.payments_20260917 b
--   where b.id = p.id and p.reference_month is distinct from b.reference_month;
--
-- Confere: select count(*) from public.payments;  -- volta a 966
