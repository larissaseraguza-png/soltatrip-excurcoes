
-- ============================================================
-- Helper: é co-organizador (sócio operacional) ativo da excursão
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_coorganizador(_excursao_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.equipe_excursoes
    WHERE excursao_id = _excursao_id
      AND staff_user_id = _user_id
      AND status = 'ativo'
      AND papel = 'coorganizador'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_coorganizador(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_coorganizador(uuid, uuid) TO authenticated, service_role;

-- ============================================================
-- RPC: lista as excursões que o usuário administra (dono OU sócio)
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_managed_excursoes()
RETURNS TABLE (
  id uuid, titulo text, destino text, data_evento date, status text,
  preco numeric, total_vagas integer, custo_onibus numeric,
  cor text, banner_url text, organizer_id uuid, is_owner boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.titulo, e.destino, e.data_evento, e.status,
         e.preco, e.total_vagas, e.custo_onibus,
         e.cor, e.banner_url, e.organizer_id,
         (e.organizer_id = auth.uid()) AS is_owner
  FROM public.excursoes e
  WHERE e.organizer_id = auth.uid()
     OR public.is_coorganizador(e.id, auth.uid())
  ORDER BY e.data_evento ASC
$$;

REVOKE EXECUTE ON FUNCTION public.list_managed_excursoes() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_managed_excursoes() TO authenticated, service_role;

-- ============================================================
-- excursoes: sócio pode VER (SELECT). UPDATE/DELETE continua só do dono.
-- ============================================================
DROP POLICY IF EXISTS "Coorg view excursao" ON public.excursoes;
CREATE POLICY "Coorg view excursao" ON public.excursoes
  FOR SELECT USING (public.is_coorganizador(id, auth.uid()));

-- ============================================================
-- passageiros: sócio gerencia como dono
-- ============================================================
DROP POLICY IF EXISTS "Coorg view passageiros" ON public.passageiros;
CREATE POLICY "Coorg view passageiros" ON public.passageiros
  FOR SELECT USING (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg insert passageiros" ON public.passageiros;
CREATE POLICY "Coorg insert passageiros" ON public.passageiros
  FOR INSERT WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg update passageiros" ON public.passageiros;
CREATE POLICY "Coorg update passageiros" ON public.passageiros
  FOR UPDATE USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg delete passageiros" ON public.passageiros;
CREATE POLICY "Coorg delete passageiros" ON public.passageiros
  FOR DELETE USING (public.is_coorganizador(excursao_id, auth.uid()));

-- guard_passageiro_sensitive_fields: liberar campos para sócio também
CREATE OR REPLACE FUNCTION public.guard_passageiro_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_organizer boolean;
  v_is_staff boolean;
  v_is_coorg boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = NEW.excursao_id AND e.organizer_id = v_uid)
    INTO v_is_organizer;
  IF v_is_organizer THEN RETURN NEW; END IF;

  SELECT public.is_coorganizador(NEW.excursao_id, v_uid) INTO v_is_coorg;
  IF v_is_coorg THEN RETURN NEW; END IF;

  SELECT public.is_active_staff(NEW.excursao_id, v_uid) INTO v_is_staff;
  IF v_is_staff THEN RETURN NEW; END IF;

  IF NEW.payment_status     IS DISTINCT FROM OLD.payment_status     THEN RAISE EXCEPTION 'field_locked: payment_status'; END IF;
  IF NEW.amount_paid        IS DISTINCT FROM OLD.amount_paid        THEN RAISE EXCEPTION 'field_locked: amount_paid'; END IF;
  IF NEW.total_price        IS DISTINCT FROM OLD.total_price        THEN RAISE EXCEPTION 'field_locked: total_price'; END IF;
  IF NEW.status             IS DISTINCT FROM OLD.status             THEN RAISE EXCEPTION 'field_locked: status'; END IF;
  IF NEW.qr_code            IS DISTINCT FROM OLD.qr_code            THEN RAISE EXCEPTION 'field_locked: qr_code'; END IF;
  IF NEW.observacao_interna IS DISTINCT FROM OLD.observacao_interna THEN RAISE EXCEPTION 'field_locked: observacao_interna'; END IF;
  IF NEW.embarcado_em       IS DISTINCT FROM OLD.embarcado_em       THEN RAISE EXCEPTION 'field_locked: embarcado_em'; END IF;
  IF NEW.excursao_id        IS DISTINCT FROM OLD.excursao_id        THEN RAISE EXCEPTION 'field_locked: excursao_id'; END IF;
  IF NEW.comprador_id       IS DISTINCT FROM OLD.comprador_id       THEN RAISE EXCEPTION 'field_locked: comprador_id'; END IF;
  IF NEW.reserva_id         IS DISTINCT FROM OLD.reserva_id         THEN RAISE EXCEPTION 'field_locked: reserva_id'; END IF;
  IF NEW.user_id            IS DISTINCT FROM OLD.user_id            THEN RAISE EXCEPTION 'field_locked: user_id'; END IF;
  IF NEW.convite_token      IS DISTINCT FROM OLD.convite_token      THEN RAISE EXCEPTION 'field_locked: convite_token'; END IF;

  RETURN NEW;
END;
$$;

-- guard_reserva_sensitive_fields: idem para sócio
CREATE OR REPLACE FUNCTION public.guard_reserva_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_organizer boolean;
  v_is_coorg boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = NEW.excursao_id AND e.organizer_id = v_uid)
    INTO v_is_organizer;
  IF v_is_organizer THEN RETURN NEW; END IF;

  SELECT public.is_coorganizador(NEW.excursao_id, v_uid) INTO v_is_coorg;
  IF v_is_coorg THEN RETURN NEW; END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN RAISE EXCEPTION 'field_locked: payment_status'; END IF;
  IF NEW.amount_paid    IS DISTINCT FROM OLD.amount_paid    THEN RAISE EXCEPTION 'field_locked: amount_paid'; END IF;
  IF NEW.total_price    IS DISTINCT FROM OLD.total_price    THEN RAISE EXCEPTION 'field_locked: total_price'; END IF;
  IF NEW.quantidade     IS DISTINCT FROM OLD.quantidade     THEN RAISE EXCEPTION 'field_locked: quantidade'; END IF;
  IF NEW.excursao_id    IS DISTINCT FROM OLD.excursao_id    THEN RAISE EXCEPTION 'field_locked: excursao_id'; END IF;
  IF NEW.comprador_id   IS DISTINCT FROM OLD.comprador_id   THEN RAISE EXCEPTION 'field_locked: comprador_id'; END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- reservas: sócio pode ver e atualizar (financeiro)
-- ============================================================
DROP POLICY IF EXISTS "Coorg view reservas" ON public.reservas;
CREATE POLICY "Coorg view reservas" ON public.reservas
  FOR SELECT USING (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg update reservas" ON public.reservas;
CREATE POLICY "Coorg update reservas" ON public.reservas
  FOR UPDATE USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- seats: sócio gerencia poltronas
-- ============================================================
DROP POLICY IF EXISTS "Coorg manage seats" ON public.seats;
CREATE POLICY "Coorg manage seats" ON public.seats
  FOR ALL USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- onibus: sócio gerencia ônibus
-- ============================================================
DROP POLICY IF EXISTS "Coorg manage onibus" ON public.onibus;
CREATE POLICY "Coorg manage onibus" ON public.onibus
  FOR ALL USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- pontos_embarque: sócio gerencia
-- ============================================================
DROP POLICY IF EXISTS "Coorg manage pontos" ON public.pontos_embarque;
CREATE POLICY "Coorg manage pontos" ON public.pontos_embarque
  FOR ALL USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- excursao_itens: sócio gerencia
-- ============================================================
DROP POLICY IF EXISTS "Coorg manage itens" ON public.excursao_itens;
CREATE POLICY "Coorg manage itens" ON public.excursao_itens
  FOR ALL USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- pedidos_itens: sócio gerencia
-- ============================================================
DROP POLICY IF EXISTS "Coorg manage pedidos" ON public.pedidos_itens;
CREATE POLICY "Coorg manage pedidos" ON public.pedidos_itens
  FOR ALL USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- pagamentos: sócio gerencia
-- ============================================================
DROP POLICY IF EXISTS "Coorg view pagamentos" ON public.pagamentos;
CREATE POLICY "Coorg view pagamentos" ON public.pagamentos
  FOR SELECT USING (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg insert pagamentos" ON public.pagamentos;
CREATE POLICY "Coorg insert pagamentos" ON public.pagamentos
  FOR INSERT WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg update pagamentos" ON public.pagamentos;
CREATE POLICY "Coorg update pagamentos" ON public.pagamentos
  FOR UPDATE USING (public.is_coorganizador(excursao_id, auth.uid()))
  WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg delete pagamentos" ON public.pagamentos;
CREATE POLICY "Coorg delete pagamentos" ON public.pagamentos
  FOR DELETE USING (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- checkins: sócio vê e insere
-- ============================================================
DROP POLICY IF EXISTS "Coorg view checkins" ON public.checkins;
CREATE POLICY "Coorg view checkins" ON public.checkins
  FOR SELECT USING (public.is_coorganizador(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Coorg insert checkins" ON public.checkins;
CREATE POLICY "Coorg insert checkins" ON public.checkins
  FOR INSERT WITH CHECK (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- equipe_excursoes: sócio pode VER quem mais está na equipe
-- (NÃO pode INSERT/UPDATE/DELETE — só o dono gerencia)
-- ============================================================
DROP POLICY IF EXISTS "Coorg view equipe" ON public.equipe_excursoes;
CREATE POLICY "Coorg view equipe" ON public.equipe_excursoes
  FOR SELECT USING (public.is_coorganizador(excursao_id, auth.uid()));

-- ============================================================
-- accept_staff_invitation: ao aceitar como coorganizador,
-- também ganha o papel 'excursionista' (para acessar /app)
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_inv FROM public.invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_inv.used THEN RAISE EXCEPTION 'already_used'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;

  -- Papel da plataforma
  IF v_inv.papel = 'coorganizador' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'excursionista')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'staff')
      ON CONFLICT DO NOTHING;
  END IF;

  -- Vínculo na equipe
  IF EXISTS (SELECT 1 FROM public.equipe_excursoes
              WHERE excursao_id = v_inv.excursao_id AND staff_user_id = v_uid) THEN
    UPDATE public.equipe_excursoes
       SET status = 'ativo', papel = v_inv.papel, updated_at = now()
     WHERE excursao_id = v_inv.excursao_id AND staff_user_id = v_uid;
  ELSE
    INSERT INTO public.equipe_excursoes (excursao_id, staff_user_id, papel, status)
    VALUES (v_inv.excursao_id, v_uid, v_inv.papel, 'ativo');
  END IF;

  UPDATE public.invitations
     SET used = true, used_by = v_uid, used_at = now()
   WHERE id = v_inv.id;

  RETURN v_inv.excursao_id;
END;
$$;
