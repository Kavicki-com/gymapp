-- Correção da migration anterior: a trava não travava nada.
--
-- Com `security definer`, `current_user` dentro da função é o DONO dela
-- (postgres), não quem chamou. A checagem `current_user in ('postgres',
-- 'service_role', 'supabase_admin')` dava sempre verdadeira, então o trigger
-- devolvia NEW intacto e o dono da academia conseguia ligar a própria flag
-- com um PATCH na API.
--
-- Pego pelo harness de impersonação do supabase/README, antes de a aba existir:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid do dono>","role":"authenticated"}';
--   update gym_profiles set collections_enabled = true where id = '<gym>';
--   -- resultado ANTES da correção: true  (deveria ser false)
--
-- `security invoker` (o padrão) faz `current_user` ser o papel de quem chama:
-- `authenticated` para o dono, `service_role` para a operação. Retestado após
-- a correção: o update do dono não tem efeito, a coluna continua false.

create or replace function public.guard_collections_enabled()
returns trigger
language plpgsql
security invoker
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
