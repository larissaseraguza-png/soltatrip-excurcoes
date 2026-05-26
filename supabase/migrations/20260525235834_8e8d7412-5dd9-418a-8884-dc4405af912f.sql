-- 1) Encurta validade default para 12h
ALTER TABLE public.invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '12 hours');

-- 2) get_staff_invitation passa a expor used_by para o app
DROP FUNCTION IF EXISTS public.get_staff_invitation(text);
CREATE OR REPLACE FUNCTION public.get_staff_invitation(p_token text)
RETURNS TABLE(
  id uuid,
  papel text,
  expires_at timestamp with time zone,
  used boolean,
  used_by uuid,
  excursao_id uuid,
  excursao_titulo text,
  excursao_destino text,
  excursao_data_evento date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    i.id,
    i.papel,
    i.expires_at,
    i.used,
    i.used_by,
    e.id AS excursao_id,
    e.titulo AS excursao_titulo,
    e.destino AS excursao_destino,
    e.data_evento AS excursao_data_evento
  FROM public.invitations i
  JOIN public.excursoes e ON e.id = i.excursao_id
  WHERE i.token = p_token
  LIMIT 1
$function$;

-- 3) get_passageiro_invite passa a expor user_id (titular já vinculado)
DROP FUNCTION IF EXISTS public.get_passageiro_invite(text);
CREATE OR REPLACE FUNCTION public.get_passageiro_invite(p_token text)
RETURNS TABLE(
  reserva_id uuid,
  passageiro_id uuid,
  user_id uuid,
  nome text,
  excursao_id uuid,
  excursao_titulo text,
  excursao_destino text,
  excursao_data date,
  ja_usado boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.reserva_id,
    p.id        AS passageiro_id,
    p.user_id,
    p.nome,
    e.id        AS excursao_id,
    e.titulo    AS excursao_titulo,
    e.destino   AS excursao_destino,
    e.data_evento AS excursao_data,
    (p.user_id IS NOT NULL) AS ja_usado
  FROM public.passageiros p
  JOIN public.excursoes e ON e.id = p.excursao_id
  WHERE p.convite_token = p_token
  LIMIT 1
$function$;