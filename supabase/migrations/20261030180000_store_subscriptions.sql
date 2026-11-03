-- Assinatura pela loja (App Store / Google Play) via RevenueCat.
--
-- Convive com o Mercado Pago e o Pix: o acesso continua derivando de
-- `subscriptions` (trigger subscriptions_sync_access → collections_enabled),
-- e o webhook revenuecat-webhook escreve aqui com kind = 'store'.
-- Rollback: supabase/rollback/20261030-store-subscriptions.sql

alter table public.subscriptions drop constraint subscriptions_kind_check;
alter table public.subscriptions add constraint subscriptions_kind_check
  check (kind = any (array['recurring_card'::text, 'pix'::text, 'store'::text]));

alter table public.subscriptions
  add column if not exists store text
    check (store is null or store = any (array['app_store'::text, 'play_store'::text])),
  add column if not exists store_product_id text,
  add column if not exists rc_app_user_id text;

comment on column public.subscriptions.store is
  'Só para kind = store: em qual loja a assinatura foi feita.';
comment on column public.subscriptions.rc_app_user_id is
  'app_user_id do RevenueCat (= auth.users.id do dono). O app faz Purchases.logIn com ele.';

-- Planos da loja: o preço repassa a comissão de 15% (9,90 ÷ 0,85 e
-- 118,80 ÷ 0,85, arredondados). O valor aqui é informativo — quem cobra é a
-- loja. active = false de propósito: as funções do Mercado Pago só vendem
-- planos ativos, e estes não podem ser comprados pelo site.
insert into public.billing_plans (code, name, billing_period, amount, currency, trial_days, active)
values
  ('cobrancas_mensal_loja', 'GymApp Cobranças (loja)', 'monthly', 11.90, 'BRL', 0, false),
  ('cobrancas_anual_loja', 'GymApp Cobranças (loja, anual)', 'yearly', 139.90, 'BRL', 0, false)
on conflict (code) do nothing;
