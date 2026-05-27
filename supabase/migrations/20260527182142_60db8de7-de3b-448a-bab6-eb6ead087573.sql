CREATE OR REPLACE FUNCTION public.add_self_passageiro_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'passageiro')
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.add_self_passageiro_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_self_passageiro_role() TO authenticated;