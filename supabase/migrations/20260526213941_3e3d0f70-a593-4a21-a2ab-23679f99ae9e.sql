
-- Permite que co-organizador (sócio) edite informações da excursão,
-- exceto trocar o dono (organizer_id) — protegido por trigger.

CREATE POLICY "Coorg update excursao"
ON public.excursoes
FOR UPDATE
TO authenticated
USING (is_coorganizador(id, auth.uid()))
WITH CHECK (is_coorganizador(id, auth.uid()));

-- Trigger: bloqueia troca de organizer_id por qualquer um que não seja o dono atual.
CREATE OR REPLACE FUNCTION public.protect_excursao_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organizer_id IS DISTINCT FROM OLD.organizer_id THEN
    IF auth.uid() IS DISTINCT FROM OLD.organizer_id THEN
      RAISE EXCEPTION 'Apenas o excursionista raiz pode transferir a excursão';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_excursao_identity ON public.excursoes;
CREATE TRIGGER trg_protect_excursao_identity
BEFORE UPDATE ON public.excursoes
FOR EACH ROW
EXECUTE FUNCTION public.protect_excursao_identity();
