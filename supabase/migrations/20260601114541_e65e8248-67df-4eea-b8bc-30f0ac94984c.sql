-- Staff: notificar APENAS quando pagamento é confirmado pelo excursionista.
CREATE OR REPLACE FUNCTION public._internal_notify_pagamento_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _recipients uuid[];
  _staff uuid[];
  _type public.notification_type;
  _title text;
  _msg text;
  _exc_titulo text;
  _pax_nome text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status IN ('pago', 'confirmado') THEN
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

  -- Destinatário principal: o passageiro/comprador (comportamento inalterado).
  IF NEW.passageiro_id IS NOT NULL THEN
    _recipients := public.notify_resolve_recipients('passenger', NEW.excursao_id, NEW.passageiro_id, NULL);
  ELSE
    _recipients := public.notify_resolve_recipients('buyer', NEW.excursao_id, NULL, NEW.reserva_id);
  END IF;

  SELECT titulo INTO _exc_titulo FROM public.excursoes WHERE id = NEW.excursao_id;

  IF array_length(_recipients, 1) IS NOT NULL THEN
    PERFORM public.notify_emit(
      _recipients,
      _type,
      'payment'::public.notification_category,
      _title,
      _msg,
      '/passageiro/pagamentos',
      jsonb_build_object('metodo', NEW.metodo, 'valor', NEW.valor, 'excursao_titulo', _exc_titulo),
      NEW.excursao_id,
      NEW.reserva_id,
      NEW.passageiro_id,
      NEW.id,
      auth.uid(),
      NULL,
      'pagamento.status:' || NEW.id::text || ':' || NEW.status,
      1::smallint
    );
  END IF;

  -- Staff: somente em aprovação (sem etapas intermediárias e sem recusas).
  IF NEW.status IN ('pago', 'confirmado') THEN
    _staff := public.notify_resolve_recipients('staff_excursao', NEW.excursao_id, NULL, NULL);
    IF array_length(_staff, 1) IS NOT NULL THEN
      IF NEW.passageiro_id IS NOT NULL THEN
        SELECT nome INTO _pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;
      END IF;
      PERFORM public.notify_emit(
        _staff,
        'payment.approved'::public.notification_type,
        'payment'::public.notification_category,
        'Pagamento confirmado',
        COALESCE(_pax_nome, 'Passageiro') || ' realizou pagamento de R$ ' || NEW.valor::text,
        NULL,
        jsonb_build_object(
          'metodo', NEW.metodo,
          'valor', NEW.valor,
          'passageiro_nome', _pax_nome,
          'excursao_titulo', _exc_titulo
        ),
        NEW.excursao_id,
        NEW.reserva_id,
        NEW.passageiro_id,
        NEW.id,
        auth.uid(),
        NULL,
        'pagamento.status.staff:' || NEW.id::text || ':' || NEW.status,
        0::smallint
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._internal_notify_pagamento_status_changed() FROM anon, authenticated, PUBLIC;

-- Reserva quitada: continuar notificando comprador + adicionar staff.
CREATE OR REPLACE FUNCTION public._internal_notify_reserva_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exc_titulo text;
  _staff uuid[];
  _comprador_nome text;
BEGIN
  IF OLD.payment_status = NEW.payment_status THEN RETURN NEW; END IF;
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;

  SELECT titulo INTO _exc_titulo FROM public.excursoes WHERE id = NEW.excursao_id;

  -- Comprador (inalterado).
  PERFORM public.notify_emit(
    ARRAY[NEW.comprador_id],
    'booking.paid'::public.notification_type,
    'booking'::public.notification_category,
    'Reserva quitada',
    'Sua reserva em ' || COALESCE(_exc_titulo, 'excursão') || ' foi quitada.',
    '/passageiro/pagamentos',
    jsonb_build_object('total_price', NEW.total_price, 'amount_paid', NEW.amount_paid, 'excursao_titulo', _exc_titulo),
    NEW.excursao_id,
    NEW.id,
    NULL,
    NULL,
    auth.uid(),
    NULL,
    'reserva.paid:' || NEW.id::text,
    1::smallint
  );

  -- Staff: avisar quando reserva ficar quitada.
  _staff := public.notify_resolve_recipients('staff_excursao', NEW.excursao_id, NULL, NULL);
  IF array_length(_staff, 1) IS NOT NULL THEN
    SELECT full_name INTO _comprador_nome FROM public.profiles WHERE id = NEW.comprador_id;
    PERFORM public.notify_emit(
      _staff,
      'booking.paid'::public.notification_type,
      'booking'::public.notification_category,
      'Reserva quitada',
      COALESCE(_comprador_nome, 'Passageiro') || ' quitou sua reserva.',
      NULL,
      jsonb_build_object(
        'comprador_nome', _comprador_nome,
        'total_price', NEW.total_price,
        'excursao_titulo', _exc_titulo
      ),
      NEW.excursao_id,
      NEW.id,
      NULL,
      NULL,
      auth.uid(),
      NULL,
      'reserva.paid.staff:' || NEW.id::text,
      0::smallint
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._internal_notify_reserva_paid() FROM anon, authenticated, PUBLIC;