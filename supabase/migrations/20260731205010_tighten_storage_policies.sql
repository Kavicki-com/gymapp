-- Fase 4: storage.
--
-- (a) Buckets públicos com policy ampla de SELECT em storage.objects permitem
--     LISTAR todos os arquivos. Como os 4 buckets são public=true, as imagens
--     são servidas pelo endpoint público (/storage/v1/object/public/...), que
--     não consulta RLS. Verificado no código: o app só usa upload(),
--     getPublicUrl() e remove() — nenhum .list(), .download() ou
--     createSignedUrl(). Remover essas policies mata a listagem sem afetar a
--     exibição das imagens.
--
-- (b) O bucket `logos` acumulou 12 policies fazendo o trabalho de 3.

-- ---------- (a) fim da listagem pública ----------
DROP POLICY IF EXISTS "Allow public viewing"                   ON storage.objects; -- client-photos
DROP POLICY IF EXISTS "Public read access for employee photos" ON storage.objects; -- employee-photos
DROP POLICY IF EXISTS "Anyone can view equipment images"       ON storage.objects; -- equipment-images
DROP POLICY IF EXISTS "Allow public view"                      ON storage.objects; -- logos
DROP POLICY IF EXISTS "Logos are publicly accessible"          ON storage.objects; -- logos
DROP POLICY IF EXISTS "Public can view logos"                  ON storage.objects; -- logos
DROP POLICY IF EXISTS public_can_view_logos                    ON storage.objects; -- logos

-- ---------- (b) consolidação do bucket logos ----------
-- 3 policies de INSERT, 3 de UPDATE e 2 de DELETE, sobrepostas.
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload logos"               ON storage.objects;
DROP POLICY IF EXISTS authenticated_can_upload_logos         ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos"               ON storage.objects;
DROP POLICY IF EXISTS "Users can update their logos"         ON storage.objects;
DROP POLICY IF EXISTS authenticated_can_update_logos         ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their logos"         ON storage.objects;
DROP POLICY IF EXISTS authenticated_can_delete_logos         ON storage.objects;

-- O app grava o logo em `${auth.uid()}/${timestamp}.jpg`
-- (app/(drawer)/profile/edit.tsx), então escopar pela primeira pasta do
-- caminho é mais restrito que o `authenticated` anterior e continua
-- atendendo o único fluxo de upload existente.
CREATE POLICY "logos_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "logos_update_own_folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "logos_delete_own_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
