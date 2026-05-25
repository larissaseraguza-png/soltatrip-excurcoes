-- Add slug to profiles for public shareable links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique
  ON public.profiles (lower(slug)) WHERE slug IS NOT NULL;

-- Validation trigger for slug format
CREATE OR REPLACE FUNCTION public.validate_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NOT NULL THEN
    NEW.slug := lower(trim(NEW.slug));
    IF length(NEW.slug) < 3 OR length(NEW.slug) > 40 THEN
      RAISE EXCEPTION 'slug_invalid_length';
    END IF;
    IF NEW.slug !~ '^[a-z0-9][a-z0-9_-]*[a-z0-9]$' THEN
      RAISE EXCEPTION 'slug_invalid_format';
    END IF;
    -- reserve some words
    IF NEW.slug IN ('app','auth','staff','passageiro','excursionista','invite','admin','api','e','selecionar-perfil','login','signup') THEN
      RAISE EXCEPTION 'slug_reserved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_slug_trg ON public.profiles;
CREATE TRIGGER validate_profile_slug_trg
  BEFORE INSERT OR UPDATE OF slug ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_slug();

-- Vitrine by slug
CREATE OR REPLACE FUNCTION public.get_excursionista_vitrine_by_slug(p_slug text)
RETURNS TABLE(
  organizer_id uuid,
  full_name text,
  company_name text,
  avatar_url text,
  bio text,
  city text,
  instagram_url text,
  slug text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.company_name, p.avatar_url, p.bio, p.city, p.instagram_url, p.slug
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'excursionista'
  WHERE lower(p.slug) = lower(p_slug)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_excursionista_excursoes_publicas_by_slug(p_slug text)
RETURNS TABLE(
  id uuid, titulo text, destino text, descricao text, data_evento date,
  preco numeric, banner_url text, cor text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.titulo, e.destino, e.descricao, e.data_evento, e.preco, e.banner_url, e.cor
  FROM public.excursoes e
  JOIN public.profiles p ON p.id = e.organizer_id
  WHERE lower(p.slug) = lower(p_slug)
    AND e.status = 'publicada'
  ORDER BY e.data_evento ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_excursionista_vitrine_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_excursionista_excursoes_publicas_by_slug(text) TO anon, authenticated;