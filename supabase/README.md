# Supabase — GymApp

Projeto: `mvmmxkkllufoqtnyiqwm` (região us-east-1, Postgres 17)

## Estrutura

| Pasta | O que é |
|---|---|
| `migrations/` | Migrations versionadas. Aplicadas em produção, em ordem. |
| `rollback/` | Baseline capturado antes das alterações. Rede de segurança. |
| `legacy/` | Os `.sql` que estavam soltos na raiz do repo. **Histórico, não executar.** |

### Sobre `legacy/`

Esses arquivos foram escritos antes de haver controle de migrations e **não
correspondem ao estado atual do banco**. Vários foram aplicados parcialmente ou
substituídos por alterações feitas direto no dashboard. Estão versionados só
como referência histórica. A fonte da verdade é o banco + `migrations/`.

## Harness de verificação (impersonação)

Antes e depois de mexer em qualquer policy RLS, rode as queries do app
**como um usuário real** e compare as contagens. É o que pega regressão de
acesso sem precisar buildar o app.

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID_DO_USUARIO>","role":"authenticated"}';

select
  (select count(*) from gym_profiles)           as gym_profiles,
  (select count(*) from clients)                as clients,
  (select count(*) from equipment)              as equipment,
  (select count(*) from equipment_images)       as equipment_images,
  (select count(*) from equipment_maintenances) as equip_maintenances,
  (select count(*) from employees)              as employees,
  (select count(*) from plans)                  as plans,
  (select count(*) from payments)               as payments,
  (select count(*) from employee_payments)      as employee_payments,
  (select count(*) from push_tokens)            as push_tokens;
rollback;
```

O `rollback` no final garante que o harness nunca escreve nada.

### Snapshot de referência — 2026-07-31, antes das migrations

Usuário `80a6befd-ac3a-4087-a858-53a34fe852ac` (academia "Kavicki",
gym_id `a7c1d566-8baa-44f2-b057-58be5898c04c`):

| Tabela | Visível ANTES | Deveria ser |
|---|---|---|
| gym_profiles | 1 | 1 |
| clients | 16 | 16 |
| equipment | 4 | 4 |
| **equipment_images** | **4** | **2** ⚠️ |
| equipment_maintenances | 14 | 14 |
| employees | 1 | 1 |
| plans | 4 | 4 |
| payments | 92 | 92 |
| employee_payments | 3 | 3 |
| push_tokens | 1 | 1 |

As 2 linhas extras em `equipment_images` pertenciam à academia
"Academia Hero" — o vazamento entre inquilinos corrigido na Fase 2.
Todos os outros números devem permanecer idênticos após as migrations.
