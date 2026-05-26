
ALTER TABLE public.excursoes
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS data_fim date;

ALTER TABLE public.onibus
  ADD COLUMN IF NOT EXISTS custo numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.locais_salvos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL,
  nome text NOT NULL,
  endereco text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locais_salvos TO authenticated;
GRANT ALL ON public.locais_salvos TO service_role;

ALTER TABLE public.locais_salvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer manages own locais"
  ON public.locais_salvos
  FOR ALL
  TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_locais_salvos_org ON public.locais_salvos(organizer_id, nome);

CREATE TRIGGER touch_locais_salvos_updated_at
  BEFORE UPDATE ON public.locais_salvos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
