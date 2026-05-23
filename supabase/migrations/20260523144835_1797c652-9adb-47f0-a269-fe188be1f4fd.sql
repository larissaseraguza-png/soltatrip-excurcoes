
ALTER TABLE public.passageiros ADD COLUMN IF NOT EXISTS observacao_interna text;

CREATE OR REPLACE FUNCTION public.organizer_create_manual_passageiro(
  p_excursao_id uuid,
  p_nome text,
  p_telefone text DEFAULT NULL,
  p_documento text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_seat_id uuid DEFAULT NULL,
  p_ponto_embarque_id uuid DEFAULT NULL,
  p_total_price numeric DEFAULT 0,
  p_amount_paid numeric DEFAULT 0,
  p_payment_status text DEFAULT 'pending_payment',
  p_status text DEFAULT 'pendente',
  p_observacao_interna text DEFAULT NULL
) RETURNS public.passageiros
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pax public.passageiros%ROWTYPE;
  v_seat public.seats%ROWTYPE;
  v_assento text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.excursoes
    WHERE id = p_excursao_id AND organizer_id = v_uid
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_seat_id IS NOT NULL THEN
    SELECT * INTO v_seat
    FROM public.seats
    WHERE id = p_seat_id AND excursao_id = p_excursao_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'seat_not_found';
    END IF;

    IF v_seat.occupied = true AND v_seat.passageiro_id IS NOT NULL THEN
      RAISE EXCEPTION 'seat_already_taken';
    END IF;

    v_assento := v_seat.seat_number;
  END IF;

  IF p_ponto_embarque_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pontos_embarque
    WHERE id = p_ponto_embarque_id AND excursao_id = p_excursao_id
  ) THEN
    RAISE EXCEPTION 'invalid_boarding_point';
  END IF;

  INSERT INTO public.passageiros (
    excursao_id, comprador_id, nome, telefone, documento, email,
    seat_id, assento, ponto_embarque_id,
    total_price, amount_paid, payment_status, status, observacao_interna
  ) VALUES (
    p_excursao_id, v_uid, p_nome, p_telefone, p_documento, p_email,
    p_seat_id, v_assento, p_ponto_embarque_id,
    COALESCE(p_total_price, 0),
    COALESCE(p_amount_paid, 0),
    COALESCE(p_payment_status, 'pending_payment'),
    COALESCE(p_status, 'pendente'),
    p_observacao_interna
  )
  RETURNING * INTO v_pax;

  IF p_seat_id IS NOT NULL THEN
    UPDATE public.seats
       SET occupied = true,
           passageiro_id = v_pax.id,
           reserved_by = v_uid,
           updated_at = now()
     WHERE id = p_seat_id;
  END IF;

  IF COALESCE(p_amount_paid, 0) > 0 THEN
    INSERT INTO public.pagamentos (
      excursao_id, passageiro_id, valor, metodo, status, observacao, pago_em
    ) VALUES (
      p_excursao_id, v_pax.id, p_amount_paid, 'manual', 'confirmado',
      'Pagamento manual registrado pelo organizador', now()
    );
  END IF;

  RETURN v_pax;
END;
$$;
