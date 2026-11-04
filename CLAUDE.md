# GymApp

Fatos conferidos nos arquivos e no git em 2026-11-04. Nada aqui foi confirmado nas lojas ou nos consoles. Repositório público: nunca versionar segredos nem dados de academias e alunos.

## 1. O que é

App para dono de academia, estúdio e CT controlar alunos, planos, mensalidades, inadimplência e colaboradores, e cobrar pelo WhatsApp com Pix (`store/textos-loja.md`). O app é grátis; a aba Cobranças é paga por assinatura.

## 2. Stack

- Expo `~57.0.31`, React Native `0.86.3`, React `19.2.3`, Expo Router `~57.0.29`, TypeScript `~6.0.3`, styled-components `^6.3.6`.
- Supabase (`@supabase/supabase-js` `^2.90.1`): Postgres, Auth, Storage e Edge Functions em `supabase/functions`.
- Assinatura: RevenueCat (`react-native-purchases` `10.10.2`) e Mercado Pago, que convivem (`supabase/functions/ASSINATURA.md`).
- Versão em `app.json`: `1.3.1`. `package.json` segue em `1.0.0` e não acompanha a versão do app.
- Sem scripts de teste ou lint em `package.json`.

Regras de trabalho:

- `npm start`; comandos do EAS sempre como `npx eas-cli@latest` (`store/textos-loja.md`).
- `public.plans` são as mensalidades do aluno; `billing_plans` é a assinatura da academia. Na UI, a segunda se chama "Assinatura", nunca "plano" (`ASSINATURA.md`).
- Cortesia da aba Cobranças só pela função descrita em `ASSINATURA.md`.
- Fonte da verdade do banco: banco + `supabase/migrations/`. `supabase/legacy/` é histórico, não executar; o `MIGRATION_GUIDE.md` aponta para esse legado.
- Mudança de RLS: rodar o harness de `supabase/README.md` antes e depois.
- Artes de loja: `python3 scripts/artes-loja.py`.

## 3. Situação real

**Situação nas lojas: não determinado pelos arquivos.** Falta link público de loja, nota de publicação ou registro de status do console. O repositório não traz nenhum link `apps.apple.com` ou `play.google.com/store`.

| Fato | Evidência |
| --- | --- |
| Android 1.3.0 em **teste interno** na data, com compra anual de teste | `13cec0a` (2026-10-30) |
| Ordem do Play Console: teste interno, depois promover para produção. A promoção não está registrada | `store/textos-loja.md`, `ddf88b2` (2026-10-30) |
| iOS: ajustes para a submissão da 1.2.0. Envio e aprovação não estão registrados | `4bd9c64` (2026-09-21) |
| Listagem provavelmente já existente (indício): os textos dizem "acrescentar ao que já está declarado" | `store/textos-loja.md`, `3de978a` (2026-10-30) |
| Release 1.3.1 no código; nada sobre build ou envio | `36791f6` (2026-11-04) |
| Backend em produção, com assinatura real via Mercado Pago | `supabase/README.md`; `f4a3588` (2026-09-24) |
| Site `gymapp.kavicki.com` publicado segundo as mensagens de commit. A pasta `site-gymapp` não está neste repo | `f138fa3` (2026-11-03), `36791f6` |

`submit.production` em `eas.json` é configuração, não prova de publicação.

## 4. Em andamento

- Branch `main`, igual a `origin/main`, em `b964bc9` (2026-11-04).
- Não commitado: só `scripts/__pycache__/`, não rastreada.
- Últimas entregas: 1.3.1 com link do Pix e política atualizada (`36791f6`); Pix por link no WhatsApp (`f138fa3`); redesign e compra pela loja com RevenueCat (`f9cbeb3`, `ec96d41`, PR #6). `expo-updates` entrou e saiu em 2026-11-03 (`51d308c`, `390e1b1`).
- Branches locais e remotas: nenhuma com commits à frente de `main`.

## 5. Pendências

- Gerar e enviar a 1.3.1; `store/textos-loja.md` ainda descreve a 1.3.0.
- Confirmar a passagem do teste interno para produção no Play Console.
- `ec96d41` (2026-10-30) registra "ainda não aplicado em produção" para a migration `store_subscriptions`; a aplicação posterior não está registrada.
- Pendências de infraestrutura e de segurança: ver código e `supabase/README.md`, seção "Pendências conhecidas". O item 3 de lá cita `app/equipment-details.tsx`, que não existe mais nesse caminho; revisar.
- Sem TODO/FIXME/HACK/XXX no código.
- Acrescentar `__pycache__` ao `.gitignore`.
