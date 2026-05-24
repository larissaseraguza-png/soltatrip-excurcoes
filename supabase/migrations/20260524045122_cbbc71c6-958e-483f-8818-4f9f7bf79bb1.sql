
-- Payment configuration for organizers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_recipient text,
  ADD COLUMN IF NOT EXISTS pix_qr_url text,
  ADD COLUMN IF NOT EXISTS payment_links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Security-definer RPC so passengers (and staff) of a published or booked excursão
-- can read the organizer's public payment info without exposing the entire profile.
CREATE OR REPLACE FUNCTION public.get_excursao_payment_info(p_excursao_id uuid)
RETURNS TABLE (
  pix_key text,
  pix_recipient text,
  pix_qr_url text,
  payment_links jsonb,
  organizer_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.pix_key, p.pix_recipient, p.pix_qr_url, p.payment_links,
         COALESCE(p.company_name, p.full_name) AS organizer_name
  FROM public.excursoes e
  JOIN public.profiles p ON p.id = e.organizer_id
  WHERE e.id = p_excursao_id
    AND (
      e.organizer_id = auth.uid()
      OR e.status = 'publicada'
      OR public.has_booking_for_excursao(e.id, auth.uid())
      OR public.is_active_staff(e.id, auth.uid())
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_excursao_payment_info(uuid) TO authenticated;
