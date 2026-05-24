-- Tabela de vínculo passageiro <-> excursionista
CREATE TABLE IF NOT EXISTS public.passageiro_excursionistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passageiro_user_id uuid NOT NULL,
  excursionista_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (passageiro_user_id, excursionista_id)
);

CREATE INDEX IF NOT EXISTS idx_pax_exc_pax ON public.passageiro_excursionistas(passageiro_user_id);
CREATE INDEX IF NOT EXISTS idx_pax_exc_org ON public.passageiro_excursionistas(excursionista_id);

ALTER TABLE public.passageiro_excursionistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Passageiro view own links"
  ON public.passageiro_excursionistas FOR SELECT
  USING (passageiro_user_id = auth.uid());

CREATE POLICY "Passageiro insert own links"
  ON public.passageiro_excursionistas FOR INSERT
  WITH CHECK (passageiro_user_id = auth.uid());

CREATE POLICY "Passageiro delete own links"
  ON public.passageiro_excursionistas FOR DELETE
  USING (passageiro_user_id = auth.uid());

CREATE POLICY "Excursionista view their pax links"
  ON public.passageiro_excursionistas FOR SELECT
  USING (excursionista_id = auth.uid());

-- Helper
CREATE OR REPLACE FUNCTION public.is_linked_to_excursionista(_pax uuid, _org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.passageiro_excursionistas
    WHERE passageiro_user_id = _pax AND excursionista_id = _org
  )
$$;

-- Restringe a visão de excursões publicadas ao vínculo
DROP POLICY IF EXISTS "Passengers view published excursoes" ON public.excursoes;

CREATE POLICY "Passengers view linked published excursoes"
  ON public.excursoes FOR SELECT
  USING (
    status = 'publicada'
    AND has_role(auth.uid(), 'passageiro'::app_role)
    AND public.is_linked_to_excursionista(auth.uid(), organizer_id)
  );

-- Função pública para a "vitrine": mostra dados básicos do excursionista para qualquer um com o link
CREATE OR REPLACE FUNCTION public.get_excursionista_vitrine(p_org_id uuid)
RETURNS TABLE(
  organizer_id uuid,
  full_name text,
  company_name text,
  avatar_url text,
  bio text,
  city text,
  instagram_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.company_name, p.avatar_url, p.bio, p.city, p.instagram_url
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'excursionista'
  WHERE p.id = p_org_id
  LIMIT 1
$$;

-- Função pública para listar excursões publicadas de um excursionista (vitrine, sem auth)
CREATE OR REPLACE FUNCTION public.get_excursionista_excursoes_publicas(p_org_id uuid)
RETURNS TABLE(
  id uuid,
  titulo text,
  destino text,
  descricao text,
  data_evento date,
  preco numeric,
  banner_url text,
  cor text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.titulo, e.destino, e.descricao, e.data_evento, e.preco, e.banner_url, e.cor
  FROM public.excursoes e
  WHERE e.organizer_id = p_org_id
    AND e.status = 'publicada'
  ORDER BY e.data_evento ASC
$$;