-- Staff can update only passenger operational status inside linked excursions.
DROP POLICY IF EXISTS "Staff update linked passageiros" ON public.passageiros;
CREATE POLICY "Staff update linked passageiros"
ON public.passageiros
FOR UPDATE
USING (public.is_active_staff(excursao_id, auth.uid()))
WITH CHECK (public.is_active_staff(excursao_id, auth.uid()));

-- Passenger can update only their own booking, used for seat selection and personal booking fields.
DROP POLICY IF EXISTS "Passageiro update own booking" ON public.passageiros;
CREATE POLICY "Passageiro update own booking"
ON public.passageiros
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Staff can see seats only for linked excursions.
DROP POLICY IF EXISTS "Staff view linked seats" ON public.seats;
CREATE POLICY "Staff view linked seats"
ON public.seats
FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

-- Staff can participate in messages only for linked excursions.
DROP POLICY IF EXISTS "Staff view linked mensagens" ON public.mensagens;
DROP POLICY IF EXISTS "Staff insert linked mensagens" ON public.mensagens;
CREATE POLICY "Staff view linked mensagens"
ON public.mensagens
FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE POLICY "Staff insert linked mensagens"
ON public.mensagens
FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND public.is_active_staff(excursao_id, auth.uid())
);