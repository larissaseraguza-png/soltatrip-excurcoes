
-- ============================================================
-- Pagamento SUBMETIDO → excursionista (root + sócios)
-- Mostra APENAS o valor da transação atual, não o total.
-- Payload distingue parcial vs integral.
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
  _valor_tx numeric := COALESCE(NEW.valor, 0);
  _restante_antes numeric;
  _restante_apos numeric;
  _is_partial boolean;
  _tipo text;
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;

  _recipients := public.notify_resolve_recipients('root_plus_socios', NEW.excursao_id, NULL, NULL);
  IF array_length(_recipients, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT titulo, organizer_id INTO _exc FROM public.excursoes WHERE id = NEW.excursao_id;
  SELECT nome INTO _pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;
  -- snapshot ANTES de confirmar este pagamento (valor_pago = acumulado já confirmado)
  SELECT * INTO _snap FROM public._fin_snapshot(NEW.reserva_id, NEW.passageiro_id);

  _restante_antes := GREATEST(_snap.valor_total - _snap.valor_pago, 0);
  _restante_apos  := GREATEST(_snap.valor_total - _snap.valor_pago - _valor_tx, 0);
  _is_partial     := _valor_tx > 0 AND _valor_tx < _restante_antes;
  _tipo           := CASE WHEN _is_partial THEN 'parcial' ELSE 'integral' END;
  _fonte          := CASE WHEN NEW.metodo = 'manual' THEN 'manual' ELSE 'passageiro' END;

  _data := jsonb_build_object(
    'fonte', _fonte,
    'metodo', NEW.metodo,
    'pagamento_tipo', _tipo,
    'is_partial', _is_partial,
    'valor_transacao', _valor_tx,
    -- compatibilidade com consumidores: valor_pago reflete a transação atual
    'valor_pago', _valor_tx,
    'valor_total', _snap.valor_total,
    'valor_pago_acumulado', _snap.valor_pago,
    'valor_restante_antes', _restante_antes,
    'valor_restante_apos', _restante_apos,
    'valor_restante', _restante_apos,
    'passageiro_nome', _pax_nome,
    'excursao_titulo', _exc.titulo,
    'excursao_id', NEW.excursao_id
  );

  PERFORM public.notify_emit(
    _recipients,
    'payment.submitted'::public.notification_type,
    'payment'::public.notification_category,
    CASE WHEN _is_partial
      THEN 'Pagamento parcial recebido'
      ELSE 'Pagamento recebido'
    END,
    COALESCE(_pax_nome, 'Passageiro')
      || ' enviou ' || public._fmt_brl(_valor_tx)
      || CASE WHEN _is_partial THEN ' (parcial)' ELSE '' END
      || ' • Total da excursão ' || public._fmt_brl(_snap.valor_total),
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
-- Mantém valor da transação + acumulado e restante após confirmação.
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
  _valor_tx numeric := COALESCE(NEW.valor, 0);
  _is_partial boolean;
  _tipo text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- snapshot APÓS atualização do status (triggers de reserva já atualizaram amount_paid)
  SELECT * INTO _snap FROM public._fin_snapshot(NEW.reserva_id, NEW.passageiro_id);

  _is_partial := _snap.valor_restante > 0;
  _tipo := CASE WHEN _is_partial THEN 'parcial' ELSE 'integral' END;

  IF NEW.status = 'pago' THEN
    _type := 'payment.approved';
    _title := CASE WHEN _is_partial THEN 'Pagamento parcial aprovado' ELSE 'Pagamento aprovado' END;
    _msg := 'Pagamento de ' || public._fmt_brl(_valor_tx) || ' aprovado. '
         || 'Já pago: ' || public._fmt_brl(_snap.valor_pago)
         || ' de ' || public._fmt_brl(_snap.valor_total)
         || ' • Restante: ' || public._fmt_brl(_snap.valor_restante);
  ELSIF NEW.status = 'recusado' THEN
    _type := 'payment.rejected';
    _title := 'Pagamento não aprovado';
    _msg := 'Pagamento de ' || public._fmt_brl(_valor_tx) || ' não foi aprovado. '
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
      'pagamento_tipo', _tipo,
      'is_partial', _is_partial,
      'valor_transacao', _valor_tx,
      'valor_pago', _valor_tx,
      'valor_total', _snap.valor_total,
      'valor_pago_acumulado', _snap.valor_pago,
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
