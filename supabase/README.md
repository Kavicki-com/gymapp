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

### Resultado verificado após as 5 migrations

| Tabela | Kavicki | Academia Hero | Dy fitness |
|---|---|---|---|
| gym_profiles | 1 | 1 | 1 |
| clients | 16 | 2 | 230 |
| equipment | 4 | 1 | — |
| **equipment_images** | **2** ✅ | **2** ✅ | — |
| equipment_maintenances | 14 | 1 | — |
| plans | 4 | 3 | 1 |
| payments | 92 | 2 | 100 |

Nenhuma contagem regrediu. `equipment_images` passou de 4 (vazando) para
2 em cada academia. `service_role` continua enxergando os 4 push_tokens,
que é como a edge function opera.

---

## Pendências conhecidas

Itens identificados durante a auditoria de 2026-07-31 e **deliberadamente
não corrigidos**, com a razão de cada um.

### 1. `pg_net` registrado no schema `public`

O linter pede para mover. **Não movido de propósito.** A extensão está
registrada em `public`, mas suas funções vivem no schema `net`, e os dois
cron jobs (`notifications-morning`, `notifications-evening`) chamam
`net.http_post(...)`. Um `ALTER EXTENSION pg_net SET SCHEMA extensions`
relocaria essas funções e quebraria as notificações push.

A exposição prática é próxima de zero — as funções já estão isoladas em
`net`. Só vale mexer junto com uma atualização dos comandos do cron.

### 2. Proteção contra senhas vazadas desativada

Checagem contra o HaveIBeenPwned no cadastro/troca de senha. É um toggle
de dashboard, não SQL: **Authentication → Policies → Leaked password
protection**. Não dá para ligar via migration.

### 3. Delete de imagem de equipamento não remove o arquivo do storage

`app/equipment-details.tsx` faz upload para a raiz do bucket como
`${equipmentId}-${timestamp}.jpg`, mas as policies de DELETE/UPDATE do
bucket `equipment-images` exigem
`auth.uid()::text = (storage.foldername(name))[1]` — uma pasta com o id
do usuário, que o upload nunca cria. A condição nunca é satisfeita.

Resultado: o `.remove()` falha silenciosamente (a API do Supabase não
retorna erro nesse caso) e os arquivos ficam órfãos. O bucket tem 8
objetos para 4 registros em `equipment_images` — evidência do acúmulo.

Isso já acontecia antes desta auditoria. A correção exige mudar o
caminho de upload no app para `${gymId}/${equipmentId}-${ts}.jpg` e
reescrever as policies do bucket em cima do novo caminho. Fica como
mudança de app, fora do escopo desta rodada. A falha atual é fechada
(nega em vez de permitir), então não há risco de segurança.

O mesmo padrão de upload na raiz vale para `client-photos` e
`employee-photos`.

### 4. Edge function `check-notifications` com `verify_jwt: false`

Necessário para o cron chamá-la sem token. O efeito colateral é que
qualquer pessoa que descubra a URL pode dispará-la. A função não aceita
parâmetros — o pior caso é forçar um envio extra de push para os donos de
academia. Blindar exige passar um segredo compartilhado no header do
`net.http_post` e validá-lo na função.
