# GymApp — o que colar em cada loja (versão 1.3.0)

Publicação no Brasil, em pt-BR. O app é grátis; o único recurso pago é a aba
Cobranças, por assinatura mensal ou anual **comprada dentro do app** (App
Store / Google Play, via RevenueCat). Quem já paga por cartão ou Pix pelo
site continua liberado pelo banco — isso não aparece nas lojas.

1. Textos que as duas lojas usam
2. App Store Connect (iOS)
3. Google Play Console (Android)
4. Contas por trás do app
5. Arquivos desta pasta

---

## 1. Textos que as duas lojas usam

### Descrição

```
Alunos, planos, mensalidades e quem está devendo, num só lugar. E a cobrança sai pelo WhatsApp, com o Pix já dentro da mensagem.

O GymApp é feito para o dono de academia, estúdio e CT que hoje controla tudo em caderno, planilha ou de cabeça.

NO INÍCIO, O MÊS INTEIRO
• Quanto já entrou e quanto ainda falta receber no mês
• Quem está em atraso e quanto isso soma
• Salários a pagar nos próximos dias e a margem depois deles
• Aniversariantes da semana

ALUNOS E PLANOS
• Cadastro do aluno com plano, dia de vencimento e contato
• Ficha com os meses pagos e em aberto e o histórico de pagamentos
• Pagamento registrado em um toque, com adiantamento e desconto
• Trancamento de mensalidade com data de volta
• Planos com preço e serviços, e quantos alunos em cada um
• Colaboradores com salário e dia de pagamento

COBRANÇAS (ASSINATURA)
• A lista de quem está devendo de verdade: cadastro antigo e aluno que já saiu ficam fora da conta
• Cobrança em sequência, um aluno por vez, com a mensagem pronta no seu jeito de falar
• Pix copia e cola com o valor já preenchido. O dinheiro vai direto para a sua conta; o app não recebe nada no meio
• O registro de quem você já cobrou e há quantos dias
• Quantos pagaram depois de serem cobrados, e quanto isso recuperou no mês

A aba Cobranças é uma assinatura mensal ou anual, com renovação automática, cobrada na sua conta da loja. Você cancela quando quiser nos ajustes da loja, e o restante do app continua grátis.
```

### Novidades da versão 1.3.0

```
Um GymApp novo, mais rápido de usar no dia a dia:
• Visual novo, do Início ao cadastro
• Barra com Início, Alunos, Cobranças, Planos e Mais
• Pagamento registrado em uma janela só, sem sair da ficha
• A assinatura da aba Cobranças agora é feita dentro do app, mensal ou anual
```

### Links

| Campo                   | Valor                                  |
| ----------------------- | -------------------------------------- |
| Política de privacidade | https://gymapp.kavicki.com/privacy.html |
| Termos de uso (EULA)    | https://gymapp.kavicki.com/terms.html   |
| Site / marketing        | https://gymapp.kavicki.com              |
| Suporte                 | https://gymapp.kavicki.com/support.html |
| E-mail de suporte       | design@kavicki.com                      |

### Assinatura (RevenueCat: entitlement `gymapp_cobrancas`, offering `default`)

| Loja        | Produto                                                | Período | Preço     |
| ----------- | ------------------------------------------------------ | ------- | --------- |
| App Store   | `gymapp_cobrancas_mensal`                              | 1 mês   | R$ 11,90  |
| App Store   | `gymapp_cobrancas_anual`                               | 1 ano   | R$ 139,90 |
| Google Play | `gymapp_cobrancas`, plano base `mensal`                | 1 mês   | R$ 11,90  |
| Google Play | `gymapp_cobrancas`, plano base `anual-1`               | 1 ano   | R$ 139,90 |

Os preços repassam a comissão de 15% sobre os R$ 9,90 / R$ 118,80 do site.
Sem trial. O "anual" no ID é o que o webhook usa para saber o período — não
renomear.

No Google o plano anual é `anual-1`: o `anual` original foi criado por engano
com período mensal e está desativado — ID de plano básico não pode ser
reaproveitado. No RevenueCat o produto é `gymapp_cobrancas:anual-1`.

---

## 2. App Store Connect (iOS)

### Versão 1.3.0

- Capturas iPhone 6,9": `appstore-iphone-1-inicio.png` … `-5-resultado.png`
  (1179×2556). O iPad pode reaproveitar as mesmas enquanto não houver
  capturas próprias de iPad.
- Texto promocional (opcional): `Cobre quem está atrasado pelo WhatsApp, com o Pix já na mensagem.`
- **Compras dentro do app e assinaturas:** marcar as duas assinaturas do
  grupo "Cobranças" — a primeira assinatura só vai para revisão junto com
  uma versão.

### Assinaturas (Monetização > Assinaturas > grupo "Cobranças")

- Nome do grupo (pt-BR): `GymApp Cobranças`, usar o nome do app.
- Cada assinatura: nome de exibição `Cobranças – mensal` / `Cobranças – anual`,
  descrição `Libera a aba Cobranças por 1 mês` / `por 1 ano`.
- Disponibilidade do anual: **1 ano antecipado** (não o "mensal com
  compromisso de 12 meses").
- Captura para a revisão: `appstore-revisao-paywall-1179x2556.png`.
- Compras de vários créditos: desligado.

### Privacidade do app

Acrescentar ao que já está declarado:
- **Compras > Histórico de compras** — vinculado ao usuário, para
  funcionalidade do app (o RevenueCat registra a assinatura na conta).
- **Identificadores > ID do usuário** — vinculado, funcionalidade (o
  RevenueCat recebe o ID da conta do Supabase).
Nenhum dos dois para rastreamento.

### Informações para a revisão

- Login necessário: **sim**. Conta: `dev@kavicki.com` (academia "Google
  Gym"), senha no cofre. Desde 30/10/2026 ela está **sem cortesia**, para o
  revisor chegar à tela de compra.
- Notas:

```
Para testar a assinatura: entre com a conta acima e toque na aba Cobranças.
A tela mostra os planos mensal e anual com o preço da loja; "Assinar" abre a compra da App Store e "Restaurar compras" fica logo abaixo. Termos de Uso e Política de Privacidade estão no rodapé da tela.
Depois de assinar, a aba Cobranças libera a lista de alunos em atraso. A assinatura também aparece em Mais > Assinatura, com o botão "Gerenciar assinatura".
O app não oferece outra forma de pagamento.
```

### Artes opcionais

`appstore-busca-1920x1280.png` e `appstore-cabecalho-3840x1646.png`.

---

## 3. Google Play Console (Android)

### Ordem

1. Subir o primeiro `.aab` da 1.3.0 no **teste interno** — sem ele o Play
   Console não libera criar assinatura.
2. Monetizar > Produtos > Assinaturas: `gymapp_cobrancas` com os planos base
   `mensal` e `anual-1` (ver a tabela da seção 1), ativar.
3. RevenueCat: JSON da conta de serviço (Ver dados financeiros + Gerenciar
   pedidos e assinaturas) e o tópico do Pub/Sub em Monetização >
   Configuração de monetização > Notificações do desenvolvedor em tempo real.
4. Testadores de licença (Configuração > Teste de licença) e uma compra de
   teste instalando pelo link do teste interno.
5. Promover para produção.

### Página principal da loja

- Descrição curta (80): `Alunos, mensalidades e cobrança no WhatsApp com Pix, num só app.`
- Descrição completa: a da seção 1.
- Ícone: `play-icone-512.png`. Recurso gráfico: `play-recurso-grafico-1024x500.png`.
- Capturas de telefone: `play-captura-1-inicio.png` … `-5-resultado.png` (1080×2340).

### Segurança dos dados

Acrescentar: **Informações financeiras > Histórico de compras** — coletado,
não compartilhado, para funcionalidade do app.

---

## 4. Contas por trás do app

- **EAS:** `@kavickicom/gymapp`. Comandos sempre como `npx eas-cli@latest …`.
- **Apple:** time Jorge Kavicki (Individual) `822T2N8RMU`, bundle `com.kavicki.com.gymapp`.
- **Google Play:** pacote `com.kavicki.com.gymapp`.
- **RevenueCat:** projeto GymApp; chaves públicas em `src/config/revenuecat.ts`;
  a secreta (`sk_…`) só no secret `REVENUECAT_API_KEY` do Supabase.
- **Supabase:** `mvmmxkkllufoqtnyiqwm`; webhook `revenuecat-webhook`, sync
  `revenuecat-sync` (ver `supabase/functions/ASSINATURA.md`).

---

## 5. Arquivos desta pasta

| Arquivo                                                   | Onde vai  | O quê                             |
| --------------------------------------------------------- | --------- | --------------------------------- |
| `appstore-iphone-1-inicio.png` … `-5-resultado.png`       | App Store | capturas iPhone 6,9" (1179×2556)  |
| `appstore-revisao-paywall-1179x2556.png`                  | App Store | captura da compra para a revisão  |
| `appstore-busca-1920x1280.png`, `appstore-cabecalho-3840x1646.png` | App Store | artes opcionais         |
| `play-captura-1-inicio.png` … `-5-resultado.png`          | Play      | capturas de telefone (1080×2340)  |
| `play-recurso-grafico-1024x500.png`                       | Play      | recurso gráfico                   |
| `play-icone-512.png`                                      | Play      | ícone da página                   |
| `fontes/`                                                 | —         | telas cruas usadas nas capturas   |

**As capturas saem dos boards do Claude Design**
(https://claude.ai/artifact/LCd171ziVNv9oJggxbuati), exportados em PNG — os
dados ali são fictícios, então podem ir para a loja. Prints do aparelho
também servem, desde que numa conta só com dados de demonstração: nome de
aluno real nunca vai para a loja. Salve em `fontes/` com estes nomes:

| Arquivo           | Board do design             |
| ----------------- | --------------------------- |
| `1-inicio.png`    | Início                      |
| `2-cobrar.png`    | Cobranças — fila            |
| `3-devendo.png`   | Cobranças — lista           |
| `4-ficha.png`     | Ficha do aluno              |
| `5-resultado.png` | Cobranças — resultado       |
| `paywall.png`     | Cobranças — sem acesso (opcional; substitui a provisória) |

O script corta do topo os boards mais altos que um celular.

Depois: `python3 scripts/artes-loja.py`.
