-- Helpers for isolated access checks
CREATE OR REPLACE FUNCTION public.has_booking_for_excursao(_excursao_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.passageiros p
    WHERE p.excursao_id = _excursao_id
      AND p.user_id = _user_id
  )
$$;

-- Safe public lookup for staff invite links. This avoids a broad SELECT policy on invitations.
CREATE OR REPLACE FUNCTION public.get_staff_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  papel text,
  expires_at timestamptz,
  used boolean,
  excursao_id uuid,
  excursao_titulo text,
  excursao_destino text,
  excursao_data_evento date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.papel,
    i.expires_at,
    i.used,
    e.id AS excursao_id,
    e.titulo AS excursao_titulo,
    e.destino AS excursao_destino,
    e.data_evento AS excursao_data_evento
  FROM public.invitations i
  JOIN public.excursoes e ON e.id = i.excursao_id
  WHERE i.token = p_token
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_invitation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_booking_for_excursao(uuid, uuid) TO authenticated;

-- Tighten excursion visibility by role/context.
DROP POLICY IF EXISTS "Anyone view published excursoes" ON public.excursoes;
DROP POLICY IF EXISTS "Passengers view published excursoes" ON public.excursoes;
DROP POLICY IF EXISTS "Passengers view booked excursoes" ON public.excursoes;

CREATE POLICY "Passengers view published excursoes"
ON public.excursoes
FOR SELECT
USING (
  status = 'publicada'::text
  AND public.has_role(auth.uid(), 'passageiro'::public.app_role)
);

CREATE POLICY "Passengers view booked excursoes"
ON public.excursoes
FOR SELECT
USING (public.has_booking_for_excursao(id, auth.uid()));

-- Tighten invitation visibility: never expose the full invitations table publicly.
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.invitations;
DROP POLICY IF EXISTS "Organizer manages invitations" ON public.invitations;
DROP POLICY IF EXISTS "Organizer manages own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Invitation user can view used invite" ON public.invitations;

CREATE POLICY "Organizer manages own invitations"
ON public.invitations
FOR ALL
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.excursoes e
    WHERE e.id = invitations.excursao_id
      AND e.organizer_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.excursoes e
    WHERE e.id = invitations.excursao_id
      AND e.organizer_id = auth.uid()
  )
);

CREATE POLICY "Invitation user can view used invite"
ON public.invitations
FOR SELECT
USING (used_by = auth.uid());

-- Staff can read operational data only for excursions where they are actively linked.
DROP POLICY IF EXISTS "Staff view linked passageiros" ON public.passageiros;
DROP POLICY IF EXISTS "Staff view linked pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Staff view linked pontos" ON public.pontos_embarque;
DROP POLICY IF EXISTS "Staff view linked checkins" ON public.checkins;
DROP POLICY IF EXISTS "Staff insert linked checkins" ON public.checkins;

CREATE POLICY "Staff view linked passageiros"
ON public.passageiros
FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE POLICY "Staff view linked pagamentos"
ON public.pagamentos
FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE POLICY "Staff view linked pontos"
ON public.pontos_embarque
FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE POLICY "Staff view linked checkins"
ON public.checkins
FOR SELECT
USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE POLICY "Staff insert linked checkins"
ON public.checkins
FOR INSERT
WITH CHECK (public.is_active_staff(excursao_id, auth.uid()));

-- Indexes for user-scoped queries.
CREATE INDEX IF NOT EXISTS idx_excursoes_organizer_id ON public.excursoes (organizer_id);
CREATE INDEX IF NOT EXISTS idx_excursoes_status_data ON public.excursoes (status, data_evento);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON public.invitations (created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token);
CREATE INDEX IF NOT EXISTS idx_equipe_staff_status ON public.equipe_excursoes (staff_user_id, status);
CREATE INDEX IF NOT EXISTS idx_equipe_excursao_status ON public.equipe_excursoes (excursao_id, status);
CREATE INDEX IF NOT EXISTS idx_passageiros_user_id ON public.passageiros (user_id);
CREATE INDEX IF NOT EXISTS idx_passageiros_excursao_id ON public.passageiros (excursao_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_excursao_id ON public.pagamentos (excursao_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_passageiro_id ON public.pagamentos (passageiro_id);