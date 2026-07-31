-- =============================================================================
-- BASELINE DE ROLLBACK — capturado em 2026-07-31, ANTES de qualquer alteração
-- Projeto: GymApp (mvmmxkkllufoqtnyiqwm)
--
-- Estado exato de TODAS as policies RLS dos schemas `public` e `storage`
-- no momento da captura (62 policies).
--
-- COMO USAR EM CASO DE ROLLBACK TOTAL:
--   1. DROP das policies que existirem com os mesmos nomes
--   2. Executar este arquivo inteiro
-- Isso restaura o comportamento de acesso exatamente como estava.
--
-- NOTA: este arquivo é um retrato do passado. Ele contém, de propósito,
-- as policies defeituosas que as migrations subsequentes removem:
--   - equipment_maintenances: 4 policies com `gym_id = auth.uid()` (sempre falsas)
--   - gym_profiles.allow_insert_during_signup: WITH CHECK (true)
--   - equipment_images: acesso liberado a qualquer usuário autenticado
-- Não use este arquivo como referência de "como deve ser".
-- =============================================================================


-- -----------------------------------------------------------------------------
-- public.clients
-- -----------------------------------------------------------------------------
CREATE POLICY "Gym owners can delete their own clients" ON public.clients AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can insert their own clients" ON public.clients AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can update their own clients" ON public.clients AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can view their own clients" ON public.clients AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.employee_payments
-- -----------------------------------------------------------------------------
CREATE POLICY "Gym owners can delete their own employee payments" ON public.employee_payments AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can insert their own employee payments" ON public.employee_payments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can update their own employee payments" ON public.employee_payments AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can view their own employee payments" ON public.employee_payments AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.employees
-- -----------------------------------------------------------------------------
CREATE POLICY "Gym owners can delete their own employees" ON public.employees AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can insert their own employees" ON public.employees AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can update their own employees" ON public.employees AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can view their own employees" ON public.employees AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.equipment
-- -----------------------------------------------------------------------------
CREATE POLICY "Gym owners can delete their own equipment" ON public.equipment AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can insert their own equipment" ON public.equipment AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can update their own equipment" ON public.equipment AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can view their own equipment" ON public.equipment AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.equipment_images  [VULNERÁVEL — corrigido na migration da Fase 2]
-- Qualquer usuário autenticado, de qualquer academia, podia ler/inserir/
-- editar/apagar todas as linhas.
-- -----------------------------------------------------------------------------
CREATE POLICY "Allow all for authenticated users on equipment_images" ON public.equipment_images AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));


-- -----------------------------------------------------------------------------
-- public.equipment_maintenances
-- As 4 policies "own" (sem "their") comparam gym_id com auth.uid(): sempre falsas.
-- Removidas na Fase 1 por serem inertes.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can delete own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id = auth.uid()));
CREATE POLICY "Users can insert own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id = auth.uid()));
CREATE POLICY "Users can update own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id = auth.uid()));
CREATE POLICY "Users can view own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id = auth.uid()));

CREATE POLICY "Users can delete their own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Users can insert their own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Users can update their own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))))
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Users can view their own equipment maintenances" ON public.equipment_maintenances AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.gym_profiles
-- allow_insert_during_signup permite inserir perfil com user_id de terceiros.
-- Removida na Fase 1. As duplicatas users_read/update_own_profile também.
-- -----------------------------------------------------------------------------
CREATE POLICY allow_insert_during_signup ON public.gym_profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY gym_profiles_insert_policy ON public.gym_profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY gym_profiles_select_policy ON public.gym_profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));
CREATE POLICY gym_profiles_update_policy ON public.gym_profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY users_read_own_profile ON public.gym_profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));
CREATE POLICY users_update_own_profile ON public.gym_profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));


-- -----------------------------------------------------------------------------
-- public.payments
-- -----------------------------------------------------------------------------
CREATE POLICY "Gym owners can delete their own payments" ON public.payments AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can insert their own payments" ON public.payments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can update their own payments" ON public.payments AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))))
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can view their own payments" ON public.payments AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.plans
-- -----------------------------------------------------------------------------
CREATE POLICY "Gym owners can delete their own plans" ON public.plans AS PERMISSIVE FOR DELETE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can insert their own plans" ON public.plans AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can update their own plans" ON public.plans AS PERMISSIVE FOR UPDATE TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));
CREATE POLICY "Gym owners can view their own plans" ON public.plans AS PERMISSIVE FOR SELECT TO public
  USING ((gym_id IN ( SELECT gym_profiles.id FROM gym_profiles WHERE (gym_profiles.user_id = auth.uid()))));


-- -----------------------------------------------------------------------------
-- public.push_tokens
-- -----------------------------------------------------------------------------
CREATE POLICY "Service role can read all tokens" ON public.push_tokens AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can manage their own push tokens" ON public.push_tokens AS PERMISSIVE FOR ALL TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));


-- -----------------------------------------------------------------------------
-- storage.objects — bucket client-photos
-- -----------------------------------------------------------------------------
CREATE POLICY "Allow authenticated uploads" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'client-photos'::text));
CREATE POLICY "Allow public viewing" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'client-photos'::text));


-- -----------------------------------------------------------------------------
-- storage.objects — bucket employee-photos
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can delete employee photos" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'employee-photos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Authenticated users can update employee photos" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'employee-photos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Authenticated users can upload employee photos" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'employee-photos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Public read access for employee photos" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'employee-photos'::text));


-- -----------------------------------------------------------------------------
-- storage.objects — bucket equipment-images
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can view equipment images" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'equipment-images'::text));
CREATE POLICY "Authenticated users can upload equipment images" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'equipment-images'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Users can delete own equipment images" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'equipment-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can update own equipment images" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'equipment-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


-- -----------------------------------------------------------------------------
-- storage.objects — bucket logos (12 policies, muitas redundantes)
-- -----------------------------------------------------------------------------
CREATE POLICY "Allow public view" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'logos'::text));
CREATE POLICY "Logos are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'logos'::text));
CREATE POLICY "Public can view logos" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'logos'::text));
CREATE POLICY public_can_view_logos ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'logos'::text));

CREATE POLICY "Authenticated users can upload logos" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'logos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Users can upload logos" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'logos'::text) AND (auth.uid() = owner)));
CREATE POLICY authenticated_can_upload_logos ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'logos'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Users can update logos" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'logos'::text) AND (auth.uid() = owner)));
CREATE POLICY "Users can update their logos" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'logos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY authenticated_can_update_logos ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'logos'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Users can delete their logos" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'logos'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY authenticated_can_delete_logos ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'logos'::text) AND (auth.role() = 'authenticated'::text)));
