DROP TRIGGER IF EXISTS trg_ensure_seats ON public.excursoes;
DROP FUNCTION IF EXISTS public.ensure_seats_for_excursao() CASCADE;