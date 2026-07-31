-- Fase 3: performance. Duas mudanças, ambas sem alterar QUEM acessa O QUÊ.
--
-- 1) auth.uid() -> (select auth.uid())
--    Sem o subselect, o Postgres reavalia a função para CADA LINHA varrida.
--    Com ele, avalia uma vez por query (InitPlan) e reusa o resultado.
--
-- 2) TO authenticated em vez de TO public
--    `public` inclui o papel anon. Como toda cláusula depende de auth.uid(),
--    que é NULL para anon, o resultado já era sempre falso — restringir o
--    papel é explícito, não uma mudança de comportamento.
--
-- 3) Índices faltantes em colunas de FK e nas colunas gym_id usadas pelo RLS.

-- ============================================================ clients
DROP POLICY IF EXISTS "Gym owners can view their own clients"   ON public.clients;
DROP POLICY IF EXISTS "Gym owners can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Gym owners can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Gym owners can delete their own clients" ON public.clients;

CREATE POLICY "Gym owners can view their own clients" ON public.clients
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own clients" ON public.clients
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ employees
DROP POLICY IF EXISTS "Gym owners can view their own employees"   ON public.employees;
DROP POLICY IF EXISTS "Gym owners can insert their own employees" ON public.employees;
DROP POLICY IF EXISTS "Gym owners can update their own employees" ON public.employees;
DROP POLICY IF EXISTS "Gym owners can delete their own employees" ON public.employees;

CREATE POLICY "Gym owners can view their own employees" ON public.employees
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own employees" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own employees" ON public.employees
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own employees" ON public.employees
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ employee_payments
DROP POLICY IF EXISTS "Gym owners can view their own employee payments"   ON public.employee_payments;
DROP POLICY IF EXISTS "Gym owners can insert their own employee payments" ON public.employee_payments;
DROP POLICY IF EXISTS "Gym owners can update their own employee payments" ON public.employee_payments;
DROP POLICY IF EXISTS "Gym owners can delete their own employee payments" ON public.employee_payments;

CREATE POLICY "Gym owners can view their own employee payments" ON public.employee_payments
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own employee payments" ON public.employee_payments
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own employee payments" ON public.employee_payments
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own employee payments" ON public.employee_payments
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ equipment
DROP POLICY IF EXISTS "Gym owners can view their own equipment"   ON public.equipment;
DROP POLICY IF EXISTS "Gym owners can insert their own equipment" ON public.equipment;
DROP POLICY IF EXISTS "Gym owners can update their own equipment" ON public.equipment;
DROP POLICY IF EXISTS "Gym owners can delete their own equipment" ON public.equipment;

CREATE POLICY "Gym owners can view their own equipment" ON public.equipment
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own equipment" ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own equipment" ON public.equipment
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own equipment" ON public.equipment
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ equipment_maintenances
DROP POLICY IF EXISTS "Users can view their own equipment maintenances"   ON public.equipment_maintenances;
DROP POLICY IF EXISTS "Users can insert their own equipment maintenances" ON public.equipment_maintenances;
DROP POLICY IF EXISTS "Users can update their own equipment maintenances" ON public.equipment_maintenances;
DROP POLICY IF EXISTS "Users can delete their own equipment maintenances" ON public.equipment_maintenances;

CREATE POLICY "Gym owners can view their own equipment maintenances" ON public.equipment_maintenances
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own equipment maintenances" ON public.equipment_maintenances
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own equipment maintenances" ON public.equipment_maintenances
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own equipment maintenances" ON public.equipment_maintenances
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ plans
DROP POLICY IF EXISTS "Gym owners can view their own plans"   ON public.plans;
DROP POLICY IF EXISTS "Gym owners can insert their own plans" ON public.plans;
DROP POLICY IF EXISTS "Gym owners can update their own plans" ON public.plans;
DROP POLICY IF EXISTS "Gym owners can delete their own plans" ON public.plans;

CREATE POLICY "Gym owners can view their own plans" ON public.plans
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own plans" ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own plans" ON public.plans
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own plans" ON public.plans
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ payments
DROP POLICY IF EXISTS "Gym owners can view their own payments"   ON public.payments;
DROP POLICY IF EXISTS "Gym owners can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Gym owners can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Gym owners can delete their own payments" ON public.payments;

CREATE POLICY "Gym owners can view their own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own payments" ON public.payments
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ equipment_images
-- (criadas na Fase 2 já com (select auth.uid()); só ajusta o papel)
DROP POLICY IF EXISTS "Gym owners can view their own equipment images"   ON public.equipment_images;
DROP POLICY IF EXISTS "Gym owners can insert their own equipment images" ON public.equipment_images;
DROP POLICY IF EXISTS "Gym owners can update their own equipment images" ON public.equipment_images;
DROP POLICY IF EXISTS "Gym owners can delete their own equipment images" ON public.equipment_images;

CREATE POLICY "Gym owners can view their own equipment images" ON public.equipment_images
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can insert their own equipment images" ON public.equipment_images
  FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can update their own equipment images" ON public.equipment_images
  FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));
CREATE POLICY "Gym owners can delete their own equipment images" ON public.equipment_images
  FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- ============================================================ gym_profiles
DROP POLICY IF EXISTS gym_profiles_select_policy ON public.gym_profiles;
DROP POLICY IF EXISTS gym_profiles_insert_policy ON public.gym_profiles;
DROP POLICY IF EXISTS gym_profiles_update_policy ON public.gym_profiles;

CREATE POLICY gym_profiles_select_policy ON public.gym_profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY gym_profiles_insert_policy ON public.gym_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY gym_profiles_update_policy ON public.gym_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================ push_tokens
-- A policy "Service role can read all tokens" é mantida como está: a edge
-- function check-notifications usa a service_role key, que já ignora RLS.
-- (removida logo em seguida, na migration 20260731205105)
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.push_tokens;

CREATE POLICY "Users can manage their own push tokens" ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================ índices
-- gym_id: coluna usada por toda checagem de RLS. Faltava nas duas tabelas
-- abaixo, sendo que payments tem 588 linhas.
CREATE INDEX IF NOT EXISTS idx_payments_gym_id
  ON public.payments (gym_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenances_gym_id
  ON public.equipment_maintenances (gym_id);

-- FKs sem índice de cobertura.
CREATE INDEX IF NOT EXISTS idx_payments_client_id
  ON public.payments (client_id);
CREATE INDEX IF NOT EXISTS idx_clients_plan_id
  ON public.clients (plan_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenances_equipment_id
  ON public.equipment_maintenances (equipment_id);
