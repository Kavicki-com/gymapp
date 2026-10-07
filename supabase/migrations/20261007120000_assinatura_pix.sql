-- Assinatura anual e pagamento por Pix.
--
-- O Pix é AVULSO: cada pagamento libera 1 ou 12 meses e não renova sozinho.
-- Por isso, ao contrário do cartão (em que o MP avisa quando cancela), aqui
-- quem desliga o acesso somos nós, quando current_period_end passa.
--
-- Rollback:
--   select cron.unschedule('pix-expirar');
--   select cron.unschedule('pix-lembretes');
--   drop table public.subscription_reminders;
--   drop function public.expire_pix_subscriptions();
--   update public.billing_plans set active = false where code = 'cobrancas_anual';
--   (as constraints só voltam ao original se não houver linha com kind 'pix'
--    ou status 'expired')

-- ---------------------------------------------------------------------------
-- 1. Plano anual: R$ 118,80 = 12 × 9,90, sem desconto (decidido em 07/10/2026).
-- ---------------------------------------------------------------------------

insert into public.billing_plans (code, name, billing_period, amount)
values ('cobrancas_anual', 'GymApp Cobranças (anual)', 'yearly', 118.80)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Assinatura pode ser Pix, e Pix vencido vira 'expired'.
-- ---------------------------------------------------------------------------
-- 'expired' é separado de 'cancelled' para dar para distinguir "deixou de
-- pagar o Pix" de "cancelou o cartão" sem olhar o histórico.

alter table public.subscriptions drop constraint subscriptions_kind_check;
alter table public.subscriptions add constraint subscriptions_kind_check
  check (kind in ('recurring_card', 'pix'));

alter table public.subscriptions drop constraint subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('pending', 'active', 'paused', 'cancelled', 'expired'));

-- O Pix é pago antes de o período existir; o webhook precisa saber quantos
-- meses aquele pagamento compra, e o valor sozinho não diz (o preço muda).
alter table public.subscription_payments
  add column if not exists plan_code text references public.billing_plans(code);

-- ---------------------------------------------------------------------------
-- 3. Expirar Pix vencido. O trigger subscriptions_sync_access desliga a aba.
-- ---------------------------------------------------------------------------

create or replace function public.expire_pix_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.subscriptions
     set status = 'expired', updated_at = now()
   where kind = 'pix'
     and status = 'active'
     and current_period_end < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.expire_pix_subscriptions() from public, anon, authenticated;

-- De hora em hora: quem vence às 10h perde o acesso até as 11h, não no dia
-- seguinte. Cartão não entra (kind = 'pix'): ele renova pelo webhook.
select cron.schedule('pix-expirar', '5 * * * *',
  $$select public.expire_pix_subscriptions()$$);

-- ---------------------------------------------------------------------------
-- 4. Lembretes já enviados — é o que impede aviso duplicado.
-- ---------------------------------------------------------------------------
-- A chave inclui period_end: ao renovar, o vencimento muda e o ciclo de avisos
-- recomeça sozinho. O pix-lembretes grava aqui ANTES de enviar (insert com
-- conflito = já foi), então chamar a função duas vezes não manda duas vezes.

create table if not exists public.subscription_reminders (
  id              uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  period_end      timestamptz not null,
  kind            text not null check (kind in ('d7', 'd5', 'd3', 'expired')),
  sent_at         timestamptz not null default now(),
  unique (subscription_id, period_end, kind)
);

-- Só service_role escreve e lê. Sem policy = nada para o cliente.
alter table public.subscription_reminders enable row level security;

-- Todo dia às 12:00 UTC (9h em Brasília), junto do aviso da manhã.
select cron.schedule('pix-lembretes', '0 12 * * *', $$
  select net.http_post(
    url := 'https://mvmmxkkllufoqtnyiqwm.supabase.co/functions/v1/pix-lembretes',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
