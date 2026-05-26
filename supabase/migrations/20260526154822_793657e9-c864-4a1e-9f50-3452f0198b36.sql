
-- Trigger: bloquear alteração de campos sensíveis em passageiros por compradores/passageiros
CREATE OR REPLACE FUNCTION public.guard_passageiro_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_organizer boolean;
  v_is_staff boolean;
BEGIN
  -- Sem sessão (ex.: chamadas internas via SECURITY DEFINER) — permite.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.excursoes e
    WHERE e.id = NEW.excursao_id AND e.organizer_id = v_uid
  ) INTO v_is_organizer;

  IF v_is_organizer THEN
    RETURN NEW;
  END IF;

  SELECT public.is_active_staff(NEW.excursao_id, v_uid) INTO v_is_staff;
  IF v_is_staff THEN
    RETURN NEW;
  END IF;

  -- Para compradores / passageiros: proibir alteração dos campos sensíveis
  IF NEW.payment_status     IS DISTINCT FROM OLD.payment_status     THEN RAISE EXCEPTION 'field_locked: payment_status'; END IF;
  IF NEW.amount_paid        IS DISTINCT FROM OLD.amount_paid        THEN RAISE EXCEPTION 'field_locked: amount_paid'; END IF;
  IF NEW.total_price        IS DISTINCT FROM OLD.total_price        THEN RAISE EXCEPTION 'field_locked: total_price'; END IF;
  IF NEW.status             IS DISTINCT FROM OLD.status             THEN RAISE EXCEPTION 'field_locked: status'; END IF;
  IF NEW.qr_code            IS DISTINCT FROM OLD.qr_code            THEN RAISE EXCEPTION 'field_locked: qr_code'; END IF;
  IF NEW.observacao_interna IS DISTINCT FROM OLD.observacao_interna THEN RAISE EXCEPTION 'field_locked: observacao_interna'; END IF;
  IF NEW.embarcado_em       IS DISTINCT FROM OLD.embarcado_em       THEN RAISE EXCEPTION 'field_locked: embarcado_em'; END IF;
  IF NEW.excursao_id        IS DISTINCT FROM OLD.excursao_id        THEN RAISE EXCEPTION 'field_locked: excursao_id'; END IF;
  IF NEW.comprador_id       IS DISTINCT FROM OLD.comprador_id       THEN RAISE EXCEPTION 'field_locked: comprador_id'; END IF;
  IF NEW.reserva_id         IS DISTINCT FROM OLD.reserva_id         THEN RAISE EXCEPTION 'field_locked: reserva_id'; END IF;
  IF NEW.user_id            IS DISTINCT FROM OLD.user_id            THEN RAISE EXCEPTION 'field_locked: user_id'; END IF;
  IF NEW.convite_token      IS DISTINCT FROM OLD.convite_token      THEN RAISE EXCEPTION 'field_locked: convite_token'; END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_passageiro_sensitive_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_passageiro_sensitive_fields_trg ON public.passageiros;
CREATE TRIGGER guard_passageiro_sensitive_fields_trg
BEFORE UPDATE ON public.passageiros
FOR EACH ROW
EXECUTE FUNCTION public.guard_passageiro_sensitive_fields();


-- Trigger: bloquear alteração de campos sensíveis em reservas pelo comprador
CREATE OR REPLACE FUNCTION public.guard_reserva_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_organizer boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.excursoes e
    WHERE e.id = NEW.excursao_id AND e.organizer_id = v_uid
  ) INTO v_is_organizer;

  IF v_is_organizer THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN RAISE EXCEPTION 'field_locked: payment_status'; END IF;
  IF NEW.amount_paid    IS DISTINCT FROM OLD.amount_paid    THEN RAISE EXCEPTION 'field_locked: amount_paid'; END IF;
  IF NEW.total_price    IS DISTINCT FROM OLD.total_price    THEN RAISE EXCEPTION 'field_locked: total_price'; END IF;
  IF NEW.quantidade     IS DISTINCT FROM OLD.quantidade     THEN RAISE EXCEPTION 'field_locked: quantidade'; END IF;
  IF NEW.excursao_id    IS DISTINCT FROM OLD.excursao_id    THEN RAISE EXCEPTION 'field_locked: excursao_id'; END IF;
  IF NEW.comprador_id   IS DISTINCT FROM OLD.comprador_id   THEN RAISE EXCEPTION 'field_locked: comprador_id'; END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_reserva_sensitive_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_reserva_sensitive_fields_trg ON public.reservas;
CREATE TRIGGER guard_reserva_sensitive_fields_trg
BEFORE UPDATE ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.guard_reserva_sensitive_fields();
