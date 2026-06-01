CREATE OR REPLACE FUNCTION public.recalc_reserva_financeiro(_reserva_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  v_pago numeric;
  v_status text;
  v_qtd integer;
  v_pago_por_passageiro numeric;
BEGIN
  IF _reserva_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(total_price, 0), GREATEST(COALESCE(quantidade, 1), 1)
    INTO v_total, v_qtd
  FROM public.reservas
  WHERE id = _reserva_id;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_pago
  FROM public.pagamentos
  WHERE reserva_id = _reserva_id
    AND status IN ('pago', 'confirmado');

  IF v_total > 0 AND v_pago >= v_total THEN
    v_status := 'paid';
  ELSIF v_pago > 0 THEN
    v_status := 'partial_payment';
  ELSE
    v_status := 'pending_payment';
  END IF;

  UPDATE public.reservas
  SET amount_paid = v_pago,
      payment_status = v_status,
      updated_at = now()
  WHERE id = _reserva_id;

  v_pago_por_passageiro := v_pago / v_qtd;

  UPDATE public.passageiros
  SET amount_paid = LEAST(COALESCE(total_price, 0), v_pago_por_passageiro),
      payment_status = CASE
        WHEN COALESCE(total_price, 0) > 0 AND v_pago_por_passageiro >= COALESCE(total_price, 0) THEN 'paid'
        WHEN v_pago_por_passageiro > 0 THEN 'partial_payment'
        ELSE 'pending_payment'
      END,
      status = CASE
        WHEN COALESCE(total_price, 0) > 0 AND v_pago_por_passageiro >= COALESCE(total_price, 0) THEN 'confirmado'
        ELSE status
      END,
      updated_at = now()
  WHERE reserva_id = _reserva_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_financeiro_on_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_reserva_id uuid;
  v_old_reserva_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_reserva_id := OLD.reserva_id;
    IF v_old_reserva_id IS NULL AND OLD.passageiro_id IS NOT NULL THEN
      SELECT reserva_id INTO v_old_reserva_id FROM public.passageiros WHERE id = OLD.passageiro_id;
    END IF;

    PERFORM public.recalc_passageiro_financeiro(OLD.passageiro_id);
    PERFORM public.recalc_reserva_financeiro(v_old_reserva_id);
    RETURN OLD;
  END IF;

  v_new_reserva_id := NEW.reserva_id;
  IF v_new_reserva_id IS NULL AND NEW.passageiro_id IS NOT NULL THEN
    SELECT reserva_id INTO v_new_reserva_id FROM public.passageiros WHERE id = NEW.passageiro_id;
  END IF;

  PERFORM public.recalc_passageiro_financeiro(NEW.passageiro_id);
  PERFORM public.recalc_reserva_financeiro(v_new_reserva_id);

  IF TG_OP = 'UPDATE' THEN
    v_old_reserva_id := OLD.reserva_id;
    IF v_old_reserva_id IS NULL AND OLD.passageiro_id IS NOT NULL THEN
      SELECT reserva_id INTO v_old_reserva_id FROM public.passageiros WHERE id = OLD.passageiro_id;
    END IF;

    IF OLD.passageiro_id IS DISTINCT FROM NEW.passageiro_id THEN
      PERFORM public.recalc_passageiro_financeiro(OLD.passageiro_id);
    END IF;
    IF v_old_reserva_id IS DISTINCT FROM v_new_reserva_id THEN
      PERFORM public.recalc_reserva_financeiro(v_old_reserva_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (SELECT DISTINCT reserva_id FROM public.pagamentos WHERE reserva_id IS NOT NULL) LOOP
    PERFORM public.recalc_reserva_financeiro(r.reserva_id);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.recalc_reserva_financeiro(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_financeiro_on_pagamento() FROM anon, authenticated, PUBLIC;