
-- Bloqueia passageiro duplicado na mesma excursão

CREATE OR REPLACE FUNCTION public.criar_reserva_grupo(p_excursao_id uuid, p_passageiros jsonb, p_onibus_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_preco numeric; v_status text; v_qtd integer;
  v_reserva_id uuid; v_pax jsonb;
  v_user_id uuid; v_token text;
  v_email text; v_existing_uid uuid;
  v_is_titular boolean;
  v_seen_emails text[] := ARRAY[]::text[];
  v_seen_uids uuid[] := ARRAY[]::uuid[];
  v_dup_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT preco, status INTO v_preco, v_status FROM public.excursoes WHERE id = p_excursao_id;
  IF v_status <> 'publicada' THEN RAISE EXCEPTION 'excursao_nao_publicada'; END IF;
  v_qtd := jsonb_array_length(p_passageiros);
  IF v_qtd < 1 OR v_qtd > 20 THEN RAISE EXCEPTION 'quantidade_invalida'; END IF;

  IF p_onibus_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.onibus WHERE id = p_onibus_id AND excursao_id = p_excursao_id AND ativo = true
  ) THEN RAISE EXCEPTION 'invalid_onibus'; END IF;

  -- Pré-validação: nenhum passageiro pode já estar reservado nesta excursão
  FOR v_pax IN SELECT * FROM jsonb_array_elements(p_passageiros) LOOP
    v_is_titular := COALESCE((v_pax->>'titular')::boolean, false);
    v_email := NULLIF(lower(trim(COALESCE(v_pax->>'email',''))), '');

    v_existing_uid := NULL;
    IF v_is_titular THEN
      v_existing_uid := v_uid;
    ELSIF v_email IS NOT NULL THEN
      SELECT id INTO v_existing_uid FROM auth.users WHERE lower(email) = v_email LIMIT 1;
    END IF;

    -- duplicado dentro do próprio payload
    IF v_email IS NOT NULL AND v_email = ANY(v_seen_emails) THEN
      RAISE EXCEPTION 'passageiro_duplicado:%', v_email;
    END IF;
    IF v_existing_uid IS NOT NULL AND v_existing_uid = ANY(v_seen_uids) THEN
      RAISE EXCEPTION 'passageiro_duplicado:%', COALESCE(v_email, v_existing_uid::text);
    END IF;

    -- duplicado já existente na excursão
    SELECT count(*) INTO v_dup_count
      FROM public.passageiros p
     WHERE p.excursao_id = p_excursao_id
       AND COALESCE(p.status,'') <> 'cancelado'
       AND (
         (v_existing_uid IS NOT NULL AND (p.user_id = v_existing_uid OR p.comprador_id = v_existing_uid))
         OR (v_email IS NOT NULL AND lower(p.email) = v_email)
       );
    IF v_dup_count > 0 THEN
      RAISE EXCEPTION 'passageiro_duplicado:%', COALESCE(v_email, v_existing_uid::text);
    END IF;

    IF v_email IS NOT NULL THEN v_seen_emails := v_seen_emails || v_email; END IF;
    IF v_existing_uid IS NOT NULL THEN v_seen_uids := v_seen_uids || v_existing_uid; END IF;
  END LOOP;

  INSERT INTO public.reservas (excursao_id, comprador_id, quantidade, total_price, amount_paid, payment_status)
  VALUES (p_excursao_id, v_uid, v_qtd, v_preco * v_qtd, 0, 'pending_payment')
  RETURNING id INTO v_reserva_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'passageiro') ON CONFLICT DO NOTHING;

  FOR v_pax IN SELECT * FROM jsonb_array_elements(p_passageiros) LOOP
    v_user_id := NULL;
    v_token := NULL;
    v_is_titular := COALESCE((v_pax->>'titular')::boolean, false);
    v_email := NULLIF(lower(trim(COALESCE(v_pax->>'email',''))), '');

    IF v_is_titular THEN
      v_user_id := v_uid;
    ELSE
      v_existing_uid := NULL;
      IF v_email IS NOT NULL THEN
        SELECT id INTO v_existing_uid FROM auth.users WHERE lower(email) = v_email LIMIT 1;
      END IF;

      IF v_existing_uid IS NOT NULL AND v_existing_uid <> v_uid THEN
        v_user_id := v_existing_uid;
        INSERT INTO public.user_roles (user_id, role) VALUES (v_existing_uid, 'passageiro') ON CONFLICT DO NOTHING;
      ELSE
        v_token := encode(extensions.gen_random_bytes(18), 'hex');
      END IF;
    END IF;

    INSERT INTO public.passageiros (
      excursao_id, onibus_id, reserva_id, comprador_id, user_id, nome, email,
      status, total_price, amount_paid, payment_status, convite_token
    ) VALUES (
      p_excursao_id, p_onibus_id, v_reserva_id, v_uid, v_user_id,
      COALESCE(v_pax->>'nome',''), v_pax->>'email',
      'pendente', v_preco, 0, 'pending_payment', v_token
    );
  END LOOP;
  RETURN v_reserva_id;
END $function$;

-- Drop overload antigo (sem p_onibus_id) para evitar bypass da validação
DROP FUNCTION IF EXISTS public.criar_reserva_grupo(uuid, jsonb);

-- claim_passageiro_invite: bloquear se o user já tem outro passageiro na mesma excursão
CREATE OR REPLACE FUNCTION public.claim_passageiro_invite(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pax_id uuid;
  v_excursao_id uuid;
  v_dup integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT id, excursao_id INTO v_pax_id, v_excursao_id
    FROM public.passageiros
   WHERE convite_token = p_token AND user_id IS NULL
   LIMIT 1;

  IF v_pax_id IS NULL THEN RAISE EXCEPTION 'invalid_or_used_token'; END IF;

  SELECT count(*) INTO v_dup
    FROM public.passageiros
   WHERE excursao_id = v_excursao_id
     AND id <> v_pax_id
     AND COALESCE(status,'') <> 'cancelado'
     AND (user_id = v_uid OR comprador_id = v_uid);

  IF v_dup > 0 THEN RAISE EXCEPTION 'passageiro_duplicado'; END IF;

  UPDATE public.passageiros
     SET user_id = v_uid, convite_token = NULL, updated_at = now()
   WHERE id = v_pax_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'passageiro')
  ON CONFLICT DO NOTHING;

  RETURN v_pax_id;
END;
$function$;
