
ALTER TABLE public.passageiros
  ADD COLUMN IF NOT EXISTS comprador_id uuid,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS convite_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_passageiros_comprador ON public.passageiros(comprador_id);
CREATE INDEX IF NOT EXISTS idx_passageiros_convite_token ON public.passageiros(convite_token);

-- Backfill: comprador_id = user_id quando nulo
UPDATE public.passageiros SET comprador_id = user_id WHERE comprador_id IS NULL AND user_id IS NOT NULL;

-- Permitir que o comprador veja/edite/insira reservas onde ele é o comprador
DROP POLICY IF EXISTS "Comprador view own purchases" ON public.passageiros;
CREATE POLICY "Comprador view own purchases"
ON public.passageiros FOR SELECT
USING (comprador_id = auth.uid());

DROP POLICY IF EXISTS "Comprador insert purchases" ON public.passageiros;
CREATE POLICY "Comprador insert purchases"
ON public.passageiros FOR INSERT
WITH CHECK (
  comprador_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = excursao_id AND e.status = 'publicada')
);

DROP POLICY IF EXISTS "Comprador update purchases" ON public.passageiros;
CREATE POLICY "Comprador update purchases"
ON public.passageiros FOR UPDATE
USING (comprador_id = auth.uid())
WITH CHECK (comprador_id = auth.uid());

DROP POLICY IF EXISTS "Comprador delete purchases" ON public.passageiros;
CREATE POLICY "Comprador delete purchases"
ON public.passageiros FOR DELETE
USING (comprador_id = auth.uid());

-- Permitir comprador inserir pagamentos para reservas que ele criou
DROP POLICY IF EXISTS "Comprador insert pagamentos for own purchases" ON public.pagamentos;
CREATE POLICY "Comprador insert pagamentos for own purchases"
ON public.pagamentos FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.passageiros p WHERE p.id = passageiro_id AND p.comprador_id = auth.uid())
);

DROP POLICY IF EXISTS "Comprador view pagamentos for own purchases" ON public.pagamentos;
CREATE POLICY "Comprador view pagamentos for own purchases"
ON public.pagamentos FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.passageiros p WHERE p.id = passageiro_id AND p.comprador_id = auth.uid())
);

-- Permitir comprador reclamar/escolher poltrona para reservas que comprou
DROP POLICY IF EXISTS "Passageiro claim free seat" ON public.seats;
CREATE POLICY "Passageiro claim free seat"
ON public.seats FOR UPDATE
USING (
  (occupied = false AND EXISTS (
    SELECT 1 FROM public.passageiros p
    WHERE p.excursao_id = seats.excursao_id
      AND (p.user_id = auth.uid() OR p.comprador_id = auth.uid())
  ))
  OR reserved_by = auth.uid()
)
WITH CHECK (
  reserved_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.passageiros p
    WHERE p.id = seats.passageiro_id
      AND (p.user_id = auth.uid() OR p.comprador_id = auth.uid())
  )
);

-- Ajusta lock para considerar comprador também como organizador "ampliado"? Não: só organizador altera após locked.
-- Mantém triggers existentes.

-- Função para convidado reivindicar reserva via token
CREATE OR REPLACE FUNCTION public.claim_passageiro_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reserva_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.passageiros
     SET user_id = v_uid,
         convite_token = NULL,
         updated_at = now()
   WHERE convite_token = p_token
     AND user_id IS NULL
   RETURNING id INTO v_reserva_id;

  IF v_reserva_id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_used_token';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'passageiro')
  ON CONFLICT DO NOTHING;

  RETURN v_reserva_id;
END;
$$;

-- Função pública para buscar info de convite (sem autenticação obrigatória)
CREATE OR REPLACE FUNCTION public.get_passageiro_invite(p_token text)
RETURNS TABLE(
  reserva_id uuid,
  nome text,
  excursao_id uuid,
  excursao_titulo text,
  excursao_destino text,
  excursao_data date,
  ja_usado boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome, e.id, e.titulo, e.destino, e.data_evento, (p.user_id IS NOT NULL)
  FROM public.passageiros p
  JOIN public.excursoes e ON e.id = p.excursao_id
  WHERE p.convite_token = p_token
  LIMIT 1
$$;
