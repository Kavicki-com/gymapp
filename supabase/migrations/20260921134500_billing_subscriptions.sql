-- Assinatura do SaaS: a academia paga o GymApp para ter a aba Cobranças.
--
-- Cuidado com os nomes: `plans` (que já existe) são as MENSALIDADES que a
-- academia cobra do aluno — o conceito central do produto. A assinatura que a
-- academia paga para nós é `billing_plans`. Portar o código do reforma-ai
-- direto, com a tabela chamada `plans`, sobrescreveria o produto inteiro.
-- Na UI isto se chama "Assinatura", nunca "plano".
--
-- A assinatura é pendurada em `gym_id`, não em `user_id`: hoje
-- gym_profiles.user_id é unique e daria no mesmo, mas custa o mesmo agora e
-- não trava rede com várias unidades depois.

-- ---------------------------------------------------------------------------
-- 1. Catálogo de assinaturas
-- ---------------------------------------------------------------------------

create table if not exists public.billing_plans (
  code           text primary key,
  name           text not null,
  billing_period text not null default 'monthly'
                 check (billing_period in ('monthly', 'yearly')),
  amount         numeric(10,2) not null check (amount > 0),
  currency       text not null default 'BRL',
  trial_days     integer not null default 0 check (trial_days >= 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.billing_plans is
  'Assinatura que a ACADEMIA paga ao GymApp. Não confundir com public.plans, '
  'que são as mensalidades que a academia cobra do aluno.';

-- O preço vem daqui, nunca do cliente: o mp-subscribe-card lê o amount desta
-- linha e ignora qualquer valor que o navegador mande.
insert into public.billing_plans (code, name, billing_period, amount)
values ('cobrancas_mensal', 'GymApp Cobranças', 'monthly', 9.90)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Assinaturas
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
  id                 uuid primary key default uuid_generate_v4(),
  gym_id             uuid not null unique
                     references public.gym_profiles(id) on delete cascade,
  plan_code          text not null references public.billing_plans(code),
  status             text not null default 'pending'
                     check (status in ('pending','active','paused','cancelled')),
  kind               text not null default 'recurring_card'
                     check (kind in ('recurring_card')),
  mp_preapproval_id  text unique,
  mp_payer_id        text,
  auto_renew         boolean not null default true,
  current_period_end timestamptz,
  next_payment_date  timestamptz,
  card_last4         text,
  card_brand         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists subscriptions_gym_idx on public.subscriptions(gym_id);

-- ---------------------------------------------------------------------------
-- 3. Histórico de cobranças
-- ---------------------------------------------------------------------------

create table if not exists public.subscription_payments (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid not null references public.gym_profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  mp_payment_id   text not null unique,
  kind            text not null default 'recurring_card',
  status          text,
  amount          numeric(10,2),
  method          text,
  raw             jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists subscription_payments_gym_idx
  on public.subscription_payments(gym_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Cortesia separada de assinatura
-- ---------------------------------------------------------------------------
-- `collections_enabled` vira DERIVADA: cortesia OU assinatura ativa.
-- Sem isto, ligar a assinatura na mesma coluna faria o acesso de cortesia
-- (hoje: a academia Kavicki) morrer no primeiro cancelamento.

alter table public.gym_profiles
  add column if not exists collections_comp boolean not null default false;

comment on column public.gym_profiles.collections_comp is
  'Acesso de cortesia à aba Cobranças, marcado à mão por quem opera o produto. '
  'Independe de assinatura. Ver sync_collections_access().';

-- Quem já tinha acesso manual passa a ter como cortesia, para não perder nada.
update public.gym_profiles
   set collections_comp = true
 where collections_enabled = true;

create or replace function public.sync_collections_access(alvo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.gym_profiles g
     set collections_enabled = g.collections_comp or exists (
           select 1 from public.subscriptions s
            where s.gym_id = g.id and s.status = 'active'
         )
   where g.id = alvo;
end;
$$;

comment on function public.sync_collections_access(uuid) is
  'Recalcula gym_profiles.collections_enabled a partir da cortesia e da '
  'assinatura ativa. Chamada pelos triggers abaixo.';

-- Caminho do operador para dar/tirar cortesia. Existe porque marcar
-- collections_comp direto na tabela NÃO liga a aba: o sync não é automático do
-- lado de gym_profiles (um trigger ali recursaria, já que o sync escreve na
-- própria tabela). Use sempre esta função, nunca um update solto.
create or replace function public.set_collections_comp(alvo uuid, ligado boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  resultado boolean;
begin
  update public.gym_profiles set collections_comp = ligado where id = alvo;
  perform public.sync_collections_access(alvo);
  select collections_enabled into resultado
    from public.gym_profiles where id = alvo;
  return resultado;
end;
$$;

revoke all on function public.set_collections_comp(uuid, boolean) from public, anon, authenticated;

comment on function public.set_collections_comp(uuid, boolean) is
  'Liga/desliga a cortesia E recalcula o acesso. Marcar collections_comp com um '
  'update solto não tem efeito nenhum — use esta função.';

create or replace function public.on_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_collections_access(
    coalesce(new.gym_id, old.gym_id));
  return null;
end;
$$;

drop trigger if exists subscriptions_sync_access on public.subscriptions;
create trigger subscriptions_sync_access
  after insert or update or delete on public.subscriptions
  for each row execute function public.on_subscription_change();

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
-- Leitura: o dono vê a própria assinatura e o próprio histórico.
-- Escrita: ninguém pelo cliente. Só service_role (Edge Function), que ignora
-- RLS. Assinatura não se edita por PATCH na API.

alter table public.billing_plans          enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.subscription_payments  enable row level security;

drop policy if exists billing_plans_read on public.billing_plans;
create policy billing_plans_read on public.billing_plans
  for select to authenticated using (active = true);

drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
  for select to authenticated using (
    gym_id in (
      select id from public.gym_profiles
       where user_id = (select auth.uid())
    )
  );

drop policy if exists subscription_payments_read_own on public.subscription_payments;
create policy subscription_payments_read_own on public.subscription_payments
  for select to authenticated using (
    gym_id in (
      select id from public.gym_profiles
       where user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. A trava da coluna derivada
-- ---------------------------------------------------------------------------
-- guard_collections_enabled já impede o dono de ligar collections_enabled
-- sozinho. Agora precisa impedir collections_comp também — senão a cortesia
-- vira a nova porta dos fundos.

create or replace function public.guard_collections_enabled()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  operador boolean := coalesce(
    current_user in ('postgres', 'service_role', 'supabase_admin'), false);
begin
  if operador then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.collections_enabled := false;
    new.collections_comp    := false;
  else
    new.collections_enabled := old.collections_enabled;
    new.collections_comp    := old.collections_comp;
  end if;

  return new;
end;
$$;
