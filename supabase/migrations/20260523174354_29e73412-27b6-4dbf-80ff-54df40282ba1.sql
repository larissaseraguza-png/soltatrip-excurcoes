CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  v_role := NULLIF(NEW.raw_user_meta_data->>'role', '');
  -- aceita alias 'organizador' como 'excursionista'
  IF v_role = 'organizador' THEN
    v_role := 'excursionista';
  END IF;

  IF v_role IN ('passageiro', 'excursionista', 'staff') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;