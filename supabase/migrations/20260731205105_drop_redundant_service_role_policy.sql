-- A edge function check-notifications usa SUPABASE_SERVICE_ROLE_KEY.
-- O papel service_role ignora RLS por completo, então esta policy nunca
-- foi o que concedia o acesso — ela é decorativa e só adicionava uma
-- segunda policy permissiva de SELECT para o papel authenticated,
-- avaliada em toda leitura de push_tokens.
DROP POLICY IF EXISTS "Service role can read all tokens" ON public.push_tokens;
