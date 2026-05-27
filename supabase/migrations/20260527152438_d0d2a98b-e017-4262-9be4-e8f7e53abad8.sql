
-- 1) Função que liga passageiros convidados ao usuário recém-criado
CREATE OR REPLACE FUNCTION public.link_pending_passageiro_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked integer := 0;
BEGIN
  UPDATE public.passageiros
     SET user_id = NEW.id,
         convite_token = NULL,
         updated_at = now()
   WHERE user_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(NEW.email);

  GET DIAGNOSTICS v_linked = ROW_COUNT;

  IF v_linked > 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'passageiro')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Gatilho em auth.users (após criação da conta)
DROP TRIGGER IF EXISTS on_auth_user_created_link_passageiro ON auth.users;
CREATE TRIGGER on_auth_user_created_link_passageiro
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_pending_passageiro_invites();

-- 3) Backfill: liga passageiros já pendentes a contas existentes pelo email
UPDATE public.passageiros p
   SET user_id = u.id,
       convite_token = NULL,
       updated_at = now()
  FROM auth.users u
 WHERE p.user_id IS NULL
   AND p.email IS NOT NULL
   AND lower(p.email) = lower(u.email);

-- 4) Garante papel 'passageiro' para esses usuários
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.user_id, 'passageiro'::public.app_role
  FROM public.passageiros p
 WHERE p.user_id IS NOT NULL
ON CONFLICT DO NOTHING;
