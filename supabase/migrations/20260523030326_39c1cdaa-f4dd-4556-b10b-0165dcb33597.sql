
-- 1. Passageiros (reservas): novos campos
ALTER TABLE public.passageiros
  ADD COLUMN IF NOT EXISTS total_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS seat_id uuid;

-- 2. Pagamentos: parcelas
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS parcelas integer NOT NULL DEFAULT 1;

-- Passageiro vê pagamentos da própria reserva
DROP POLICY IF EXISTS "Passageiro view own pagamentos" ON public.pagamentos;
CREATE POLICY "Passageiro view own pagamentos" ON public.pagamentos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.passageiros p
            WHERE p.id = pagamentos.passageiro_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Passageiro insert own pagamentos" ON public.pagamentos;
CREATE POLICY "Passageiro insert own pagamentos" ON public.pagamentos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.passageiros p
            WHERE p.id = pagamentos.passageiro_id AND p.user_id = auth.uid())
  );

-- 3. Tabela seats
CREATE TABLE IF NOT EXISTS public.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL REFERENCES public.excursoes(id) ON DELETE CASCADE,
  seat_number text NOT NULL,
  occupied boolean NOT NULL DEFAULT false,
  reserved_by uuid,
  passageiro_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (excursao_id, seat_number)
);

ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View seats of published excursoes" ON public.seats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.excursoes e
            WHERE e.id = seats.excursao_id
              AND (e.status = 'publicada' OR e.organizer_id = auth.uid()))
  );

CREATE POLICY "Passageiro claim free seat" ON public.seats
  FOR UPDATE USING (
    (occupied = false AND EXISTS (
       SELECT 1 FROM public.passageiros p
       WHERE p.excursao_id = seats.excursao_id AND p.user_id = auth.uid()
    ))
    OR reserved_by = auth.uid()
  ) WITH CHECK (
    reserved_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.passageiros p
      WHERE p.id = seats.passageiro_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizer manage seats" ON public.seats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.excursoes e
            WHERE e.id = seats.excursao_id AND e.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.excursoes e
            WHERE e.id = seats.excursao_id AND e.organizer_id = auth.uid())
  );

-- 4. Trigger: pagamento confirmado atualiza reserva
CREATE OR REPLACE FUNCTION public.apply_pagamento_to_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric;
  v_paid numeric;
BEGIN
  IF NEW.status <> 'confirmado' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmado' THEN
    RETURN NEW;
  END IF;

  SELECT total_price INTO v_total FROM public.passageiros WHERE id = NEW.passageiro_id FOR UPDATE;

  UPDATE public.passageiros
     SET amount_paid = amount_paid + NEW.valor,
         updated_at = now()
   WHERE id = NEW.passageiro_id
   RETURNING amount_paid INTO v_paid;

  UPDATE public.passageiros
     SET payment_status = CASE
           WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
           WHEN v_paid > 0 THEN 'partial_payment'
           ELSE 'pending_payment'
         END,
         status = CASE WHEN v_paid >= v_total AND v_total > 0 THEN 'confirmado' ELSE status END
   WHERE id = NEW.passageiro_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_pagamento ON public.pagamentos;
CREATE TRIGGER trg_apply_pagamento
AFTER INSERT OR UPDATE OF status ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.apply_pagamento_to_reserva();

-- 5. Trigger: ao criar/atualizar excursao, gerar seats faltantes
CREATE OR REPLACE FUNCTION public.ensure_seats_for_excursao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  i integer;
BEGIN
  IF NEW.total_vagas IS NULL OR NEW.total_vagas <= 0 THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..NEW.total_vagas LOOP
    INSERT INTO public.seats (excursao_id, seat_number)
    VALUES (NEW.id, i::text)
    ON CONFLICT (excursao_id, seat_number) DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ensure_seats ON public.excursoes;
CREATE TRIGGER trg_ensure_seats
AFTER INSERT OR UPDATE OF total_vagas ON public.excursoes
FOR EACH ROW EXECUTE FUNCTION public.ensure_seats_for_excursao();

-- Backfill seats para excursões existentes
DO $$
DECLARE r record; i integer;
BEGIN
  FOR r IN SELECT id, total_vagas FROM public.excursoes WHERE total_vagas > 0 LOOP
    FOR i IN 1..r.total_vagas LOOP
      INSERT INTO public.seats (excursao_id, seat_number)
      VALUES (r.id, i::text)
      ON CONFLICT (excursao_id, seat_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 6. Liberar poltrona ao cancelar reserva
CREATE OR REPLACE FUNCTION public.release_seat_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'cancelled' AND OLD.payment_status <> 'cancelled' THEN
    UPDATE public.seats
       SET occupied = false, reserved_by = NULL, passageiro_id = NULL, updated_at = now()
     WHERE passageiro_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_release_seat ON public.passageiros;
CREATE TRIGGER trg_release_seat
AFTER UPDATE OF payment_status ON public.passageiros
FOR EACH ROW EXECUTE FUNCTION public.release_seat_on_cancel();
