-- Fase 1b — soft delete de pagamento
--
-- Até aqui não existia nenhuma forma de excluir ou editar um pagamento pela
-- interface: o histórico em client-details era só leitura, e todo engano
-- virava suporte manual no banco.
--
-- Soft delete em vez de `delete` físico para o histórico continuar auditável
-- — quem apagou o quê, e quando, continua reconstruível.

alter table public.payments
  add column if not exists deleted_at timestamptz;

comment on column public.payments.deleted_at is
  'Soft delete. Pagamento com deleted_at preenchido não conta em nenhum '
  'cálculo do app. Nunca fazer delete físico por aqui: o histórico é a '
  'prova de que o lançamento existiu.';

-- Todas as leituras do app passam a filtrar `deleted_at is null`, então os
-- índices que servem essas consultas viram parciais: menores, e não carregam
-- linha apagada. Substituem os dois índices cheios equivalentes.
create index if not exists payments_client_id_active_idx
  on public.payments (client_id) where deleted_at is null;

create index if not exists payments_gym_id_active_idx
  on public.payments (gym_id) where deleted_at is null;

drop index if exists public.idx_payments_client_id;
drop index if exists public.idx_payments_gym_id;

-- As policies existentes já cobrem: "Gym owners can update their own payments"
-- permite o UPDATE que grava deleted_at, restrito ao gym_id do dono.
-- Nenhuma policy nova é necessária.
