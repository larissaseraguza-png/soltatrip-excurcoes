
DROP TABLE IF EXISTS public.mensagens CASCADE;

ALTER TABLE public.excursoes
  ADD COLUMN IF NOT EXISTS whatsapp_group_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_staff_group_url text;

ALTER TABLE public.onibus
  ADD COLUMN IF NOT EXISTS whatsapp_group_url text;
