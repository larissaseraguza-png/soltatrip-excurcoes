
ALTER TABLE public.invitations ALTER COLUMN excursao_id DROP NOT NULL;

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_papel_excursao_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_papel_excursao_check
  CHECK (
    (papel = 'socio_raiz' AND excursao_id IS NULL)
    OR (papel <> 'socio_raiz' AND excursao_id IS NOT NULL)
  );

CREATE TABLE IF NOT EXISTS public.excursionista_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raiz_id uuid NOT NULL,
  socio_user_id uuid,
  convite_email text,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raiz_id, socio_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.excursionista_socios TO authenticated;
GRANT ALL ON public.excursionista_socios TO service_role;

ALTER TABLE public.excursionista_socios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Raiz manages own socios" ON public.excursionista_socios;
CREATE POLICY "Raiz manages own socios"
  ON public.excursionista_socios FOR ALL
  TO authenticated
  USING (raiz_id = auth.uid())
  WITH CHECK (raiz_id = auth.uid());

DROP POLICY IF EXISTS "Socio views own link" ON public.excursionista_socios;
CREATE POLICY "Socio views own link"
  ON public.excursionista_socios FOR SELECT
  TO authenticated
  USING (socio_user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_excursionista_socios_touch ON public.excursionista_socios;
CREATE TRIGGER trg_excursionista_socios_touch
  BEFORE UPDATE ON public.excursionista_socios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_coorganizador(_excursao_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.equipe_excursoes
    WHERE excursao_id = _excursao_id
      AND staff_user_id = _user_id
      AND status = 'ativo'
      AND papel = 'coorganizador'
  ) OR EXISTS (
    SELECT 1 FROM public.excursionista_socios s
    JOIN public.excursoes e ON e.id = _excursao_id
    WHERE s.raiz_id = e.organizer_id
      AND s.socio_user_id = _user_id
      AND s.status = 'ativo'
  )
$$;

DROP POLICY IF EXISTS "Organizer manages own invitations" ON public.invitations;
CREATE POLICY "Organizer manages own invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() AND (
      (papel = 'socio_raiz' AND excursao_id IS NULL)
      OR (excursao_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.excursoes e
        WHERE e.id = invitations.excursao_id AND e.organizer_id = auth.uid()))
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND (
      (papel = 'socio_raiz' AND excursao_id IS NULL)
      OR (excursao_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.excursoes e
        WHERE e.id = invitations.excursao_id AND e.organizer_id = auth.uid()))
    )
  );

CREATE OR REPLACE FUNCTION public.accept_socio_raiz_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_inv FROM public.invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_inv.papel <> 'socio_raiz' THEN RAISE EXCEPTION 'invalid_invitation_type'; END IF;
  IF v_inv.used THEN RAISE EXCEPTION 'already_used'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  IF v_inv.created_by = v_uid THEN RAISE EXCEPTION 'cannot_be_own_socio'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'excursionista')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.excursionista_socios (raiz_id, socio_user_id, status)
  VALUES (v_inv.created_by, v_uid, 'ativo')
  ON CONFLICT (raiz_id, socio_user_id)
    DO UPDATE SET status = 'ativo', updated_at = now();

  UPDATE public.invitations SET used = true, used_by = v_uid, used_at = now()
   WHERE id = v_inv.id;

  RETURN v_inv.created_by;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_socio_raiz_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_socio_raiz_invitation(text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_staff_invitation(text);
CREATE OR REPLACE FUNCTION public.get_staff_invitation(p_token text)
RETURNS TABLE(
  id uuid, papel text, expires_at timestamptz, used boolean, used_by uuid,
  excursao_id uuid, excursao_titulo text, excursao_destino text, excursao_data_evento date,
  raiz_id uuid, raiz_nome text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.papel, i.expires_at, i.used, i.used_by,
         e.id, e.titulo, e.destino, e.data_evento,
         i.created_by AS raiz_id,
         COALESCE(p.company_name, p.full_name) AS raiz_nome
  FROM public.invitations i
  LEFT JOIN public.excursoes e ON e.id = i.excursao_id
  LEFT JOIN public.profiles p ON p.id = i.created_by
  WHERE i.token = p_token
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.list_my_socios()
RETURNS TABLE(id uuid, socio_user_id uuid, status text, nome text, email text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.socio_user_id, s.status,
         COALESCE(p.full_name, p.company_name, 'Sócio') AS nome,
         u.email, s.created_at
  FROM public.excursionista_socios s
  LEFT JOIN public.profiles p ON p.id = s.socio_user_id
  LEFT JOIN auth.users u ON u.id = s.socio_user_id
  WHERE s.raiz_id = auth.uid()
  ORDER BY s.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_my_socios() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_socios() TO authenticated;
