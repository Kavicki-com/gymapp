-- =============================================================================
-- Testes de RLS — GymApp
--
-- Verifica isolamento entre academias em todas as tabelas e buckets.
-- Roda inteiro dentro de uma transação com ROLLBACK: NÃO grava nada.
--
-- COMO RODAR:
--   Dashboard do Supabase -> SQL Editor -> colar e executar.
--   Retorna uma tabela com uma linha por teste e o veredito.
--
-- ANTES DE RODAR, ajuste os 3 UUIDs em `cfg` abaixo:
--   u_a / g_a : um usuário e a academia dele
--   u_b / g_b : OUTRO usuário e a academia dele (para testar o isolamento)
--   u_novo    : um usuário autenticado que ainda NÃO tem gym_profile
--               (para testar o onboarding). Se não houver nenhum, o T1
--               vai falhar com "duplicate key" — isso é constraint UNIQUE,
--               não falha de RLS.
--
-- Para descobrir valores válidos:
--   select gp.user_id, gp.id as gym_id, gp.gym_name from gym_profiles gp;
--   select u.id, u.email from auth.users u
--     left join gym_profiles gp on gp.user_id=u.id where gp.id is null;
-- =============================================================================

begin;

create temp table cfg on commit drop as select
  '80a6befd-ac3a-4087-a858-53a34fe852ac'::uuid as u_a,
  'a7c1d566-8baa-44f2-b057-58be5898c04c'::uuid as g_a,
  '7df6c854-38f8-4c58-bec0-f740286cdaf2'::uuid as u_b,
  'a0f9b8f9-ea37-4a0f-a659-4e4269fa4143'::uuid as g_b,
  '360436d8-ef86-448d-947e-c9ba9eca5d58'::uuid as u_novo;

create temp table r(n int, teste text, esperado text, obtido text, veredito text)
  on commit drop;

-- Necessário: os blocos abaixo rodam sob os papéis authenticated/service_role,
-- que não enxergam tabelas temporárias criadas pelo papel original.
grant select on cfg to authenticated, service_role;
grant select, insert on r to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- BLOCO A — leitura como usuário A: só pode enxergar a própria academia
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"80a6befd-ac3a-4087-a858-53a34fe852ac","role":"authenticated"}';

do $$
declare
  g_a uuid := (select g_a from cfg);
  t   text;
  n_visivel int;
  n_alheio  int;
  i int := 0;
begin
  foreach t in array array['clients','equipment','equipment_images',
                           'equipment_maintenances','employees','plans',
                           'payments','employee_payments']
  loop
    i := i + 1;
    execute format('select count(*) from %I', t) into n_visivel;
    execute format('select count(*) from %I where gym_id <> $1', t)
      using g_a into n_alheio;

    insert into r values (
      i,
      format('A%s leitura de %s', i, t),
      'nenhuma linha de outra academia',
      format('%s visiveis, %s de outra academia', n_visivel, n_alheio),
      case when n_alheio = 0 then 'PASSOU' else 'FALHOU' end
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- BLOCO B — escrita: gravar na própria academia deve funcionar,
--                    gravar marcando outra academia deve ser bloqueado
-- ---------------------------------------------------------------------------

-- B1: cliente na própria academia -> PERMITIR
do $$ begin
  insert into clients (name, email, gym_id)
    values ('__teste__','__teste__@x.com',(select g_a from cfg));
  insert into r values (10,'B1 criar cliente na propria academia','permitir','permitiu','PASSOU');
exception when others then
  insert into r values (10,'B1 criar cliente na propria academia','permitir','bloqueou: '||sqlerrm,'FALHOU');
end $$;

-- B2: cliente marcado como de outra academia -> BLOQUEAR
do $$ begin
  insert into clients (name, email, gym_id)
    values ('__roubado__','__roubado__@x.com',(select g_b from cfg));
  insert into r values (11,'B2 criar cliente em academia alheia','bloquear','permitiu','FALHOU');
exception when insufficient_privilege then
  insert into r values (11,'B2 criar cliente em academia alheia','bloquear','bloqueou','PASSOU');
end $$;

-- B3: mudar um cliente próprio para outra academia -> BLOQUEAR
do $$ begin
  update clients set gym_id=(select g_b from cfg)
   where gym_id=(select g_a from cfg);
  insert into r values (12,'B3 transferir cliente para academia alheia','bloquear','permitiu','FALHOU');
exception when insufficient_privilege then
  insert into r values (12,'B3 transferir cliente para academia alheia','bloquear','bloqueou','PASSOU');
end $$;

-- B4: apagar clientes de outra academia -> 0 linhas afetadas
do $$ declare n int; begin
  delete from clients where gym_id=(select g_b from cfg);
  get diagnostics n = row_count;
  insert into r values (13,'B4 apagar clientes de academia alheia','0 linhas',n||' linhas',
    case when n=0 then 'PASSOU' else 'FALHOU' end);
end $$;

-- B5: imagem de equipamento na própria academia -> PERMITIR
do $$ begin
  insert into equipment_images (equipment_id, gym_id, image_url)
    select id, gym_id, 'http://x/t.jpg' from equipment
     where gym_id=(select g_a from cfg) limit 1;
  insert into r values (14,'B5 imagem na propria academia','permitir','permitiu','PASSOU');
exception when others then
  insert into r values (14,'B5 imagem na propria academia','permitir','bloqueou: '||sqlerrm,'FALHOU');
end $$;

-- B6: imagem marcada como de outra academia -> BLOQUEAR
do $$ begin
  insert into equipment_images (equipment_id, gym_id, image_url)
    select id,(select g_b from cfg),'http://x/t.jpg' from equipment
     where gym_id=(select g_a from cfg) limit 1;
  insert into r values (15,'B6 imagem em academia alheia','bloquear','permitiu','FALHOU');
exception when insufficient_privilege then
  insert into r values (15,'B6 imagem em academia alheia','bloquear','bloqueou','PASSOU');
end $$;

-- B7: apagar imagens de outra academia -> 0 linhas (era o vazamento)
do $$ declare n int; begin
  delete from equipment_images where gym_id=(select g_b from cfg);
  get diagnostics n = row_count;
  insert into r values (16,'B7 apagar imagens de academia alheia','0 linhas',n||' linhas',
    case when n=0 then 'PASSOU' else 'FALHOU' end);
end $$;

-- B8: spoofing de perfil de academia -> BLOQUEAR
do $$ begin
  insert into gym_profiles (user_id, gym_name)
    values ((select u_b from cfg),'__roubada__');
  insert into r values (17,'B8 criar perfil com user_id alheio','bloquear','permitiu','FALHOU');
exception when insufficient_privilege then
  insert into r values (17,'B8 criar perfil com user_id alheio','bloquear','bloqueou','PASSOU');
end $$;

-- ---------------------------------------------------------------------------
-- BLOCO C — storage
-- ---------------------------------------------------------------------------

-- C1: listagem dos buckets públicos deve retornar 0
do $$ declare b text; n int; i int := 20; begin
  foreach b in array array['logos','client-photos','employee-photos','equipment-images']
  loop
    select count(*) into n from storage.objects where bucket_id=b;
    insert into r values (i, format('C listar bucket %s', b),'0 arquivos',n||' arquivos',
      case when n=0 then 'PASSOU' else 'FALHOU' end);
    i := i + 1;
  end loop;
end $$;

-- C2: upload de logo na pasta de outro usuário -> BLOQUEAR
do $$ begin
  insert into storage.objects (bucket_id, name, owner)
    values ('logos',(select u_b from cfg)||'/999.jpg',(select u_a from cfg));
  insert into r values (25,'C upload de logo na pasta alheia','bloquear','permitiu','FALHOU');
exception when insufficient_privilege then
  insert into r values (25,'C upload de logo na pasta alheia','bloquear','bloqueou','PASSOU');
end $$;

-- ---------------------------------------------------------------------------
-- BLOCO D — onboarding, como usuário sem academia
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"360436d8-ef86-448d-947e-c9ba9eca5d58","role":"authenticated"}';

-- D1: criar a própria academia -> PERMITIR
do $$ begin
  insert into gym_profiles (user_id, gym_name, address)
    values ((select u_novo from cfg),'__academia_teste__','rua x');
  insert into r values (30,'D1 onboarding: criar propria academia','permitir','permitiu','PASSOU');
exception when others then
  insert into r values (30,'D1 onboarding: criar propria academia','permitir','bloqueou: '||sqlerrm,'FALHOU');
end $$;

-- D2: upload de logo na própria pasta -> PERMITIR
do $$ begin
  insert into storage.objects (bucket_id, name, owner)
    values ('logos',(select u_novo from cfg)||'/123.jpg',(select u_novo from cfg));
  insert into r values (31,'D2 upload de logo na propria pasta','permitir','permitiu','PASSOU');
exception when others then
  insert into r values (31,'D2 upload de logo na propria pasta','permitir','bloqueou: '||sqlerrm,'FALHOU');
end $$;

-- ---------------------------------------------------------------------------
-- BLOCO E — service_role (edge function check-notifications) enxerga tudo
-- ---------------------------------------------------------------------------
set local role service_role;
do $$ declare n int; begin
  select count(*) into n from push_tokens;
  insert into r values (40,'E service_role le push_tokens','todos os tokens',n||' tokens',
    case when n > 0 then 'PASSOU' else 'FALHOU' end);
end $$;

-- ---------------------------------------------------------------------------
-- RESULTADO
-- ---------------------------------------------------------------------------
reset role;
select
  veredito,
  teste,
  esperado,
  obtido
from r
order by (veredito='FALHOU') desc, n;

rollback;
