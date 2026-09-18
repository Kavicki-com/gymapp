-- Aba Cobranças: flag por academia, ligada à mão.
--
-- "collections" e não "billing" de propósito: billing vai ser a assinatura do
-- SaaS mais adiante, e o plano já alertou para colisão de nome (a tabela
-- `plans` do GymApp são as mensalidades das academias, não o plano do SaaS).
-- Aqui é cobrança de aluno pela academia — collections.
--
-- Nenhuma superfície de compra dentro do app iOS. Quem não tem a flag não vê
-- nada: nem aba, nem cadeado, nem preço. A conversa acontece fora do app.

alter table public.gym_profiles
  add column if not exists collections_enabled boolean not null default false;

comment on column public.gym_profiles.collections_enabled is
  'Libera a aba Cobranças. Marcada à mão por quem opera o produto. O dono da '
  'academia NÃO pode alterar — ver o trigger abaixo.';

-- A policy de UPDATE do gym_profiles permite o dono editar a própria linha,
-- o que incluiria esta coluna. Sem esta trava, qualquer um liberaria a
-- própria aba com um PATCH na API.
create or replace function public.guard_collections_enabled()
returns trigger
language plpgsql
security definer
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
  else
    new.collections_enabled := old.collections_enabled;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_collections_enabled on public.gym_profiles;
create trigger guard_collections_enabled
  before insert or update on public.gym_profiles
  for each row execute function public.guard_collections_enabled();
