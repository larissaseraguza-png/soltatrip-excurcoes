
DROP POLICY IF EXISTS "Staff view own links" ON public.equipe_excursoes;
DROP POLICY IF EXISTS "Staff update own links" ON public.equipe_excursoes;

CREATE POLICY "Staff view own links" ON public.equipe_excursoes
  FOR SELECT USING (
    staff_user_id = auth.uid()
    OR (convite_email IS NOT NULL
        AND lower(convite_email) = lower(coalesce(auth.jwt()->>'email', '')))
  );

CREATE POLICY "Staff update own links" ON public.equipe_excursoes
  FOR UPDATE USING (
    staff_user_id = auth.uid()
    OR (convite_email IS NOT NULL
        AND lower(convite_email) = lower(coalesce(auth.jwt()->>'email', '')))
  );
