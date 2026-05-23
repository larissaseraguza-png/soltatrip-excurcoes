
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL REFERENCES public.excursoes(id) ON DELETE CASCADE,
  papel text NOT NULL DEFAULT 'apoio',
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used boolean NOT NULL DEFAULT false,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_excursao ON public.invitations(excursao_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Qualquer um com o link pode consultar (o token é o segredo)
CREATE POLICY "Anyone can read invitation by token"
  ON public.invitations FOR SELECT
  USING (true);

CREATE POLICY "Organizer manages invitations"
  ON public.invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = invitations.excursao_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = invitations.excursao_id AND e.organizer_id = auth.uid()));

-- Função de aceite
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_inv FROM public.invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;
  IF v_inv.used THEN
    RAISE EXCEPTION 'already_used';
  END IF;
  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;

  -- Garante papel staff
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'staff')
  ON CONFLICT DO NOTHING;

  -- Vincula à excursão (upsert manual)
  IF EXISTS (SELECT 1 FROM public.equipe_excursoes WHERE excursao_id = v_inv.excursao_id AND staff_user_id = v_uid) THEN
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

GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(text) TO authenticated;
