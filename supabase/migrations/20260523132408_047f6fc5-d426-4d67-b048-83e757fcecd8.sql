CREATE OR REPLACE FUNCTION public.lock_passageiro_choices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_organizer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.excursoes e
    WHERE e.id = NEW.excursao_id AND e.organizer_id = auth.uid()
  ) INTO v_is_organizer;

  IF v_is_organizer THEN
    RETURN NEW;
  END IF;

  -- Ponto de embarque pode ser alterado livremente antes da viagem.

  -- Bloqueia troca de poltrona após definida
  IF OLD.seat_id IS NOT NULL
     AND NEW.seat_id IS DISTINCT FROM OLD.seat_id THEN
    RAISE EXCEPTION 'seat_locked';
  END IF;

  IF OLD.assento IS NOT NULL
     AND NEW.assento IS DISTINCT FROM OLD.assento
     AND OLD.seat_id IS NOT NULL THEN
    RAISE EXCEPTION 'seat_locked';
  END IF;

  RETURN NEW;
END;
$function$;