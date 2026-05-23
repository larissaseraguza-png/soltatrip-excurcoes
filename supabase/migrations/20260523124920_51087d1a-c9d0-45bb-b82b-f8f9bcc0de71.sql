
-- 1) Adicionar colunas primeiro
ALTER TABLE public.passageiros ADD COLUMN IF NOT EXISTS reserva_id uuid;
CREATE INDEX IF NOT EXISTS passageiros_reserva_idx ON public.passageiros(reserva_id);

ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS reserva_id uuid;
CREATE INDEX IF NOT EXISTS pagamentos_reserva_idx ON public.pagamentos(reserva_id);

-- comprador_id pode ser null para registros muito antigos
ALTER TABLE public.passageiros ALTER COLUMN comprador_id DROP NOT NULL;

-- 2) Tabela reservas
CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL,
  comprador_id uuid NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending_payment',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservas_comprador_idx ON public.reservas(comprador_id);
CREATE INDEX IF NOT EXISTS reservas_excursao_idx ON public.reservas(excursao_id);

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS reservas_touch ON public.reservas;
CREATE TRIGGER reservas_touch
BEFORE UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) RLS reservas
DROP POLICY IF EXISTS "Comprador manage own reservas" ON public.reservas;
CREATE POLICY "Comprador manage own reservas" ON public.reservas
FOR ALL USING (comprador_id = auth.uid()) WITH CHECK (comprador_id = auth.uid());

DROP POLICY IF EXISTS "Organizers view reservas" ON public.reservas;
CREATE POLICY "Organizers view reservas" ON public.reservas
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.excursoes e WHERE e.id = reservas.excursao_id AND e.organizer_id = auth.uid()
));

DROP POLICY IF EXISTS "Organizers update reservas" ON public.reservas;
CREATE POLICY "Organizers update reservas" ON public.reservas
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.excursoes e WHERE e.id = reservas.excursao_id AND e.organizer_id = auth.uid()
));

DROP POLICY IF EXISTS "Staff view reservas" ON public.reservas;
CREATE POLICY "Staff view reservas" ON public.reservas
FOR SELECT USING (public.is_active_staff(excursao_id, auth.uid()));

DROP POLICY IF EXISTS "Passageiro view own reserva" ON public.reservas;
CREATE POLICY "Passageiro view own reserva" ON public.reservas
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.passageiros p WHERE p.reserva_id = reservas.id AND p.user_id = auth.uid()
));

-- 4) Backfill: cada passageiro vira uma reserva 1-pra-1
DO $$
DECLARE r record; v_reserva_id uuid; v_comprador uuid;
BEGIN
  FOR r IN SELECT * FROM public.passageiros WHERE reserva_id IS NULL LOOP
    v_comprador := COALESCE(r.comprador_id, r.user_id);
    IF v_comprador IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.reservas (excursao_id, comprador_id, quantidade, total_price, amount_paid, payment_status, created_at, updated_at)
    VALUES (r.excursao_id, v_comprador, 1, COALESCE(r.total_price,0), COALESCE(r.amount_paid,0), COALESCE(r.payment_status,'pending_payment'), r.created_at, r.updated_at)
    RETURNING id INTO v_reserva_id;
    UPDATE public.passageiros SET reserva_id = v_reserva_id, comprador_id = COALESCE(comprador_id, v_comprador) WHERE id = r.id;
    UPDATE public.pagamentos SET reserva_id = v_reserva_id WHERE passageiro_id = r.id AND reserva_id IS NULL;
  END LOOP;
END $$;

-- 5) Trigger novo: aplicar pagamento na reserva
CREATE OR REPLACE FUNCTION public.apply_pagamento_to_reserva_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_reserva_id uuid; v_total numeric; v_paid numeric; v_new_status text; v_qtd integer;
BEGIN
  IF NEW.status <> 'confirmado' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmado' THEN RETURN NEW; END IF;

  v_reserva_id := NEW.reserva_id;
  IF v_reserva_id IS NULL AND NEW.passageiro_id IS NOT NULL THEN
    SELECT reserva_id INTO v_reserva_id FROM public.passageiros WHERE id = NEW.passageiro_id;
  END IF;
  IF v_reserva_id IS NULL THEN RETURN NEW; END IF;

  SELECT total_price, quantidade INTO v_total, v_qtd FROM public.reservas WHERE id = v_reserva_id FOR UPDATE;

  UPDATE public.reservas SET amount_paid = amount_paid + NEW.valor, updated_at = now()
   WHERE id = v_reserva_id RETURNING amount_paid INTO v_paid;

  v_new_status := CASE WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
                       WHEN v_paid > 0 THEN 'partial_payment'
                       ELSE 'pending_payment' END;

  UPDATE public.reservas SET payment_status = v_new_status WHERE id = v_reserva_id;

  UPDATE public.passageiros
     SET amount_paid = (v_paid / GREATEST(1, v_qtd)),
         payment_status = v_new_status,
         status = CASE WHEN v_new_status = 'paid' THEN 'confirmado' ELSE status END,
         updated_at = now()
   WHERE reserva_id = v_reserva_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pagamentos_apply ON public.pagamentos;
DROP TRIGGER IF EXISTS pagamentos_apply_v2 ON public.pagamentos;
CREATE TRIGGER pagamentos_apply_v2
AFTER INSERT OR UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.apply_pagamento_to_reserva_v2();

-- 6) RLS passageiros (comprador via reserva)
DROP POLICY IF EXISTS "Comprador via reserva view passageiros" ON public.passageiros;
CREATE POLICY "Comprador via reserva view passageiros" ON public.passageiros
FOR SELECT USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = passageiros.reserva_id AND r.comprador_id = auth.uid()));

DROP POLICY IF EXISTS "Comprador via reserva update passageiros" ON public.passageiros;
CREATE POLICY "Comprador via reserva update passageiros" ON public.passageiros
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = passageiros.reserva_id AND r.comprador_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = passageiros.reserva_id AND r.comprador_id = auth.uid()));

-- 7) RLS pagamentos (via reserva)
DROP POLICY IF EXISTS "Comprador via reserva view pagamentos" ON public.pagamentos;
CREATE POLICY "Comprador via reserva view pagamentos" ON public.pagamentos
FOR SELECT USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = pagamentos.reserva_id AND r.comprador_id = auth.uid()));

DROP POLICY IF EXISTS "Comprador via reserva insert pagamentos" ON public.pagamentos;
CREATE POLICY "Comprador via reserva insert pagamentos" ON public.pagamentos
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = pagamentos.reserva_id AND r.comprador_id = auth.uid()));

-- 8) RPC criar reserva em grupo
CREATE OR REPLACE FUNCTION public.criar_reserva_grupo(
  p_excursao_id uuid, p_passageiros jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

  INSERT INTO public.reservas (excursao_id, comprador_id, quantidade, total_price, amount_paid, payment_status)
  VALUES (p_excursao_id, v_uid, v_qtd, v_preco * v_qtd, 0, 'pending_payment')
  RETURNING id INTO v_reserva_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'passageiro') ON CONFLICT DO NOTHING;

  FOR v_pax IN SELECT * FROM jsonb_array_elements(p_passageiros) LOOP
    v_user_id := NULL; v_token := NULL;
    IF COALESCE((v_pax->>'titular')::boolean, false) THEN
      v_user_id := v_uid;
    ELSE
      v_token := encode(extensions.gen_random_bytes(18), 'hex');
    END IF;
    INSERT INTO public.passageiros (
      excursao_id, reserva_id, comprador_id, user_id, nome, email,
      status, total_price, amount_paid, payment_status, convite_token
    ) VALUES (
      p_excursao_id, v_reserva_id, v_uid, v_user_id,
      COALESCE(v_pax->>'nome',''), v_pax->>'email',
      'pendente', v_preco, 0, 'pending_payment', v_token
    );
  END LOOP;

  RETURN v_reserva_id;
END $$;
