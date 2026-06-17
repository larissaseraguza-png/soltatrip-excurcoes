CREATE OR REPLACE FUNCTION public.emit_business_event(_type notification_type, _excursao_id uuid, _reserva_id uuid DEFAULT NULL::uuid, _passageiro_id uuid DEFAULT NULL::uuid, _pagamento_id uuid DEFAULT NULL::uuid, _title text DEFAULT NULL::text, _message text DEFAULT NULL::text, _link text DEFAULT NULL::text, _data jsonb DEFAULT '{}'::jsonb, _recipient_roles text[] DEFAULT ARRAY[]::text[], _extra_recipients uuid[] DEFAULT ARRAY[]::uuid[], _dedupe_key text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  _category := CASE
    WHEN _type::text LIKE 'payment.%'    THEN 'payment'::notification_category
    WHEN _type::text LIKE 'booking.%'    THEN 'booking'::notification_category
    WHEN _type::text LIKE 'checkin.%'    THEN 'checkin'::notification_category
    WHEN _type::text LIKE 'boarding.%'   THEN 'boarding'::notification_category
    WHEN _type::text LIKE 'invitation.%' THEN 'invitation'::notification_category
    WHEN _type::text LIKE 'team.%'       THEN 'team'::notification_category
    WHEN _type::text LIKE 'socio.%'      THEN 'team'::notification_category
    WHEN _type::text LIKE 'item.%'       THEN 'item'::notification_category
    WHEN _type::text LIKE 'excursion.%'  THEN 'excursion'::notification_category
    ELSE 'system'::notification_category
  END;

  SELECT organizer_id INTO _organizer FROM public.excursoes WHERE id = _excursao_id;
  IF _organizer IS NULL THEN
    RAISE EXCEPTION 'excursao not found';
  END IF;

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
       )
    OR EXISTS (
         SELECT 1 FROM public.pedidos_itens pi
         WHERE pi.excursao_id = _excursao_id AND pi.comprador_id = _actor
       );

  IF NOT _authorized THEN
    RAISE EXCEPTION 'not authorized for excursao %', _excursao_id;
  END IF;

  FOREACH _role IN ARRAY COALESCE(_recipient_roles, ARRAY[]::text[]) LOOP
    IF _role = 'organizer_root' THEN
      _recipients := _recipients || ARRAY[_organizer];
    ELSIF _role = 'organizer_socios' THEN
      _recipients := _recipients || COALESCE(
        ARRAY(SELECT s.socio_user_id FROM public.excursionista_socios s
              WHERE s.raiz_id = _organizer AND s.status = 'ativo' AND s.socio_user_id IS NOT NULL),
        ARRAY[]::uuid[]);
    ELSIF _role = 'staff_excursao' THEN
      _recipients := _recipients || COALESCE(
        ARRAY(SELECT eq.staff_user_id FROM public.equipe_excursoes eq
              WHERE eq.excursao_id = _excursao_id AND eq.status = 'ativo' AND eq.staff_user_id IS NOT NULL),
        ARRAY[]::uuid[]);
    ELSIF _role = 'passageiro_user' AND _passageiro_id IS NOT NULL THEN
      _recipients := _recipients || COALESCE(
        ARRAY(SELECT p.user_id FROM public.passageiros p
              WHERE p.id = _passageiro_id AND p.user_id IS NOT NULL),
        ARRAY[]::uuid[]);
    ELSIF _role = 'passageiro_comprador' AND _passageiro_id IS NOT NULL THEN
      _recipients := _recipients || COALESCE(
        ARRAY(SELECT p.comprador_id FROM public.passageiros p
              WHERE p.id = _passageiro_id AND p.comprador_id IS NOT NULL),
        ARRAY[]::uuid[]);
    ELSIF _role = 'reserva_comprador' AND _reserva_id IS NOT NULL THEN
      _recipients := _recipients || COALESCE(
        ARRAY(SELECT r.comprador_id FROM public.reservas r
              WHERE r.id = _reserva_id AND r.comprador_id IS NOT NULL),
        ARRAY[]::uuid[]);
    END IF;
  END LOOP;

  IF _extra_recipients IS NOT NULL THEN
    _recipients := _recipients || _extra_recipients;
  END IF;

  _recipients := ARRAY(SELECT DISTINCT x FROM unnest(_recipients) AS t(x) WHERE x IS NOT NULL);

  IF array_length(_recipients, 1) IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.notify_emit(
    _type, _category, COALESCE(_title, _type::text), _message, _link,
    COALESCE(_data, '{}'::jsonb), _actor, _organizer, _excursao_id,
    _reserva_id, _passageiro_id, _pagamento_id, _dedupe_key, _recipients
  );
END;
$function$;