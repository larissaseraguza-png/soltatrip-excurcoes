-- Notificações financeiras: garantir identificação real do passageiro/comprador
-- e padronizar formato "Nome enviou R$ X,XX" / "Nome pagou R$ X,XX".
-- Sem mudar schema, regras de negócio, RLS ou destinatários.

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
  _comprador_nome text;
  _fonte text;
  _data jsonb;
  _valor_fmt text;
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;

  _recipients := public.notify_resolve_recipients('root_plus_socios', NEW.excursao_id, NULL, NULL);
  IF array_length(_recipients, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT titulo, organizer_id INTO _exc FROM public.excursoes WHERE id = NEW.excursao_id;

  IF NEW.passageiro_id IS NOT NULL THEN
    SELECT nome INTO _pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;
  END IF;

  -- Fallback: nome do comprador (titular da reserva), via profiles.
  IF _pax_nome IS NULL OR btrim(_pax_nome) = '' THEN
    IF NEW.reserva_id IS NOT NULL THEN
      SELECT p.full_name INTO _comprador_nome
      FROM public.reservas r
      LEFT JOIN public.profiles p ON p.id = r.comprador_id
      WHERE r.id = NEW.reserva_id;
      IF _comprador_nome IS NOT NULL AND btrim(_comprador_nome) <> '' THEN
        _pax_nome := _comprador_nome;
      END IF;
    END IF;
  END IF;

  _fonte := CASE WHEN NEW.metodo = 'manual' THEN 'manual' ELSE 'passageiro' END;
  _valor_fmt := to_char(NEW.valor, 'FM999G999G990D00');

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
    COALESCE(_pax_nome, 'Passageiro') || ' enviou R$ ' || _valor_fmt,
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
REVOKE EXECUTE ON FUNCTION public._internal_notify_pagamento_submitted() FROM anon, authenticated, PUBLIC;

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
  _comprador_nome text;
  _valor_fmt text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  _valor_fmt := to_char(NEW.valor, 'FM999G999G990D00');

  IF NEW.status IN ('pago', 'confirmado') THEN
    _type := 'payment.approved';
    _title := 'Pagamento aprovado';
    _msg := 'Seu pagamento de R$ ' || _valor_fmt || ' foi aprovado.';
  ELSIF NEW.status = 'recusado' THEN
    _type := 'payment.rejected';
    _title := 'Pagamento não aprovado';
    _msg := 'Seu pagamento de R$ ' || _valor_fmt || ' não foi aprovado.';
  ELSE
    RETURN NEW;
  END IF;

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

  -- Staff: somente em aprovação.
  IF NEW.status IN ('pago', 'confirmado') THEN
    _staff := public.notify_resolve_recipients('staff_excursao', NEW.excursao_id, NULL, NULL);
    IF array_length(_staff, 1) IS NOT NULL THEN
      IF NEW.passageiro_id IS NOT NULL THEN
        SELECT nome INTO _pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;
      END IF;
      IF _pax_nome IS NULL OR btrim(_pax_nome) = '' THEN
        IF NEW.reserva_id IS NOT NULL THEN
          SELECT p.full_name INTO _comprador_nome
          FROM public.reservas r
          LEFT JOIN public.profiles p ON p.id = r.comprador_id
          WHERE r.id = NEW.reserva_id;
          IF _comprador_nome IS NOT NULL AND btrim(_comprador_nome) <> '' THEN
            _pax_nome := _comprador_nome;
          END IF;
        END IF;
      END IF;
      PERFORM public.notify_emit(
        _staff,
        'payment.approved'::public.notification_type,
        'payment'::public.notification_category,
        'Pagamento confirmado',
        COALESCE(_pax_nome, 'Passageiro') || ' pagou R$ ' || _valor_fmt,
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