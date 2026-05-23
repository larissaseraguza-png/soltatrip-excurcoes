
CREATE OR REPLACE FUNCTION public.is_active_staff(_excursao_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.equipe_excursoes
    WHERE excursao_id = _excursao_id
      AND staff_user_id = _user_id
      AND status = 'ativo'
  )
$$;

DROP POLICY IF EXISTS "Staff view linked excursoes" ON public.excursoes;

CREATE POLICY "Staff view linked excursoes"
ON public.excursoes
FOR SELECT
USING (public.is_active_staff(id, auth.uid()));
