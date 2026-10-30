-- Desfaz 20261030180000_store_subscriptions.
--
-- ATENÇÃO: se já existir assinatura com kind = 'store', a constraint antiga
-- não volta. Decida antes o que fazer com essas linhas (o acesso delas sai
-- junto ao apagar):
--   select id, gym_id, status from public.subscriptions where kind = 'store';

begin;

delete from public.subscriptions where kind = 'store';

alter table public.subscriptions drop constraint subscriptions_kind_check;
alter table public.subscriptions add constraint subscriptions_kind_check
  check (kind = any (array['recurring_card'::text, 'pix'::text]));

alter table public.subscriptions
  drop column if exists store,
  drop column if exists store_product_id,
  drop column if exists rc_app_user_id;

delete from public.subscription_payments where kind = 'store';
delete from public.billing_plans where code in ('cobrancas_mensal_loja', 'cobrancas_anual_loja');

commit;
