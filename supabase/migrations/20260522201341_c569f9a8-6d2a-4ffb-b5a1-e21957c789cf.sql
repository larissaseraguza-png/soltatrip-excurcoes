
CREATE TABLE public.pontos_embarque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL REFERENCES public.excursoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  horario text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pontos_embarque_excursao ON public.pontos_embarque(excursao_id);

ALTER TABLE public.pontos_embarque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers view pontos" ON public.pontos_embarque FOR SELECT
USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = pontos_embarque.excursao_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Organizers insert pontos" ON public.pontos_embarque FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = pontos_embarque.excursao_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Organizers update pontos" ON public.pontos_embarque FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = pontos_embarque.excursao_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Organizers delete pontos" ON public.pontos_embarque FOR DELETE
USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = pontos_embarque.excursao_id AND e.organizer_id = auth.uid()));

ALTER TABLE public.passageiros
  ADD COLUMN IF NOT EXISTS ponto_embarque_id uuid REFERENCES public.pontos_embarque(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_passageiros_ponto ON public.passageiros(ponto_embarque_id);
