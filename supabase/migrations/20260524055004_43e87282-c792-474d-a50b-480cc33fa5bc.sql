ALTER TABLE public.excursao_itens
  ADD COLUMN IF NOT EXISTS inclui_excursao boolean NOT NULL DEFAULT false;