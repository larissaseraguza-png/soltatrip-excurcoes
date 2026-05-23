
-- ============================================================
-- Múltiplos ônibus por excursão
-- ============================================================

-- 1. Tabela onibus
CREATE TABLE public.onibus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL,
  nome text NOT NULL,
  horario_saida text,
  horario_retorno text,
  ponto_partida text,
  capacidade integer NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onibus_excursao ON public.onibus(excursao_id, ordem);

ALTER TABLE public.onibus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage onibus"
ON public.onibus FOR ALL
USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = onibus.excursao_id AND e.organizer_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = onibus.excursao_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Passengers view onibus of published excursoes"
ON public.onibus FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.excursoes e
  WHERE e.id = onibus.excursao_id
    AND (e.status = 'publicada' OR public.has_booking_for_excursao(e.id, auth.uid()))
));

CREATE POLICY "Staff view linked onibus"
ON public.onibus FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE TRIGGER trg_onibus_updated_at
BEFORE UPDATE ON public.onibus
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Adicionar onibus_id em todas as tabelas filhas
ALTER TABLE public.seats           ADD COLUMN onibus_id uuid;
ALTER TABLE public.pontos_embarque ADD COLUMN onibus_id uuid;
ALTER TABLE public.passageiros     ADD COLUMN onibus_id uuid;
ALTER TABLE public.equipe_excursoes ADD COLUMN onibus_id uuid;
ALTER TABLE public.checkins        ADD COLUMN onibus_id uuid;
ALTER TABLE public.pagamentos      ADD COLUMN onibus_id uuid;

-- 3. Backfill: criar 1 onibus padrão por excursão e linkar dados existentes
DO $$
DECLARE
  v_exc RECORD;
  v_bus_id uuid;
BEGIN
  FOR v_exc IN SELECT id, total_vagas, horario_saida, horario_retorno, ponto_embarque FROM public.excursoes LOOP
    INSERT INTO public.onibus (excursao_id, nome, horario_saida, horario_retorno, ponto_partida, capacidade, ordem, ativo)
    VALUES (v_exc.id, 'Ônibus 1', v_exc.horario_saida, v_exc.horario_retorno, v_exc.ponto_embarque, COALESCE(v_exc.total_vagas, 0), 0, true)
    RETURNING id INTO v_bus_id;

    UPDATE public.seats            SET onibus_id = v_bus_id WHERE excursao_id = v_exc.id;
    UPDATE public.pontos_embarque  SET onibus_id = v_bus_id WHERE excursao_id = v_exc.id;
    UPDATE public.passageiros      SET onibus_id = v_bus_id WHERE excursao_id = v_exc.id;
    UPDATE public.equipe_excursoes SET onibus_id = v_bus_id WHERE excursao_id = v_exc.id;
    UPDATE public.checkins         SET onibus_id = v_bus_id WHERE excursao_id = v_exc.id;
    UPDATE public.pagamentos       SET onibus_id = v_bus_id WHERE excursao_id = v_exc.id;
  END LOOP;
END $$;

-- 4. Índices úteis
CREATE INDEX idx_seats_onibus            ON public.seats(onibus_id);
CREATE INDEX idx_pontos_onibus           ON public.pontos_embarque(onibus_id);
CREATE INDEX idx_passageiros_onibus      ON public.passageiros(onibus_id);
CREATE INDEX idx_equipe_onibus           ON public.equipe_excursoes(onibus_id);
CREATE INDEX idx_checkins_onibus         ON public.checkins(onibus_id);
CREATE INDEX idx_pagamentos_onibus       ON public.pagamentos(onibus_id);

-- 5. Substitui trigger antigo (poltronas por excursão) por trigger por ônibus
DROP TRIGGER IF EXISTS ensure_seats_after_excursao_insert ON public.excursoes;
DROP TRIGGER IF EXISTS trg_ensure_seats_for_excursao ON public.excursoes;

CREATE OR REPLACE FUNCTION public.ensure_seats_for_onibus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE i integer;
BEGIN
  IF NEW.capacidade IS NULL OR NEW.capacidade <= 0 THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..NEW.capacidade LOOP
    INSERT INTO public.seats (excursao_id, onibus_id, seat_number)
    VALUES (NEW.excursao_id, NEW.id, i::text)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ensure_seats_for_onibus
AFTER INSERT ON public.onibus
FOR EACH ROW EXECUTE FUNCTION public.ensure_seats_for_onibus();

-- 6. Função helper: staff ativo NESTE ônibus (ou sem onibus_id = ainda não atribuído)
CREATE OR REPLACE FUNCTION public.is_active_staff_bus(_onibus_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.equipe_excursoes ee
    JOIN public.onibus o ON o.id = _onibus_id
    WHERE ee.excursao_id = o.excursao_id
      AND ee.staff_user_id = _user_id
      AND ee.status = 'ativo'
      AND (ee.onibus_id IS NULL OR ee.onibus_id = _onibus_id)
  )
$$;

-- 7. Restringe RLS de staff para ver apenas o seu ônibus
DROP POLICY IF EXISTS "Staff view linked passageiros" ON public.passageiros;
CREATE POLICY "Staff view linked passageiros"
ON public.passageiros FOR SELECT
USING (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

DROP POLICY IF EXISTS "Staff update linked passageiros" ON public.passageiros;
CREATE POLICY "Staff update linked passageiros"
ON public.passageiros FOR UPDATE
USING (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
)
WITH CHECK (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

DROP POLICY IF EXISTS "Staff view linked seats" ON public.seats;
CREATE POLICY "Staff view linked seats"
ON public.seats FOR SELECT
USING (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

DROP POLICY IF EXISTS "Staff view linked pontos" ON public.pontos_embarque;
CREATE POLICY "Staff view linked pontos"
ON public.pontos_embarque FOR SELECT
USING (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

DROP POLICY IF EXISTS "Staff view linked checkins" ON public.checkins;
CREATE POLICY "Staff view linked checkins"
ON public.checkins FOR SELECT
USING (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

DROP POLICY IF EXISTS "Staff insert linked checkins" ON public.checkins;
CREATE POLICY "Staff insert linked checkins"
ON public.checkins FOR INSERT
WITH CHECK (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

DROP POLICY IF EXISTS "Staff view linked pagamentos" ON public.pagamentos;
CREATE POLICY "Staff view linked pagamentos"
ON public.pagamentos FOR SELECT
USING (
  public.is_active_staff(excursao_id, auth.uid())
  AND (onibus_id IS NULL OR public.is_active_staff_bus(onibus_id, auth.uid()))
);

-- 8. Atualizar funções para aceitar onibus_id e validar consistência

-- 8a. organizer_create_manual_passageiro
CREATE OR REPLACE FUNCTION public.organizer_create_manual_passageiro(
  p_excursao_id uuid,
  p_nome text,
  p_telefone text DEFAULT NULL,
  p_documento text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_seat_id uuid DEFAULT NULL,
  p_ponto_embarque_id uuid DEFAULT NULL,
  p_total_price numeric DEFAULT 0,
  p_amount_paid numeric DEFAULT 0,
  p_payment_status text DEFAULT 'pending_payment',
  p_status text DEFAULT 'pendente',
  p_observacao_interna text DEFAULT NULL,
  p_onibus_id uuid DEFAULT NULL
)
RETURNS passageiros
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pax public.passageiros%ROWTYPE;
  v_seat public.seats%ROWTYPE;
  v_assento text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.excursoes WHERE id = p_excursao_id AND organizer_id = v_uid) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_onibus_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.onibus WHERE id = p_onibus_id AND excursao_id = p_excursao_id
  ) THEN
    RAISE EXCEPTION 'invalid_onibus';
  END IF;

  IF p_seat_id IS NOT NULL THEN
    SELECT * INTO v_seat FROM public.seats
     WHERE id = p_seat_id AND excursao_id = p_excursao_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'seat_not_found'; END IF;
    IF p_onibus_id IS NOT NULL AND v_seat.onibus_id IS DISTINCT FROM p_onibus_id THEN
      RAISE EXCEPTION 'seat_wrong_onibus';
    END IF;
    IF v_seat.occupied = true AND v_seat.passageiro_id IS NOT NULL THEN
      RAISE EXCEPTION 'seat_already_taken';
    END IF;
    v_assento := v_seat.seat_number;
  END IF;

  IF p_ponto_embarque_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pontos_embarque
      WHERE id = p_ponto_embarque_id AND excursao_id = p_excursao_id
        AND (p_onibus_id IS NULL OR onibus_id IS NULL OR onibus_id = p_onibus_id)
    ) THEN
      RAISE EXCEPTION 'invalid_boarding_point';
    END IF;
  END IF;

  INSERT INTO public.passageiros (
    excursao_id, onibus_id, comprador_id, nome, telefone, documento, email,
    seat_id, assento, ponto_embarque_id,
    total_price, amount_paid, payment_status, status, observacao_interna
  ) VALUES (
    p_excursao_id, p_onibus_id, v_uid, p_nome, p_telefone, p_documento, p_email,
    p_seat_id, v_assento, p_ponto_embarque_id,
    COALESCE(p_total_price, 0),
    COALESCE(p_amount_paid, 0),
    COALESCE(p_payment_status, 'pending_payment'),
    COALESCE(p_status, 'pendente'),
    p_observacao_interna
  )
  RETURNING * INTO v_pax;

  IF p_seat_id IS NOT NULL THEN
    UPDATE public.seats
       SET occupied = true, passageiro_id = v_pax.id, reserved_by = v_uid, updated_at = now()
     WHERE id = p_seat_id;
  END IF;

  IF COALESCE(p_amount_paid, 0) > 0 THEN
    INSERT INTO public.pagamentos (excursao_id, onibus_id, passageiro_id, valor, metodo, status, observacao, pago_em)
    VALUES (p_excursao_id, p_onibus_id, v_pax.id, p_amount_paid, 'manual', 'confirmado',
            'Pagamento manual registrado pelo organizador', now());
  END IF;

  RETURN v_pax;
END $$;

-- 8b. organizer_update_passageiro_trip_choices - aceita troca de ônibus
CREATE OR REPLACE FUNCTION public.organizer_update_passageiro_trip_choices(
  p_passageiro_id uuid,
  p_seat_id uuid DEFAULT NULL,
  p_update_seat boolean DEFAULT false,
  p_ponto_embarque_id uuid DEFAULT NULL,
  p_update_ponto boolean DEFAULT false,
  p_onibus_id uuid DEFAULT NULL,
  p_update_onibus boolean DEFAULT false
)
RETURNS passageiros
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pax public.passageiros%ROWTYPE;
  v_new_seat public.seats%ROWTYPE;
  v_result public.passageiros%ROWTYPE;
  v_target_onibus uuid;
BEGIN
  SELECT * INTO v_pax FROM public.passageiros WHERE id = p_passageiro_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'passageiro_not_found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = v_pax.excursao_id AND e.organizer_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_target_onibus := CASE WHEN p_update_onibus THEN p_onibus_id ELSE v_pax.onibus_id END;

  IF p_update_onibus AND p_onibus_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.onibus WHERE id = p_onibus_id AND excursao_id = v_pax.excursao_id) THEN
      RAISE EXCEPTION 'invalid_onibus';
    END IF;
  END IF;

  IF p_update_ponto AND p_ponto_embarque_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pontos_embarque pe
      WHERE pe.id = p_ponto_embarque_id AND pe.excursao_id = v_pax.excursao_id
        AND (v_target_onibus IS NULL OR pe.onibus_id IS NULL OR pe.onibus_id = v_target_onibus)
    ) THEN RAISE EXCEPTION 'invalid_boarding_point'; END IF;
  END IF;

  IF p_update_seat THEN
    IF p_seat_id IS NOT NULL THEN
      SELECT * INTO v_new_seat FROM public.seats
       WHERE id = p_seat_id AND excursao_id = v_pax.excursao_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'seat_not_found'; END IF;
      IF v_target_onibus IS NOT NULL AND v_new_seat.onibus_id IS DISTINCT FROM v_target_onibus THEN
        RAISE EXCEPTION 'seat_wrong_onibus';
      END IF;
      IF v_new_seat.occupied = true AND v_new_seat.passageiro_id IS NOT NULL AND v_new_seat.passageiro_id <> v_pax.id THEN
        RAISE EXCEPTION 'seat_already_taken';
      END IF;
    END IF;

    IF v_pax.seat_id IS NOT NULL AND v_pax.seat_id IS DISTINCT FROM p_seat_id THEN
      UPDATE public.seats SET occupied = false, reserved_by = NULL, passageiro_id = NULL, updated_at = now()
       WHERE id = v_pax.seat_id AND passageiro_id = v_pax.id;
    END IF;

    IF p_seat_id IS NOT NULL THEN
      UPDATE public.seats SET occupied = true,
             reserved_by = COALESCE(v_pax.user_id, v_pax.comprador_id),
             passageiro_id = v_pax.id, updated_at = now()
       WHERE id = p_seat_id;
    END IF;
  END IF;

  UPDATE public.passageiros
     SET seat_id  = CASE WHEN p_update_seat   THEN p_seat_id           ELSE seat_id           END,
         assento  = CASE WHEN p_update_seat   THEN v_new_seat.seat_number ELSE assento        END,
         ponto_embarque_id = CASE WHEN p_update_ponto THEN p_ponto_embarque_id ELSE ponto_embarque_id END,
         onibus_id = CASE WHEN p_update_onibus THEN p_onibus_id         ELSE onibus_id         END,
         updated_at = now()
   WHERE id = v_pax.id
   RETURNING * INTO v_result;

  RETURN v_result;
END $$;

-- 8c. criar_reserva_grupo - aceita onibus_id
CREATE OR REPLACE FUNCTION public.criar_reserva_grupo(
  p_excursao_id uuid,
  p_passageiros jsonb,
  p_onibus_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_preco numeric; v_status text; v_qtd integer;
  v_reserva_id uuid; v_pax jsonb; v_user_id uuid; v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT preco, status INTO v_preco, v_status FROM public.excursoes WHERE id = p_excursao_id;
  IF v_status <> 'publicada' THEN RAISE EXCEPTION 'excursao_nao_publicada'; END IF;
  v_qtd := jsonb_array_length(p_passageiros);
  IF v_qtd < 1 OR v_qtd > 20 THEN RAISE EXCEPTION 'quantidade_invalida'; END IF;

  IF p_onibus_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.onibus WHERE id = p_onibus_id AND excursao_id = p_excursao_id AND ativo = true
  ) THEN RAISE EXCEPTION 'invalid_onibus'; END IF;

  INSERT INTO public.reservas (excursao_id, comprador_id, quantidade, total_price, amount_paid, payment_status)
  VALUES (p_excursao_id, v_uid, v_qtd, v_preco * v_qtd, 0, 'pending_payment')
  RETURNING id INTO v_reserva_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'passageiro') ON CONFLICT DO NOTHING;

  FOR v_pax IN SELECT * FROM jsonb_array_elements(p_passageiros) LOOP
    v_user_id := NULL; v_token := NULL;
    IF COALESCE((v_pax->>'titular')::boolean, false) THEN v_user_id := v_uid;
    ELSE v_token := encode(extensions.gen_random_bytes(18), 'hex'); END IF;
    INSERT INTO public.passageiros (
      excursao_id, onibus_id, reserva_id, comprador_id, user_id, nome, email,
      status, total_price, amount_paid, payment_status, convite_token
    ) VALUES (
      p_excursao_id, p_onibus_id, v_reserva_id, v_uid, v_user_id,
      COALESCE(v_pax->>'nome',''), v_pax->>'email',
      'pendente', v_preco, 0, 'pending_payment', v_token
    );
  END LOOP;
  RETURN v_reserva_id;
END $$;

-- 8d. Trigger pagamentos: herda onibus_id do passageiro automaticamente
CREATE OR REPLACE FUNCTION public.set_pagamento_onibus()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.onibus_id IS NULL AND NEW.passageiro_id IS NOT NULL THEN
    SELECT onibus_id INTO NEW.onibus_id FROM public.passageiros WHERE id = NEW.passageiro_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_pagamento_onibus
BEFORE INSERT ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.set_pagamento_onibus();

-- 8e. Helper para o staff listar seus ônibus
CREATE OR REPLACE FUNCTION public.list_my_staff_onibus()
RETURNS TABLE(onibus_id uuid, excursao_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ee.onibus_id, ee.excursao_id
  FROM public.equipe_excursoes ee
  WHERE ee.staff_user_id = auth.uid() AND ee.status = 'ativo'
$$;
