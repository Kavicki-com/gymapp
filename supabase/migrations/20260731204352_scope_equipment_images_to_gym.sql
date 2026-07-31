-- Fase 2: equipment_images era a única tabela sem isolamento por academia.
-- A policy antiga (auth.role() = 'authenticated') deixava qualquer usuário
-- logado ler, inserir, editar e APAGAR as imagens de todas as academias.
--
-- Verificado antes de aplicar: 4 linhas, zero gym_id nulo, zero divergência
-- entre equipment_images.gym_id e equipment.gym_id. O app já preenche gym_id
-- no INSERT (app/equipment-details.tsx).
--
-- Usa (select auth.uid()) para avaliação única por query em vez de por linha.

DROP POLICY IF EXISTS "Allow all for authenticated users on equipment_images"
  ON public.equipment_images;

CREATE POLICY "Gym owners can view their own equipment images"
  ON public.equipment_images FOR SELECT TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

CREATE POLICY "Gym owners can insert their own equipment images"
  ON public.equipment_images FOR INSERT TO authenticated
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

CREATE POLICY "Gym owners can update their own equipment images"
  ON public.equipment_images FOR UPDATE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())))
  WITH CHECK (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

CREATE POLICY "Gym owners can delete their own equipment images"
  ON public.equipment_images FOR DELETE TO authenticated
  USING (gym_id IN (SELECT id FROM public.gym_profiles WHERE user_id = (select auth.uid())));

-- Índice para a FK e para o filtro por gym_id das policies acima.
CREATE INDEX IF NOT EXISTS idx_equipment_images_equipment_id
  ON public.equipment_images (equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_images_gym_id
  ON public.equipment_images (gym_id);
