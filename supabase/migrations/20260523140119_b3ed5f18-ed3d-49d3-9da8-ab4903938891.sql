CREATE OR REPLACE FUNCTION public.organizer_update_passageiro_trip_choices(
  p_passageiro_id uuid,
  p_seat_id uuid DEFAULT NULL,
  p_update_seat boolean DEFAULT false,
  p_ponto_embarque_id uuid DEFAULT NULL,
  p_update_ponto boolean DEFAULT false
)
RETURNS public.passageiros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pax public.passageiros%ROWTYPE;
  v_new_seat public.seats%ROWTYPE;
  v_result public.passageiros%ROWTYPE;
BEGIN
  SELECT * INTO v_pax
  FROM public.passageiros
  WHERE id = p_passageiro_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'passageiro_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.excursoes e
    WHERE e.id = v_pax.excursao_id
      AND e.organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_update_ponto THEN
    IF p_ponto_embarque_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.pontos_embarque pe
      WHERE pe.id = p_ponto_embarque_id
        AND pe.excursao_id = v_pax.excursao_id
    ) THEN
      RAISE EXCEPTION 'invalid_boarding_point';
    END IF;
  END IF;

  IF p_update_seat THEN
    IF p_seat_id IS NOT NULL THEN
      SELECT * INTO v_new_seat
      FROM public.seats
      WHERE id = p_seat_id
        AND excursao_id = v_pax.excursao_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'seat_not_found';
      END IF;

      IF v_new_seat.occupied = true
         AND v_new_seat.passageiro_id IS NOT NULL
         AND v_new_seat.passageiro_id <> v_pax.id THEN
        RAISE EXCEPTION 'seat_already_taken';
      END IF;
    END IF;

    IF v_pax.seat_id IS NOT NULL AND v_pax.seat_id IS DISTINCT FROM p_seat_id THEN
      UPDATE public.seats
      SET occupied = false,
          reserved_by = NULL,
          passageiro_id = NULL,
          updated_at = now()
      WHERE id = v_pax.seat_id
        AND passageiro_id = v_pax.id;
    END IF;

    IF p_seat_id IS NOT NULL THEN
      UPDATE public.seats
      SET occupied = true,
          reserved_by = COALESCE(v_pax.user_id, v_pax.comprador_id),
          passageiro_id = v_pax.id,
          updated_at = now()
      WHERE id = p_seat_id;
    END IF;
  END IF;

  UPDATE public.passageiros
  SET seat_id = CASE WHEN p_update_seat THEN p_seat_id ELSE seat_id END,
      assento = CASE WHEN p_update_seat THEN v_new_seat.seat_number ELSE assento END,
      ponto_embarque_id = CASE WHEN p_update_ponto THEN p_ponto_embarque_id ELSE ponto_embarque_id END,
      updated_at = now()
  WHERE id = v_pax.id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;