
-- ============================================================
-- CENTRAL DE NOTIFICAÇÕES V2 — FASE 0
-- ============================================================

-- 1) ENUMS
DO $$ BEGIN
  CREATE TYPE public.notification_category AS ENUM (
    'payment', 'booking', 'checkin', 'boarding',
    'invitation', 'team', 'item', 'excursion', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'payment.submitted','payment.approved','payment.rejected','payment.manual_recorded',
    'booking.created','booking.paid','booking.cancelled',
    'checkin.done','checkin.undone',
    'boarding.done','boarding.undone',
    'invitation.created','invitation.accepted','invitation.expired',
    'team.added','team.removed','socio.invited','socio.accepted',
    'item.ordered','item.delivered','item.received_confirmed',
    'excursion.published','excursion.updated','excursion.cancelled',
    'system.info','system.warning'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id       uuid NOT NULL,
  actor_id           uuid,
  tenant_id          uuid,
  excursao_id        uuid,
  reserva_id         uuid,
  passageiro_id      uuid,
  pagamento_id       uuid,
  type               public.notification_type NOT NULL,
  category           public.notification_category NOT NULL,
  title              text NOT NULL,
  message            text,
  link               text,
  data               jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority           smallint NOT NULL DEFAULT 0,
  dedupe_key         text,
  read_at            timestamptz,
  dismissed_at       timestamptz,
  delivered_channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_all
  ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_excursao
  ON public.notifications (excursao_id) WHERE excursao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_reserva
  ON public.notifications (reserva_id) WHERE reserva_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe
  ON public.notifications (recipient_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipient views own notifications" ON public.notifications;
CREATE POLICY "Recipient views own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Recipient updates own notifications" ON public.notifications;
CREATE POLICY "Recipient updates own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Recipient deletes own notifications" ON public.notifications;
CREATE POLICY "Recipient deletes own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

-- 3) notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  type        public.notification_type NOT NULL,
  in_app      boolean NOT NULL DEFAULT true,
  email       boolean NOT NULL DEFAULT false,
  whatsapp    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manages own prefs" ON public.notification_preferences;
CREATE POLICY "User manages own prefs"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4) updated_at triggers (usa touch_updated_at existente)
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_notification_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) notify_resolve_recipients
CREATE OR REPLACE FUNCTION public.notify_resolve_recipients(
  _scope text,
  _excursao_id uuid,
  _passageiro_id uuid DEFAULT NULL,
  _reserva_id uuid DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _root uuid;
  _result uuid[] := ARRAY[]::uuid[];
BEGIN
  IF _scope = 'root_plus_socios' AND _excursao_id IS NOT NULL THEN
    SELECT organizer_id INTO _root FROM public.excursoes WHERE id = _excursao_id;
    IF _root IS NOT NULL THEN
      _result := _result || _root;
      SELECT _result || COALESCE(array_agg(socio_user_id), ARRAY[]::uuid[])
        INTO _result
        FROM public.excursionista_socios
        WHERE raiz_id = _root
          AND status = 'ativo'
          AND socio_user_id IS NOT NULL;
    END IF;

  ELSIF _scope = 'passenger' AND _passageiro_id IS NOT NULL THEN
    SELECT ARRAY_REMOVE(ARRAY[COALESCE(p.user_id, p.comprador_id)], NULL)
      INTO _result
      FROM public.passageiros p
      WHERE p.id = _passageiro_id;

  ELSIF _scope = 'buyer' AND _reserva_id IS NOT NULL THEN
    SELECT ARRAY[r.comprador_id]
      INTO _result
      FROM public.reservas r
      WHERE r.id = _reserva_id;

  ELSIF _scope = 'staff_excursao' AND _excursao_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(DISTINCT staff_user_id), ARRAY[]::uuid[])
      INTO _result
      FROM public.equipe_excursoes
      WHERE excursao_id = _excursao_id
        AND status = 'ativo'
        AND staff_user_id IS NOT NULL;
  END IF;

  RETURN COALESCE(_result, ARRAY[]::uuid[]);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_resolve_recipients(text, uuid, uuid, uuid) FROM PUBLIC;

-- 6) notify_emit
CREATE OR REPLACE FUNCTION public.notify_emit(
  _recipients uuid[],
  _type public.notification_type,
  _category public.notification_category,
  _title text,
  _message text DEFAULT NULL,
  _link text DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb,
  _excursao_id uuid DEFAULT NULL,
  _reserva_id uuid DEFAULT NULL,
  _passageiro_id uuid DEFAULT NULL,
  _pagamento_id uuid DEFAULT NULL,
  _actor_id uuid DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL,
  _dedupe_key text DEFAULT NULL,
  _priority smallint DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r uuid;
  _count integer := 0;
BEGIN
  IF _recipients IS NULL OR array_length(_recipients, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH _r IN ARRAY _recipients LOOP
    IF _r IS NULL THEN CONTINUE; END IF;
    BEGIN
      INSERT INTO public.notifications (
        recipient_id, actor_id, tenant_id, excursao_id, reserva_id,
        passageiro_id, pagamento_id, type, category, title, message,
        link, data, priority, dedupe_key
      ) VALUES (
        _r, _actor_id, _tenant_id, _excursao_id, _reserva_id,
        _passageiro_id, _pagamento_id, _type, _category, _title, _message,
        _link, COALESCE(_data, '{}'::jsonb), _priority, _dedupe_key
      );
      _count := _count + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_emit(uuid[], public.notification_type, public.notification_category, text, text, text, jsonb, uuid, uuid, uuid, uuid, uuid, uuid, text, smallint) FROM PUBLIC;

-- 7) RPCs públicas
CREATE OR REPLACE FUNCTION public.notification_mark_read(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
     SET read_at = COALESCE(read_at, now())
   WHERE id = _id AND recipient_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.notification_mark_all_read(_excursao_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.notifications
       SET read_at = now()
     WHERE recipient_id = auth.uid()
       AND read_at IS NULL
       AND (_excursao_id IS NULL OR excursao_id = _excursao_id)
     RETURNING 1
  )
  SELECT COUNT(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_dismiss(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
     SET dismissed_at = COALESCE(dismissed_at, now())
   WHERE id = _id AND recipient_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.notification_unread_count(_excursao_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
    FROM public.notifications
   WHERE recipient_id = auth.uid()
     AND read_at IS NULL
     AND dismissed_at IS NULL
     AND (_excursao_id IS NULL OR excursao_id = _excursao_id);
$$;

GRANT EXECUTE ON FUNCTION public.notification_mark_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_mark_all_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_dismiss(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_unread_count(uuid) TO authenticated;

-- 8) Triggers — pagamentos
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

DROP TRIGGER IF EXISTS trg_notify_pagamento_submitted ON public.pagamentos;
CREATE TRIGGER trg_notify_pagamento_submitted
  AFTER INSERT ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public._internal_notify_pagamento_submitted();

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

DROP TRIGGER IF EXISTS trg_notify_pagamento_status_changed ON public.pagamentos;
CREATE TRIGGER trg_notify_pagamento_status_changed
  AFTER UPDATE OF status ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public._internal_notify_pagamento_status_changed();

-- 9) Triggers — reservas
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
    COALESCE(_buyer_nome, 'Um comprador') || ' reservou ' || NEW.quantidade::text || ' vaga(s) em ' || COALESCE(_exc.titulo, 'sua excursão'),
    '/app/passageiros?excursao=' || NEW.excursao_id::text,
    jsonb_build_object(
      'quantidade', NEW.quantidade,
      'total_price', NEW.total_price,
      'comprador_nome', _buyer_nome,
      'excursao_titulo', _exc.titulo
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

DROP TRIGGER IF EXISTS trg_notify_reserva_created ON public.reservas;
CREATE TRIGGER trg_notify_reserva_created
  AFTER INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public._internal_notify_reserva_created();

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

DROP TRIGGER IF EXISTS trg_notify_reserva_paid ON public.reservas;
CREATE TRIGGER trg_notify_reserva_paid
  AFTER UPDATE OF payment_status ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public._internal_notify_reserva_paid();
