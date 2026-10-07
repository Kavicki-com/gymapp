# Assinatura do SaaS (Mercado Pago)

A academia paga o GymApp para ter a aba Cobranças. Portado do `reforma-ai`.

**Não confundir as duas tabelas de plano.** `public.plans` são as mensalidades
que a academia cobra do aluno — conceito central do produto. `billing_plans` é a
assinatura que a academia paga para nós. Na UI, isto se chama **Assinatura**,
nunca "plano".

## Como o acesso liga e desliga

```
webhook do MP → subscriptions.status = 'active'
              → trigger subscriptions_sync_access
              → sync_collections_access()   [SECURITY DEFINER, roda como postgres]
              → UPDATE gym_profiles.collections_enabled
              → guard_collections_enabled vê current_user = postgres → passa
```

`collections_enabled` é **derivada**: `collections_comp OR assinatura ativa`.

- `collections_comp` = cortesia, marcada à mão por quem opera o produto.
- Cancelar assinatura **não** derruba cortesia.
- O dono não consegue ligar nenhuma das duas — o guard bloqueia (testado).

### Dar ou tirar cortesia

Sempre pela função. Um `update` solto em `collections_comp` **não tem efeito
nenhum**, porque o recálculo não é automático do lado de `gym_profiles` (um
trigger ali recursaria).

```sql
select public.set_collections_comp('<gym_id>', true);   -- devolve o acesso resultante
```

## Configuração

### Aplicação no painel do MP

Em **Criar aplicação**, escolher a solução **"Assinaturas"** — não "Checkout
Transparente". Assinaturas (`/preapproval`) é um produto distinto: não passa pela
API de Orders nem pela API de Pagamentos, então o campo "Tipo de API" não se
aplica. Escolher Checkout Transparente aqui arrisca o painel de webhooks não
oferecer os eventos `subscription_preapproval` e `subscription_authorized_payment`.

Aplicação escolhida errada não prende nada: cria outra e troca o Access Token.

### Secrets no Supabase

| Secret | Valor |
|---|---|
| `APP_URL` | `https://gymapp.kavicki.com` |
| `MP_ACCESS_TOKEN_TEST` | Access token de teste do MP |
| `MP_WEBHOOK_SECRET_TEST` | Secret que o MP gera ao cadastrar o webhook |
| `MP_ACCESS_TOKEN_PROD` | só quando for para produção |
| `MP_WEBHOOK_SECRET_PROD` | só quando for para produção |
| `MP_ENV` | **deixar sem definir** enquanto for teste; `production` para valer |

`APP_URL` é obrigatória: sem ela o CORS bloqueia tudo. O fallback de domínio que
existia no `reforma-ai` foi removido de propósito.

### verify_jwt por função

| Função | verify_jwt | Porquê |
|---|---|---|
| `mp-webhook` | **false** | O Mercado Pago não manda JWT do Supabase. Com verify_jwt ligado, todo evento leva 401 e a assinatura nunca liga — silenciosamente. |
| `mp-subscribe-card` | true | Exige usuário logado. |
| `mp-manage-subscription` | true | Exige usuário logado. |

### Webhook no painel do MP

URL a cadastrar:

```
https://mvmmxkkllufoqtnyiqwm.supabase.co/functions/v1/mp-webhook
```

Eventos: `subscription_preapproval` e `subscription_authorized_payment`.
O secret gerado vai para `MP_WEBHOOK_SECRET_TEST`/`_PROD`.

### Página de contratação

`site-gymapp/assinatura.html` → `https://gymapp.kavicki.com/assinatura.html`

Preencher `MP_PUBLIC_KEY` no topo do script. O site é estático e a pasta local é
o que está publicado.

## Regra da Apple

**O app iOS não pode linkar para a página de assinatura nem citar preço.** A
venda acontece fora do app (WhatsApp, email). A página é só o destino de quem já
decidiu. Link clicável dentro do app custa 15% de comissão e obriga a construir
IAP junto; texto estático é 0%.

## Testar sem Mercado Pago

A cadeia toda pode ser exercitada sem credencial nenhuma, simulando o que o
webhook faria:

```sql
-- liga
insert into public.subscriptions (gym_id, plan_code, status)
values ('<gym_id>', 'cobrancas_mensal', 'active');

-- desliga
update public.subscriptions set status = 'cancelled' where gym_id = '<gym_id>';
```

A aba aparece e some no app. Se isso passa, o que resta é plumbing do MP.

## Preço

Está em `billing_plans.amount` (R$ 9,90/mês). A Edge Function lê dali e **ignora
qualquer valor mandado pelo navegador**. Para mudar:

```sql
update public.billing_plans set amount = <novo> where code = 'cobrancas_mensal';
```

Plano anual (`cobrancas_anual`, R$ 118,80, sem desconto) existe desde 07/10/2026,
no cartão (preapproval com `frequency: 12`) e no Pix.

## Pix (avulso)

Decidido em 07/10/2026. Cada Pix libera 1 mês ou 12 e **não renova sozinho**.

```
mp-pay-pix  → POST /v1/payments (pix, QR vale 30 min)
            → subscription_payments (kind 'pix', plan_code)  ← é o que marca o Pix como nosso
pagou       → mp-webhook (evento "payment")  ┐ os dois chamam _shared/pix.ts,
            → mp-pay-pix action "check"      ┘ que lê o pagamento NO MP e liga
            → subscriptions: kind 'pix', status 'active', current_period_end += 1 ou 12 meses
venceu      → cron pix-expirar (de hora em hora) → status 'expired' → trigger desliga a aba
```

- Renovar antes de vencer soma ao fim do período atual.
- O mesmo Pix nunca estende duas vezes: a trava é o update condicional de
  `subscription_payments.status` para `approved`.
- Pix aprovado com cartão já ativo **não** sobrescreve: loga "estornar" e
  o estorno é manual.
- O evento `payment` também chega para cobranças do cartão; o código ignora
  qualquer pagamento que não tenha linha `kind = 'pix'`.

### Lembretes (`pix-lembretes`, cron diário 12:00 UTC)

7, 5 e 3 dias antes de `current_period_end`, e um aviso depois da desativação.
Email (Resend) com preço e link; push **sem preço nem link** (regra da Apple).
`subscription_reminders` impede duplicado. Sem `RESEND_API_KEY`, vai só o push.

| Secret | Valor |
|---|---|
| `RESEND_API_KEY` | chave do Resend |
| `EMAIL_FROM` | opcional; padrão `GymApp <assinatura@gymapp.kavicki.com>` |

| Função | verify_jwt |
|---|---|
| `mp-pay-pix` | true |
| `pix-lembretes` | **false** (o cron chama sem Authorization; é idempotente) |

No painel do MP, além dos eventos de assinatura, marcar **Pagamentos**. O
`mp-pay-pix` também manda `notification_url` em cada pagamento.
