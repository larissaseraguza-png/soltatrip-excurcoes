ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.role = b.role;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

-- Concede papel de passageiro à Amanda para destravar conta de teste
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'passageiro'::app_role FROM auth.users WHERE email = 'amanda@teste.com'
ON CONFLICT (user_id, role) DO NOTHING;