-- Fase 1: remove policies que não concedem nada + a brecha de spoofing.
-- Nenhuma alteração de comportamento para usuários legítimos.

-- 1) equipment_maintenances: 4 policies comparando gym_id (id de academia)
--    com auth.uid() (id de usuário). Nunca verdadeiras -> nunca concederam
--    acesso. O acesso real vem das policies "their own", que permanecem.
DROP POLICY IF EXISTS "Users can view own equipment maintenances"   ON public.equipment_maintenances;
DROP POLICY IF EXISTS "Users can insert own equipment maintenances" ON public.equipment_maintenances;
DROP POLICY IF EXISTS "Users can update own equipment maintenances" ON public.equipment_maintenances;
DROP POLICY IF EXISTS "Users can delete own equipment maintenances" ON public.equipment_maintenances;

-- 2) gym_profiles: WITH CHECK (true) permitia inserir perfil de academia
--    com user_id de terceiros. Os dois únicos INSERTs do app
--    (app/onboarding/index.tsx e app/(drawer)/profile/edit.tsx) gravam
--    user_id vindo da sessão, então gym_profiles_insert_policy já cobre.
DROP POLICY IF EXISTS allow_insert_during_signup ON public.gym_profiles;

-- 3) gym_profiles: duplicatas exatas de gym_profiles_select/update_policy.
DROP POLICY IF EXISTS users_read_own_profile   ON public.gym_profiles;
DROP POLICY IF EXISTS users_update_own_profile ON public.gym_profiles;
