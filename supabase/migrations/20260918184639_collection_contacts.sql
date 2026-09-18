-- Registro de cobrança enviada.
--
-- Sem isto a aba Cobranças é um relatório: a Letz tem 116 alunos devendo
-- R$ 12.890, e a cada vez que ela abre a tela não faz ideia de quem já
-- incomodou ontem. Guardar o envio é o que transforma a lista numa fila de
-- trabalho, e é também o que permite medir se a cobrança funcionou —
-- cruzando com a data dos pagamentos.
--
-- Guarda o que era devido NO MOMENTO do envio, não uma referência viva: é o
-- que permite dizer "cobrei R$ 111 e ele pagou" depois que a dívida mudou.

create table if not exists public.collection_contacts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gym_profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null default 'whatsapp',
  reference_months text[] not null default '{}',
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.collection_contacts is
  'Uma linha por cobrança enviada. Nunca atualizada nem apagada: é histórico.';

-- A consulta da aba é "último contato por cliente, nesta academia".
create index if not exists collection_contacts_gym_client_idx
  on public.collection_contacts (gym_id, client_id, created_at desc);

alter table public.collection_contacts enable row level security;

create policy "Gym owners can view their own collection contacts"
  on public.collection_contacts for select
  using (gym_id in (
    select id from public.gym_profiles where user_id = (select auth.uid())));

create policy "Gym owners can insert their own collection contacts"
  on public.collection_contacts for insert
  with check (gym_id in (
    select id from public.gym_profiles where user_id = (select auth.uid())));

-- Sem UPDATE e sem DELETE de propósito: histórico não se reescreve.
