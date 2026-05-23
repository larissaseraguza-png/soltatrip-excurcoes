
-- Função que recalcula amount_paid e payment_status do passageiro
CREATE OR REPLACE FUNCTION public.recalc_passageiro_payments(_passageiro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_paid numeric;
  v_new_status text;
BEGIN
  IF _passageiro_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_paid
  FROM public.pagamentos
  WHERE passageiro_id = _passageiro_id
    AND status IN ('pago', 'confirmado');

  SELECT total_price INTO v_total FROM public.passageiros WHERE id = _passageiro_id;

  v_new_status := CASE
    WHEN v_total > 0 AND v_paid >= v_total THEN 'paid'
    WHEN v_paid > 0 THEN 'partial_payment'
    ELSE 'pending_payment'
  END;

  UPDATE public.passageiros
     SET amount_paid = v_paid,
         payment_status = v_new_status,
         status = CASE WHEN v_new_status = 'paid' THEN 'confirmado' ELSE status END,
         updated_at = now()
   WHERE id = _passageiro_id;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.sync_passageiro_on_pagamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_passageiro_payments(OLD.passageiro_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalc_passageiro_payments(NEW.passageiro_id);
  IF TG_OP = 'UPDATE' AND OLD.passageiro_id IS DISTINCT FROM NEW.passageiro_id THEN
    PERFORM public.recalc_passageiro_payments(OLD.passageiro_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_passageiro_on_pagamento ON public.pagamentos;
CREATE TRIGGER trg_sync_passageiro_on_pagamento
AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.sync_passageiro_on_pagamento();

-- Recalcular para todos os passageiros existentes (sincronização inicial)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT passageiro_id FROM public.pagamentos WHERE passageiro_id IS NOT NULL LOOP
    PERFORM public.recalc_passageiro_payments(r.passageiro_id);
  END LOOP;
END $$;
