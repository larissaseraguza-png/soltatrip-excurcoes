
-- 1) Wipe data
TRUNCATE TABLE
  public.checkins,
  public.pagamentos,
  public.mensagens,
  public.passageiros,
  public.reservas,
  public.seats,
  public.pontos_embarque,
  public.onibus,
  public.equipe_excursoes,
  public.invitations,
  public.excursoes,
  public.user_roles,
  public.profiles
RESTART IDENTITY CASCADE;

-- 2) Wipe auth users
DELETE FROM auth.users;

-- 3) Update handle_new_user to also create user_roles from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  IF v_role IN ('passageiro', 'organizador', 'staff') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
