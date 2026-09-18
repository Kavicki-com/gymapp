-- Chave Pix da academia, para o "copia e cola" na mensagem de cobrança.
--
-- Deliberadamente NÃO é integração de pagamento: o BR Code é gerado offline
-- (src/utils/pixBrCode.ts) e o dinheiro vai direto da conta do aluno para a
-- chave da academia. O app não intermedia, não recebe e não fica sabendo do
-- pagamento — a baixa continua manual.
--
-- O que isso compra por quase nada: a mensagem de cobrança sai com o valor
-- exato embutido, em vez de "me manda no pix" seguido do aluno perguntar a
-- chave e digitar o valor errado.

alter table public.gym_profiles
  add column if not exists pix_key text,
  add column if not exists pix_city text;

comment on column public.gym_profiles.pix_key is
  'Chave Pix da academia. Usada só para montar o BR Code (copia e cola) na '
  'mensagem de cobrança — o dinheiro vai direto para a academia, o app não '
  'intermedia nada.';

comment on column public.gym_profiles.pix_city is
  'Cidade do recebedor, campo 60 do BR Code. Alguns bancos recusam a leitura '
  'quando não bate com o cadastro da chave.';
