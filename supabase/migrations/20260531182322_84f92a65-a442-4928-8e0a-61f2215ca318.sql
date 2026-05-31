-- 1) Atualiza notify_emit para excluir o ator dos destinatários (resolve R2 da auditoria F1).
CREATE OR REPLACE FUNCTION public.notify_emit(
  _type notification_type,
  _category notification_category,
  _title text,
  _message text,
  _link text,
  _data jsonb,
  _actor_id uuid,
  _tenant_id uuid,
  _excursao_id uuid,
  _reserva_id uuid,
  _passageiro_id uuid,
  _pagamento_id uuid,
  _dedupe_key text,
  _recipients uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r uuid;
BEGIN
  IF _recipients IS NULL OR array_length(_recipients, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH _r IN ARRAY _recipients LOOP
    IF _r IS NULL THEN CONTINUE; END IF;
    -- Nunca notificar o próprio ator do evento.
    IF _actor_id IS NOT NULL AND _r = _actor_id THEN CONTINUE; END IF;

    BEGIN
      INSERT INTO public.notifications (
        recipient_id, actor_id, tenant_id, excursao_id, reserva_id,
        passageiro_id, pagamento_id, type, category, title, message, link,
        data, dedupe_key
      ) VALUES (
        _r, _actor_id, _tenant_id, _excursao_id, _reserva_id,
        _passageiro_id, _pagamento_id, _type, _category, _title, _message, _link,
        COALESCE(_data, '{}'::jsonb),
        CASE WHEN _dedupe_key IS NULL THEN NULL ELSE _dedupe_key || ':' || _r::text END
      );
    EXCEPTION WHEN unique_violation THEN
      -- Já existia notificação equivalente para este destinatário; ignorar.
      NULL;
    END;
  END LOOP;
END;
$$;

-- 2) Garante que somente o serviço (triggers SECURITY DEFINER) chame notify_emit.
REVOKE EXECUTE ON FUNCTION public.notify_emit(
  notification_type, notification_category, text, text, text, jsonb,
  uuid, uuid, uuid, uuid, uuid, uuid, text, uuid[]
) FROM anon, authenticated, public;

-- 3) RPC pública: ponto único de emissão de eventos fora de triggers.
--    Aceita uma lista de "papéis" a notificar e/ou destinatários explícitos.
--    Faz checagem de autorização do chamador contra a excursão alvo.
CREATE OR REPLACE FUNCTION public.emit_business_event(
  _type notification_type,
  _excursao_id uuid,
  _reserva_id uuid DEFAULT NULL,
  _passageiro_id uuid DEFAULT NULL,
  _pagamento_id uuid DEFAULT NULL,
  _title text DEFAULT NULL,
  _message text DEFAULT NULL,
  _link text DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb,
  _recipient_roles text[] DEFAULT ARRAY[]::text[],
  _extra_recipients uuid[] DEFAULT ARRAY[]::uuid[],
  _dedupe_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _category notification_category;
  _organizer uuid;
  _authorized boolean := false;
  _recipients uuid[] := ARRAY[]::uuid[];
  _role text;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF _excursao_id IS NULL THEN
    RAISE EXCEPTION 'excursao_id required';
  END IF;

  -- Categoria derivada do tipo (mesma lógica usada nas triggers F0).
  _category := CASE
    WHEN _type::text LIKE 'payment.%'    THEN 'pagamentos'::notification_category
    WHEN _type::text LIKE 'booking.%'    THEN 'reservas'::notification_category
    WHEN _type::text LIKE 'checkin.%'    THEN 'checkin'::notification_category
    WHEN _type::text LIKE 'boarding.%'   THEN 'embarque'::notification_category
    WHEN _type::text LIKE 'invitation.%' THEN 'staff'::notification_category
    WHEN _type::text LIKE 'team.%'       THEN 'staff'::notification_category
    WHEN _type::text LIKE 'socio.%'      THEN 'socio'::notification_category
    WHEN _type::text LIKE 'item.%'       THEN 'reservas'::notification_category
    WHEN _type::text LIKE 'excursion.%'  THEN 'alteracoes'::notification_category
    ELSE 'alteracoes'::notification_category
  END;

  -- Descobre organizador (tenant) da excursão.
  SELECT organizer_id INTO _organizer FROM public.excursoes WHERE id = _excursao_id;
  IF _organizer IS NULL THEN
    RAISE EXCEPTION 'excursao not found';
  END IF;

  -- Autorização: ator precisa ter relação legítima com a excursão.
  _authorized :=
       _actor = _organizer
    OR public.is_coorganizador(_excursao_id, _actor)
    OR public.is_active_staff(_excursao_id, _actor)
    OR EXISTS (
         SELECT 1 FROM public.passageiros p
         WHERE p.excursao_id = _excursao_id
           AND (p.user_id = _actor OR p.comprador_id = _actor)
       )
    OR EXISTS (
         SELECT 1 FROM public.reservas r
         WHERE r.excursao_id = _excursao_id AND r.comprador_id = _actor
       );

  IF NOT _authorized THEN
    RAISE EXCEPTION 'not authorized for excursao %', _excursao_id;
  END IF;

  -- Resolve destinatários a partir dos papéis pedidos.
  FOREACH _role IN ARRAY COALESCE(_recipient_roles, ARRAY[]::text[]) LOOP
    IF _role = 'organizer_root' THEN
      _recipients := _recipients || ARRAY[_organizer];

    ELSIF _role = 'organizer_socios' THEN
      _recipients := _recipients || COALESCE(
        ARRAY(
          SELECT s.socio_user_id
          FROM public.excursionista_socios s
          WHERE s.raiz_id = _organizer
            AND s.status = 'ativo'
            AND s.socio_user_id IS NOT NULL
        ),
        ARRAY[]::uuid[]
      );

    ELSIF _role = 'staff_excursao' THEN
      _recipients := _recipients || COALESCE(
        ARRAY(
          SELECT eq.staff_user_id
          FROM public.equipe_excursoes eq
          WHERE eq.excursao_id = _excursao_id
            AND eq.status = 'ativo'
            AND eq.staff_user_id IS NOT NULL
        ),
        ARRAY[]::uuid[]
      );

    ELSIF _role = 'passageiro_user' AND _passageiro_id IS NOT NULL THEN
      _recipients := _recipients || COALESCE(
        ARRAY(
          SELECT p.user_id
          FROM public.passageiros p
          WHERE p.id = _passageiro_id AND p.user_id IS NOT NULL
        ),
        ARRAY[]::uuid[]
      );

    ELSIF _role = 'passageiro_comprador' AND _passageiro_id IS NOT NULL THEN
      _recipients := _recipients || COALESCE(
        ARRAY(
          SELECT p.comprador_id
          FROM public.passageiros p
          WHERE p.id = _passageiro_id AND p.comprador_id IS NOT NULL
        ),
        ARRAY[]::uuid[]
      );

    ELSIF _role = 'reserva_comprador' AND _reserva_id IS NOT NULL THEN
      _recipients := _recipients || COALESCE(
        ARRAY(
          SELECT r.comprador_id
          FROM public.reservas r
          WHERE r.id = _reserva_id AND r.comprador_id IS NOT NULL
        ),
        ARRAY[]::uuid[]
      );
    END IF;
  END LOOP;

  -- Destinatários extras (UUIDs já conhecidos pelo chamador).
  IF _extra_recipients IS NOT NULL THEN
    _recipients := _recipients || _extra_recipients;
  END IF;

  -- Deduplica destinatários antes de emitir.
  _recipients := ARRAY(SELECT DISTINCT x FROM unnest(_recipients) AS t(x) WHERE x IS NOT NULL);

  IF array_length(_recipients, 1) IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.notify_emit(
    _type,
    _category,
    COALESCE(_title, _type::text),
    _message,
    _link,
    COALESCE(_data, '{}'::jsonb),
    _actor,
    _organizer,
    _excursao_id,
    _reserva_id,
    _passageiro_id,
    _pagamento_id,
    _dedupe_key,
    _recipients
  );
END;
$$;

-- 4) Permissões: somente usuários autenticados podem chamar.
REVOKE EXECUTE ON FUNCTION public.emit_business_event(
  notification_type, uuid, uuid, uuid, uuid, text, text, text, jsonb, text[], uuid[], text
) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.emit_business_event(
  notification_type, uuid, uuid, uuid, uuid, text, text, text, jsonb, text[], uuid[], text
) TO authenticated;