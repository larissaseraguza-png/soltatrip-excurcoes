-- Função: recalcula amount_paid e payment_status do passageiro
-- a partir da SOMA REAL dos pagamentos confirmados (status 'pago' ou 'confirmado').
-- NÃO infere valor: só soma o que foi confirmado.
CREATE OR REPLACE FUNCTION public.recalc_passageiro_financeiro(_passageiro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_pago numeric;
  v_status text;
BEGIN
  IF _passageiro_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(total_price, 0) INTO v_total
  FROM public.passageiros WHERE id = _passageiro_id;

  SELECT COALESCE(SUM(valor), 0) INTO v_pago
  FROM public.pagamentos
  WHERE passageiro_id = _passageiro_id
    AND status IN ('pago', 'confirmado');

  IF v_total > 0 AND v_pago >= v_total THEN
    v_status := 'paid';
  ELSIF v_pago > 0 THEN
    v_status := 'partial_payment';
  ELSE
    v_status := 'pending_payment';
  END IF;

  UPDATE public.passageiros
  SET amount_paid = v_pago,
      payment_status = v_status,
      updated_at = now()
  WHERE id = _passageiro_id;
END;
$$;

-- Função: recalcula amount_paid e payment_status da reserva
CREATE OR REPLACE FUNCTION public.recalc_reserva_financeiro(_reserva_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_pago numeric;
  v_status text;
BEGIN
  IF _reserva_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(total_price, 0) INTO v_total
  FROM public.reservas WHERE id = _reserva_id;

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
END;
$$;

-- Trigger: reage a INSERT/UPDATE/DELETE em pagamentos e
-- recalcula tanto passageiro quanto reserva afetados (NEW e OLD).
CREATE OR REPLACE FUNCTION public.sync_financeiro_on_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_passageiro_financeiro(OLD.passageiro_id);
    PERFORM public.recalc_reserva_financeiro(OLD.reserva_id);
    RETURN OLD;
  END IF;

  -- INSERT ou UPDATE: recalcula NEW e, se mudou de passageiro/reserva, OLD também
  PERFORM public.recalc_passageiro_financeiro(NEW.passageiro_id);
  PERFORM public.recalc_reserva_financeiro(NEW.reserva_id);

  IF TG_OP = 'UPDATE' THEN
    IF OLD.passageiro_id IS DISTINCT FROM NEW.passageiro_id THEN
      PERFORM public.recalc_passageiro_financeiro(OLD.passageiro_id);
    END IF;
    IF OLD.reserva_id IS DISTINCT FROM NEW.reserva_id THEN
      PERFORM public.recalc_reserva_financeiro(OLD.reserva_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_financeiro_on_pagamento ON public.pagamentos;
CREATE TRIGGER trg_sync_financeiro_on_pagamento
AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.sync_financeiro_on_pagamento();

-- Backfill: recalcula todas as reservas e passageiros com pagamentos existentes
DO $$
DECLARE r record;
BEGIN
  FOR r IN (SELECT DISTINCT passageiro_id FROM public.pagamentos WHERE passageiro_id IS NOT NULL) LOOP
    PERFORM public.recalc_passageiro_financeiro(r.passageiro_id);
  END LOOP;
  FOR r IN (SELECT DISTINCT reserva_id FROM public.pagamentos WHERE reserva_id IS NOT NULL) LOOP
    PERFORM public.recalc_reserva_financeiro(r.reserva_id);
  END LOOP;
END $$;

-- Garantir que estas funções SECURITY DEFINER internas não fiquem expostas
REVOKE EXECUTE ON FUNCTION public.recalc_passageiro_financeiro(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_reserva_financeiro(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_financeiro_on_pagamento() FROM anon, authenticated;