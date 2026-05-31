
-- Helper: snapshot financeiro normalizado para um pagamento/reserva.
-- Sempre retorna (valor_total, valor_pago, valor_restante) em numeric.
-- Preferência: reserva → passageiro → zeros.
CREATE OR REPLACE FUNCTION public._fin_snapshot(
  _reserva_id uuid,
  _passageiro_id uuid
)
RETURNS TABLE(valor_total numeric, valor_pago numeric, valor_restante numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t numeric := 0;
  _p numeric := 0;
BEGIN
  IF _reserva_id IS NOT NULL THEN
    SELECT COALESCE(total_price, 0), COALESCE(amount_paid, 0)
      INTO _t, _p
      FROM public.reservas WHERE id = _reserva_id;
  END IF;
  IF (_t = 0 AND _p = 0) AND _passageiro_id IS NOT NULL THEN
    SELECT COALESCE(total_price, 0), COALESCE(amount_paid, 0)
      INTO _t, _p
      FROM public.passageiros WHERE id = _passageiro_id;
  END IF;
  valor_total := COALESCE(_t, 0);
  valor_pago := COALESCE(_p, 0);
  valor_restante := GREATEST(valor_total - valor_pago, 0);
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public._fin_snapshot(uuid, uuid) FROM PUBLIC;

-- Formatador BR simples
CREATE OR REPLACE FUNCTION public._fmt_brl(_v numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'R$ ' || to_char(COALESCE(_v,0), 'FM999G999G990D00');
$$;

-- ============================================================
-- Pagamento SUBMETIDO (pendente) → excursionista (root+sócios)
-- Payload normalizado + mensagem mostra valor total e parcial.
-- ============================================================
CREATE OR REPLACE FUNCTION public._internal_notify_pagamento_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipients uuid[];
  _exc record;
  _pax_nome text;
  _fonte text;
  _data jsonb;
  _snap record;
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;

  _recipients := public.notify_resolve_recipients('root_plus_socios', NEW.excursao_id, NULL, NULL);
  IF array_length(_recipients, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT titulo, organizer_id INTO _exc FROM public.excursoes WHERE id = NEW.excursao_id;
  SELECT nome INTO _pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;
  SELECT * INTO _snap FROM public._fin_snapshot(NEW.reserva_id, NEW.passageiro_id);

  _fonte := CASE WHEN NEW.metodo = 'manual' THEN 'manual' ELSE 'passageiro' END;

  _data := jsonb_build_object(
    'fonte', _fonte,
    'metodo', NEW.metodo,
    'valor', NEW.valor,
    'valor_total', _snap.valor_total,
    'valor_pago', _snap.valor_pago,
    'valor_restante', _snap.valor_restante,
    'passageiro_nome', _pax_nome,
    'excursao_titulo', _exc.titulo,
    'excursao_id', NEW.excursao_id
  );

  PERFORM public.notify_emit(
    _recipients,
    'payment.submitted'::public.notification_type,
    'payment'::public.notification_category,
    'Novo pagamento recebido',
    COALESCE(_pax_nome, 'Passageiro')
      || ' enviou ' || public._fmt_brl(NEW.valor)
      || ' • Total ' || public._fmt_brl(_snap.valor_total)
      || ' • Parcial ' || public._fmt_brl(_snap.valor_pago)
      || ' / ' || public._fmt_brl(_snap.valor_total),
    '/app/financeiro?excursao=' || NEW.excursao_id::text,
    _data,
    NEW.excursao_id,
    NEW.reserva_id,
    NEW.passageiro_id,
    NEW.id,
    auth.uid(),
    _exc.organizer_id,
    'pagamento.submitted:' || NEW.id::text,
    1::smallint
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._internal_notify_pagamento_submitted() FROM PUBLIC;

-- ============================================================
-- Pagamento APROVADO / RECUSADO → passageiro
-- Mensagem mostra valor pago acumulado e restante.
-- ============================================================
CREATE OR REPLACE FUNCTION public._internal_notify_pagamento_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipients uuid[];
  _type public.notification_type;
  _title text;
  _msg text;
  _exc_titulo text;
  _snap record;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT * INTO _snap FROM public._fin_snapshot(NEW.reserva_id, NEW.passageiro_id);

  IF NEW.status = 'pago' THEN
    _type := 'payment.approved';
    _title := 'Pagamento aprovado';
    _msg := 'Pagamento de ' || public._fmt_brl(NEW.valor) || ' aprovado. '
         || 'Já pago: ' || public._fmt_brl(_snap.valor_pago)
         || ' • Restante: ' || public._fmt_brl(_snap.valor_restante);
  ELSIF NEW.status = 'recusado' THEN
    _type := 'payment.rejected';
    _title := 'Pagamento não aprovado';
    _msg := 'Pagamento de ' || public._fmt_brl(NEW.valor) || ' não foi aprovado. '
         || 'Já pago: ' || public._fmt_brl(_snap.valor_pago)
         || ' • Restante: ' || public._fmt_brl(_snap.valor_restante);
  ELSE
    RETURN NEW;
  END IF;

  _recipients := public.notify_resolve_recipients('passenger', NEW.excursao_id, NEW.passageiro_id, NULL);
  IF array_length(_recipients, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT titulo INTO _exc_titulo FROM public.excursoes WHERE id = NEW.excursao_id;

  PERFORM public.notify_emit(
    _recipients,
    _type,
    'payment'::public.notification_category,
    _title,
    _msg,
    '/passageiro/pagamentos',
    jsonb_build_object(
      'metodo', NEW.metodo,
      'valor', NEW.valor,
      'valor_total', _snap.valor_total,
      'valor_pago', _snap.valor_pago,
      'valor_restante', _snap.valor_restante,
      'excursao_titulo', _exc_titulo,
      'excursao_id', NEW.excursao_id
    ),
    NEW.excursao_id,
    NEW.reserva_id,
    NEW.passageiro_id,
    NEW.id,
    auth.uid(),
    NULL,
    'pagamento.status:' || NEW.id::text || ':' || NEW.status,
    1::smallint
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._internal_notify_pagamento_status_changed() FROM PUBLIC;

-- ============================================================
-- Reserva CRIADA → excursionista
-- Payload normalizado (total = total_price; pago = amount_paid).
-- ============================================================
CREATE OR REPLACE FUNCTION public._internal_notify_reserva_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipients uuid[];
  _exc record;
  _buyer_nome text;
  _total numeric := COALESCE(NEW.total_price, 0);
  _pago numeric := COALESCE(NEW.amount_paid, 0);
  _rest numeric := GREATEST(COALESCE(NEW.total_price,0) - COALESCE(NEW.amount_paid,0), 0);
BEGIN
  _recipients := public.notify_resolve_recipients('root_plus_socios', NEW.excursao_id, NULL, NULL);
  IF array_length(_recipients, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT titulo, organizer_id INTO _exc FROM public.excursoes WHERE id = NEW.excursao_id;
  SELECT full_name INTO _buyer_nome FROM public.profiles WHERE id = NEW.comprador_id;

  PERFORM public.notify_emit(
    _recipients,
    'booking.created'::public.notification_type,
    'booking'::public.notification_category,
    'Nova reserva',
    COALESCE(_buyer_nome, 'Um comprador')
      || ' reservou ' || NEW.quantidade::text || ' vaga(s) em ' || COALESCE(_exc.titulo, 'sua excursão')
      || ' • Total ' || public._fmt_brl(_total)
      || ' • Parcial ' || public._fmt_brl(_pago) || ' / ' || public._fmt_brl(_total),
    '/app/passageiros?excursao=' || NEW.excursao_id::text,
    jsonb_build_object(
      'quantidade', NEW.quantidade,
      'valor_total', _total,
      'valor_pago', _pago,
      'valor_restante', _rest,
      'comprador_nome', _buyer_nome,
      'excursao_titulo', _exc.titulo,
      'excursao_id', NEW.excursao_id
    ),
    NEW.excursao_id,
    NEW.id,
    NULL,
    NULL,
    NEW.comprador_id,
    _exc.organizer_id,
    'reserva.created:' || NEW.id::text,
    1::smallint
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._internal_notify_reserva_created() FROM PUBLIC;

-- ============================================================
-- Reserva QUITADA → passageiro
-- Mensagem mostra valor pago e restante (0).
-- ============================================================
CREATE OR REPLACE FUNCTION public._internal_notify_reserva_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exc_titulo text;
  _total numeric := COALESCE(NEW.total_price, 0);
  _pago numeric := COALESCE(NEW.amount_paid, NEW.total_price, 0);
  _rest numeric := GREATEST(COALESCE(NEW.total_price,0) - COALESCE(NEW.amount_paid, NEW.total_price, 0), 0);
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN RETURN NEW; END IF;
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;

  SELECT titulo INTO _exc_titulo FROM public.excursoes WHERE id = NEW.excursao_id;

  PERFORM public.notify_emit(
    ARRAY[NEW.comprador_id],
    'booking.paid'::public.notification_type,
    'booking'::public.notification_category,
    'Reserva quitada',
    'Sua reserva em ' || COALESCE(_exc_titulo, 'excursão') || ' foi quitada. '
      || 'Valor pago: ' || public._fmt_brl(_pago)
      || ' • Restante: ' || public._fmt_brl(_rest),
    '/passageiro/pagamentos',
    jsonb_build_object(
      'valor_total', _total,
      'valor_pago', _pago,
      'valor_restante', _rest,
      'excursao_titulo', _exc_titulo,
      'excursao_id', NEW.excursao_id
    ),
    NEW.excursao_id,
    NEW.id,
    NULL,
    NULL,
    auth.uid(),
    NULL,
    'reserva.paid:' || NEW.id::text,
    1::smallint
  );

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._internal_notify_reserva_paid() FROM PUBLIC;
