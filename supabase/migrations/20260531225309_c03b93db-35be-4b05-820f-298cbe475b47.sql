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
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;

  _recipients := public.notify_resolve_recipients('root_plus_socios', NEW.excursao_id, NULL, NULL);
  IF array_length(_recipients, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT titulo, organizer_id INTO _exc FROM public.excursoes WHERE id = NEW.excursao_id;
  SELECT nome INTO _pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;

  _fonte := CASE WHEN NEW.metodo = 'manual' THEN 'manual' ELSE 'passageiro' END;

  _data := jsonb_build_object(
    'fonte', _fonte,
    'metodo', NEW.metodo,
    'valor', NEW.valor,
    'passageiro_nome', _pax_nome,
    'excursao_titulo', _exc.titulo
  );

  PERFORM public.notify_emit(
    _recipients,
    'payment.submitted'::public.notification_type,
    'payment'::public.notification_category,
    'Novo pagamento recebido',
    COALESCE(_pax_nome, 'Passageiro') || ' enviou um pagamento de R$ ' || NEW.valor::text,
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
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'pago' THEN
    _type := 'payment.approved';
    _title := 'Pagamento aprovado';
    _msg := 'Seu pagamento de R$ ' || NEW.valor::text || ' foi aprovado.';
  ELSIF NEW.status = 'recusado' THEN
    _type := 'payment.rejected';
    _title := 'Pagamento não aprovado';
    _msg := 'Seu pagamento de R$ ' || NEW.valor::text || ' não foi aprovado.';
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
      'excursao_titulo', _exc_titulo
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

CREATE OR REPLACE FUNCTION public._internal_notify_reserva_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exc_titulo text;
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN RETURN NEW; END IF;
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;

  SELECT titulo INTO _exc_titulo FROM public.excursoes WHERE id = NEW.excursao_id;

  PERFORM public.notify_emit(
    ARRAY[NEW.comprador_id],
    'booking.paid'::public.notification_type,
    'booking'::public.notification_category,
    'Reserva quitada',
    'Sua reserva em ' || COALESCE(_exc_titulo, 'excursão') || ' foi quitada.',
    '/passageiro/pagamentos',
    jsonb_build_object(
      'total_price', NEW.total_price,
      'amount_paid', NEW.amount_paid,
      'excursao_titulo', _exc_titulo
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

DROP FUNCTION IF EXISTS public._fin_snapshot(uuid, uuid);