-- Fase 2 — grupos de valor divergente (parte liberada)
--
-- APLICADO EM 2026-09-18. Os dois updates da academia A rodaram. O grupo da
-- conta protegida não foi tocado e a constraint não foi criada — ver os dois
-- blocos do rodapé.
--
-- Arquivo histórico, anonimizado: nomes, valores, datas de pagamento e ids
-- reais foram retirados. Os marcadores <...> são de propósito: sem trocá-los
-- o SQL falha em vez de rodar. Não executar de novo.
--
-- Rode 20260918-fase2-higiene.sql antes.
--
-- Eram 3 grupos. O grupo 3 (conta protegida) fica INTOCADO por decisão do
-- Kavicki em 18/09/2026 — ver o bloco no rodapé. Os dois que sobram são da
-- academia A, que está ATIVA, e nenhum apaga linha: são correções de mês.

begin;

-- ---------------------------------------------------------------- Grupo 1
-- Academia A / aluno 1 / 06/2026 — dois lançamentos de valores diferentes
--
-- Não é duplicata, é mês errado. O aluno paga sempre perto do mesmo dia do mês
-- corrente, e um dos lançamentos é de maio. As duas linhas foram criadas no
-- mesmo dia com 20s de diferença — digitação retroativa em lote, e a primeira
-- saiu com o mês da segunda.
--
-- Efeito visível: 05/2026 do aluno deixa de aparecer em aberto.
update public.payments set reference_month = '05/2026'
where id = '<ID_DO_PAGAMENTO_DO_GRUPO_1>'
  and reference_month = '06/2026';   -- guarda: no-op se já foi corrigido
-- esperado: UPDATE 1

-- ---------------------------------------------------------------- Grupo 2
-- Academia A / aluno 2 / 06/2026 — dois lançamentos de valores diferentes
--
-- Também mês errado. O aluno paga sempre perto do mesmo dia do mês corrente e
-- 08/2026 está faltando no histórico. Um dos lançamentos é de agosto; o outro
-- já está certo.
--
-- Efeito visível: 08/2026 do aluno deixa de aparecer em aberto.
update public.payments set reference_month = '08/2026'
where id = '<ID_DO_PAGAMENTO_DO_GRUPO_2>'
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
-- Grupo 3 — conta protegida / um locatário / 06/2026: três lançamentos, um
-- com o nome antigo do imóvel e valor menor, dois de valor igual criados com
-- cerca de um minuto de diferença.
--
-- Decisão do Kavicki (18/09/2026): não mexer nos dados dessa conta.
--
-- Contexto, para quem ler isto depois: a conta não é academia. Os "planos" são
-- endereços de imóvel e os "alunos" são inquilinos — é um locador usando o
-- GymApp como controle de aluguel. O lançamento menor não é um segundo imóvel:
-- é a mesma unidade com o nome antigo do prédio e o preço antigo, porque
-- `payments.plan_name` é um snapshot congelado no ato do lançamento e o dono
-- renomeou os planos e subiu os valores. O mesmo padrão aparece em outros
-- inquilinos da conta.
--
-- A conta churnou em junho/2026.


-- ================================================================ 2e — CONSTRAINT
-- NÃO APLICAR AGORA.
--
-- Com o grupo 3 intocado, o unique estrito não entra: esse inquilino fica com
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
-- a conta protegida for resolvida (ou descartada), a constraint estrita volta
-- à mesa, e aí já existirá a tela de editar/excluir pagamento para lidar com
-- o que ela recusar.
