-- Modelo da mensagem de cobrança, por academia.
--
-- O texto que ia no WhatsApp era o que eu escrevi, não o do dono. Cobrança é
-- assunto delicado e cada academia fala de um jeito.
--
-- O Pix copia e cola NÃO faz parte do modelo: é anexado depois, para o dono
-- não precisar saber colar marcador nenhum e para não conseguir quebrar o
-- código sem querer.

alter table public.gym_profiles
  add column if not exists collection_message text;

comment on column public.gym_profiles.collection_message is
  'Modelo da mensagem de cobrança, com os marcadores {nome}, {meses} e '
  '{valor}. Nulo usa o texto padrão do app. O Pix copia e cola é anexado '
  'depois, fora do modelo.';
