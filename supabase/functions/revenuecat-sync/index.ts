import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { adminClient, getUser } from "../_shared/mp.ts"
import { sincronizar } from "../_shared/revenuecat.ts"

// O app chama logo depois de comprar ou restaurar pela loja: sincroniza a
// assinatura do usuário logado sem esperar o webhook do RevenueCat chegar.
// Só age sobre o próprio usuário (o do JWT) e relê o assinante na API do
// RevenueCat — o app não manda estado nenhum.

const resposta = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method !== "POST") return resposta({ ok: false }, 405)
  try {
    const admin = adminClient()
    const user = await getUser(req, admin)
    if (!user) return resposta({ ok: false, error: "não autenticado" }, 401)

    const resultado = await sincronizar(admin, user.id)
    console.log(`[revenuecat-sync] ${user.id} -> ${resultado}`)

    const { data: gym } = await admin
      .from("gym_profiles")
      .select("collections_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
    return resposta({ ok: true, liberado: !!gym?.collections_enabled, resultado })
  } catch (e) {
    console.error("[revenuecat-sync] exceção", String((e as Error)?.message || e))
    return resposta({ ok: false }, 500)
  }
})
