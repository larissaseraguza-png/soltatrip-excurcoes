-- Trigger para travar ponto_embarque_id e seat_id após primeira escolha pelo passageiro
CREATE OR REPLACE FUNCTION public.lock_passageiro_choices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_organizer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.excursoes e
    WHERE e.id = NEW.excursao_id AND e.organizer_id = auth.uid()
  ) INTO v_is_organizer;

  -- Organizador pode mudar livremente
  IF v_is_organizer THEN
    RETURN NEW;
  END IF;

  -- Bloqueia troca de ponto de embarque após definido
  IF OLD.ponto_embarque_id IS NOT NULL
     AND NEW.ponto_embarque_id IS DISTINCT FROM OLD.ponto_embarque_id THEN
    RAISE EXCEPTION 'boarding_point_locked';
  END IF;

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
$$;

DROP TRIGGER IF EXISTS trg_lock_passageiro_choices ON public.passageiros;
CREATE TRIGGER trg_lock_passageiro_choices
BEFORE UPDATE ON public.passageiros
FOR EACH ROW
EXECUTE FUNCTION public.lock_passageiro_choices();

-- Trigger para travar liberação de poltrona pelo próprio passageiro
CREATE OR REPLACE FUNCTION public.lock_seat_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Se já estava ocupada por alguém, não permite liberar/trocar via passageiro
  IF OLD.occupied = true AND OLD.passageiro_id IS NOT NULL THEN
    IF NEW.occupied = false OR NEW.passageiro_id IS DISTINCT FROM OLD.passageiro_id THEN
      RAISE EXCEPTION 'seat_locked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_seat_changes ON public.seats;
CREATE TRIGGER trg_lock_seat_changes
BEFORE UPDATE ON public.seats
FOR EACH ROW
EXECUTE FUNCTION public.lock_seat_changes();