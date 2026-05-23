CREATE OR REPLACE FUNCTION public.complete_signup_profile(
  p_full_name text DEFAULT '',
  p_phone text DEFAULT NULL,
  p_role public.app_role DEFAULT 'passageiro'
)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing_role public.app_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (v_uid, COALESCE(NULLIF(trim(p_full_name), ''), ''), NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), ''))
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone);

  SELECT role INTO v_existing_role
  FROM public.user_roles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_existing_role IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, COALESCE(p_role, 'passageiro'))
    ON CONFLICT DO NOTHING;
    RETURN COALESCE(p_role, 'passageiro');
  END IF;

  RETURN v_existing_role;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_signup_profile(text, text, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_signup_profile(text, text, public.app_role) TO authenticated;