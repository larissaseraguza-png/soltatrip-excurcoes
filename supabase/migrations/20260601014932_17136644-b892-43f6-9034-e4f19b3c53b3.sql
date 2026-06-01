CREATE OR REPLACE FUNCTION public._internal_notify_pagamento_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _recipients uuid[];
  _type public.notification_type;
  _title text;
  _msg text;
  _exc_titulo text;
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
$function$;

REVOKE EXECUTE ON FUNCTION public._internal_notify_pagamento_status_changed() FROM anon, authenticated, PUBLIC;