DO $$
DECLARE
  v_uid uuid;
  v_emails text[] := ARRAY['soltanois@outlook.com','larissa.seraguza@gmail.com'];
  v_email text;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    FOR v_uid IN SELECT id FROM auth.users WHERE lower(email) = lower(v_email) LOOP
      -- Limpa dados de aplicação ligados ao usuário
      DELETE FROM public.pagamentos WHERE passageiro_id IN (SELECT id FROM public.passageiros WHERE user_id = v_uid OR comprador_id = v_uid);
      DELETE FROM public.pedidos_itens WHERE comprador_id = v_uid OR passageiro_id IN (SELECT id FROM public.passageiros WHERE user_id = v_uid OR comprador_id = v_uid);
      UPDATE public.seats SET occupied = false, reserved_by = NULL, passageiro_id = NULL
        WHERE reserved_by = v_uid OR passageiro_id IN (SELECT id FROM public.passageiros WHERE user_id = v_uid OR comprador_id = v_uid);
      DELETE FROM public.passageiros WHERE user_id = v_uid OR comprador_id = v_uid;
      DELETE FROM public.reservas WHERE comprador_id = v_uid;
      DELETE FROM public.passageiro_excursionistas WHERE passageiro_user_id = v_uid OR excursionista_id = v_uid;
      DELETE FROM public.equipe_excursoes WHERE staff_user_id = v_uid;
      DELETE FROM public.invitations WHERE created_by = v_uid OR used_by = v_uid;
      DELETE FROM public.checkins WHERE feito_por = v_uid;
      DELETE FROM public.excursoes WHERE organizer_id = v_uid;
      DELETE FROM public.user_roles WHERE user_id = v_uid;
      DELETE FROM public.profiles WHERE id = v_uid;
      -- Remove o usuário do auth (cascata sessões/identities/tokens)
      DELETE FROM auth.users WHERE id = v_uid;
    END LOOP;
  END LOOP;
END $$;