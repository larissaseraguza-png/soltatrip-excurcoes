
-- Atualiza senha do socio existente
UPDATE auth.users
SET encrypted_password = crypt('Soltanois1', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'socio@teste.com';

-- Cria mateus@teste.com e staff@teste.com se não existirem
DO $$
DECLARE
  v_email text;
  v_uid uuid;
BEGIN
  FOREACH v_email IN ARRAY ARRAY['mateus@teste.com','staff@teste.com']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      v_uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
        v_email, crypt('Soltanois1', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
        'email', v_email, now(), now(), now()
      );
    END IF;
  END LOOP;
END $$;
