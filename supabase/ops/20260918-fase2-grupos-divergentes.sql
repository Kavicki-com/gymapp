-- Fase 2 — grupos de valor divergente (parte liberada)
--
-- APLICADO EM 2026-09-18. Os dois updates da Cactus Fit rodaram. O grupo da
-- S&S não foi tocado e a constraint não foi criada — ver os dois blocos do
-- rodapé.
--
-- Rode 20260918-fase2-higiene.sql antes.
--
-- Eram 3 grupos. O grupo 3 (Empreendimentos S&S / José Guedes Filho) fica
-- INTOCADO por decisão do Kavicki em 18/09/2026 — ver o bloco no rodapé.
-- Os dois que sobram são da Cactus Fit, que está ATIVA, e nenhum apaga linha:
-- são correções de mês.

begin;

-- ---------------------------------------------------------------- Grupo 1
-- Cactus Fit / Tuta / 06/2026 — R$ 40 (pago 22/05) + R$ 55 (pago 22/06)
--
-- Não é duplicata, é mês errado. O Tuta paga por volta do dia 20–22 do mês
-- corrente (20/07 -> 07/2026, 20/08 -> 08/2026). O lançamento de 22/05 é de
-- maio. As duas linhas foram criadas em 27/06 com 20s de diferença —
-- digitação retroativa em lote, e a primeira saiu com o mês da segunda.
--
-- Efeito visível: 05/2026 do Tuta deixa de aparecer em aberto.
update public.payments set reference_month = '05/2026'
where id = '98fda5b0-9183-4c44-bebd-502f9c2b24cb'
  and reference_month = '06/2026';   -- guarda: no-op se já foi corrigido
-- esperado: UPDATE 1

-- ---------------------------------------------------------------- Grupo 2
-- Cactus Fit / Zeta de Lia / 06/2026 — R$ 40 (pago 08/06) + R$ 55 (pago 10/08)
--
-- Também mês errado. Ela paga por volta do dia 8–10 do mês corrente
-- (09/07 -> 07/2026, 08/09 -> 09/2026) e 08/2026 está faltando no histórico
-- dela. O lançamento de 10/08 é de agosto. O R$ 40 de 08/06 já está certo.
--
-- Efeito visível: 08/2026 da Zeta deixa de aparecer em aberto.
update public.payments set reference_month = '08/2026'
where id = 'd5f57099-085e-46d6-8c39-9f15632eeae4'
  and reference_month = '06/2026';
-- esperado: UPDATE 1

-- ---------------------------------------------------------------- verificação
select (select count(*) from public.payments) as payments,          -- esperado 940
       (select count(*) from (
          select 1 from public.payments where reference_month is not null
          group by client_id, reference_month having count(*) > 1) t)
         as grupos_duplicados_restantes;                            -- esperado 1

commit;


-- ================================================================ NÃO FAZER
-- Grupo 3 — Empreendimentos S&S / José Guedes Filho / 06/2026:
--   R$ 750  pago 18/06  (plan_name "Rua João Elizeu Melo (AP301)")
--   R$ 1000 pago 01/07 01:00:55
--   R$ 1000 pago 01/07 01:02:07
--
-- Decisão do Kavicki (18/09/2026): não mexer nos dados dessa conta.
--
-- Contexto, para quem ler isto depois: a conta não é academia. Os 46 "planos"
-- são endereços de imóvel e os "alunos" são inquilinos — é um locador usando
-- o GymApp como controle de aluguel. O R$ 750 não é um segundo imóvel: é a
-- mesma unidade com o nome antigo do prédio e o preço antigo, porque
-- `payments.plan_name` é um snapshot congelado no ato do lançamento e o dono
-- renomeou os planos e subiu os valores. O mesmo padrão aparece em Sergio
-- Dias Faleiro (715 -> 900) e Valdelice Santana (715 -> 900).
--
-- A conta churnou em junho/2026.


-- ================================================================ 2e — CONSTRAINT
-- NÃO APLICAR AGORA.
--
-- Com o grupo 3 intocado, o unique estrito não entra: o José Guedes fica com
-- 3 lançamentos em 06/2026 e a criação do índice falha.
--
--   create unique index concurrently payments_client_month_uniq
--     on public.payments (client_id, reference_month)
--     where reference_month is not null;
--   -- ERRO: could not create unique index — Key (client_id, reference_month)
--   --       is duplicated.
--
-- A alternativa que estava em estudo (unique em client_id + reference_month +
-- plan_name) foi DESCARTADA: `plan_name` é texto livre gravado como snapshot
-- e muda quando o dono renomeia o plano. Ancorar unicidade nele quebra
-- sozinho no próximo rename.
--
-- Encaminhamento: a guarda contra duplicata fica na UI, na Fase 1b —
-- "este mês já foi lançado para este aluno", com opção de confirmar. Quando
-- a S&S for resolvida (ou a conta for descartada), a constraint estrita
-- volta à mesa, e aí já existirá a tela de editar/excluir pagamento para
-- lidar com o que ela recusar.
