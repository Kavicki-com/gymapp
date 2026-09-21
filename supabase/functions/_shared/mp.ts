// Utilidades compartilhadas das Edge Functions de assinatura (Mercado Pago).
//
// Portado de reforma-ai/supabase/functions/_shared/mp.ts com três mudanças:
//  1. O CORS restrito passa a ser REALMENTE usado. No original, corsHeadersFor()
//     existia mas json() respondia com "*", então a restrição não valia nada.
//  2. Sem fallback para domínio do krovo.
//  3. gymOf(): resolve o usuário logado para a academia dele. A assinatura é
//     pendurada em gym_id, não em user_id.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2"

// Secrets costumam vir colados do painel com aspas/\n; limpamos.
export function env(name: string): string {
  return (Deno.env.get(name) || "").trim().replace(/^["']|["']$/g, "")
}

/** Origem da página de assinatura. Sem isto configurado, nada é liberado. */
export function appOrigin(): string {
  const raw = env("APP_URL")
  try { return new URL(raw).origin } catch { return "" }
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const allowed = new Set(
    [appOrigin(), "http://localhost:5173", "http://localhost:8080"].filter(Boolean),
  )
  const origin = req.headers.get("Origin") || ""
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : (appOrigin() || "null"),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

export function json(req: Request, obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeadersFor(req), "content-type": "application/json" },
  })
}

export const MP_API = "https://api.mercadopago.com"

function mpSuffix(): "PROD" | "TEST" {
  return env("MP_ENV").toLowerCase() === "production" ? "PROD" : "TEST"
}

export function mpAccessToken(): string {
  return env(`MP_ACCESS_TOKEN_${mpSuffix()}`) || env("MP_ACCESS_TOKEN")
}

export function mpWebhookSecret(): string {
  return env(`MP_WEBHOOK_SECRET_${mpSuffix()}`) || env("MP_WEBHOOK_SECRET")
}

/** Cliente com service role: ignora RLS e passa pelo guard_collections_enabled. */
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Valida o JWT do usuário e devolve o user. */
export async function getUser(req: Request, admin: SupabaseClient) {
  const auth = req.headers.get("Authorization") || ""
  const token = auth.replace(/^Bearer\s+/i, "")
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/** Academia do usuário logado. A assinatura pertence à academia. */
export async function gymOf(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("gym_profiles")
    .select("id, gym_name")
    .eq("user_id", userId)
    .maybeSingle()
  return data as { id: string; gym_name: string } | null
}

export async function mpFetch(path: string, init: RequestInit = {}) {
  const resp = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${mpAccessToken()}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  })
  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, data }
}
