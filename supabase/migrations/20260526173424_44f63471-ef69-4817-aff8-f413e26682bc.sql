CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_email text;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 10 THEN
    RETURN NULL;
  END IF;

  SELECT u.email INTO v_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') = v_digits
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_email_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;