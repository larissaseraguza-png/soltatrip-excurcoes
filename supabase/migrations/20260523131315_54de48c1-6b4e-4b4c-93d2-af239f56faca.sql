CREATE OR REPLACE FUNCTION public.is_reserva_comprador(_reserva_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservas r
    WHERE r.id = _reserva_id
      AND r.comprador_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_reserva_passageiro(_reserva_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.passageiros p
    WHERE p.reserva_id = _reserva_id
      AND p.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Passageiro view own reserva" ON public.reservas;
CREATE POLICY "Passageiro view own reserva"
ON public.reservas
FOR SELECT
USING (public.is_reserva_passageiro(id, auth.uid()));

DROP POLICY IF EXISTS "Comprador via reserva view passageiros" ON public.passageiros;
CREATE POLICY "Comprador via reserva view passageiros"
ON public.passageiros
FOR SELECT
USING (public.is_reserva_comprador(reserva_id, auth.uid()));

DROP POLICY IF EXISTS "Comprador via reserva update passageiros" ON public.passageiros;
CREATE POLICY "Comprador via reserva update passageiros"
ON public.passageiros
FOR UPDATE
USING (public.is_reserva_comprador(reserva_id, auth.uid()))
WITH CHECK (public.is_reserva_comprador(reserva_id, auth.uid()));

DROP POLICY IF EXISTS "Comprador via reserva view pagamentos" ON public.pagamentos;
CREATE POLICY "Comprador via reserva view pagamentos"
ON public.pagamentos
FOR SELECT
USING (public.is_reserva_comprador(reserva_id, auth.uid()));

DROP POLICY IF EXISTS "Comprador via reserva insert pagamentos" ON public.pagamentos;
CREATE POLICY "Comprador via reserva insert pagamentos"
ON public.pagamentos
FOR INSERT
WITH CHECK (public.is_reserva_comprador(reserva_id, auth.uid()));

NOTIFY pgrst, 'reload schema';