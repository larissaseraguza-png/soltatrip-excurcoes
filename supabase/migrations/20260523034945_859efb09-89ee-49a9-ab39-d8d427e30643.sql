
-- Add address and reference fields to boarding points
ALTER TABLE public.pontos_embarque
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS referencia text;

-- Allow passengers to view boarding points of published excursoes or of excursoes they booked
CREATE POLICY "Passengers view pontos of published"
  ON public.pontos_embarque FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.excursoes e
      WHERE e.id = pontos_embarque.excursao_id
        AND (e.status = 'publicada' OR public.has_booking_for_excursao(e.id, auth.uid()))
    )
  );
