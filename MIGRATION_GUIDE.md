# Como Aplicar a Migração do gym_id

## Problema
As tabelas `clients`, `employees`, `equipment` e `plans` não possuem a coluna `gym_id`, que é necessária para isolar os dados entre diferentes academias.

## Solução
Execute a migração SQL que adiciona a coluna `gym_id` em todas as tabelas e atualiza as políticas de Row Level Security (RLS).

## Passos para Executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione o projeto `mvmmxkkllufoqtnyiqwm`
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie todo o conteúdo do arquivo `migration_add_gym_id.sql`
6. Cole no editor SQL
7. Clique em **Run** para executar a migração
8. Aguarde a confirmação de sucesso

### Opção 2: Via CLI do Supabase

```bash
# Se você tiver o Supabase CLI instalado
supabase db push --file migration_add_gym_id.sql
```

## Verificação

Após executar a migração, você pode verificar se foi bem-sucedida executando esta query no SQL Editor:

```sql
-- Verificar se gym_id foi adicionado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('clients', 'employees', 'equipment', 'plans')
  AND column_name = 'gym_id';
```

Deve retornar 4 linhas (uma para cada tabela).

## Próximos Passos

Após a migração, **todos os dados existentes terão `gym_id = NULL`**. 

Para corrigir isso, você pode:

1. **Opção A (Manual)**: Atribuir manualmente o gym_id aos registros existentes
2. **Opção B (Automática)**: Excluir os dados de teste e recriá-los através do app

Se escolher a Opção B (recomendado para dados de teste):

```sql
-- Limpar dados de teste (CUIDADO: isso apaga todos os dados!)
TRUNCATE TABLE clients, employees, equipment, plans RESTART IDENTITY CASCADE;
```

Depois disso, todos os novos registros criados através do app já terão o `gym_id` correto automáticamente.

## IMPORTANTE ⚠️

**Antes de executar a migração:**
1. Certifique-se de que você tem um backup dos dados importantes
2. Se estiver em produção, considere fazer a migração em um horário de baixo tráfego
3. Teste primeiro em um ambiente de desenvolvimento se possível

Se você tiver dados em produção que precisam ser preservados, me informe para criar um script de migração de dados mais complexo.
