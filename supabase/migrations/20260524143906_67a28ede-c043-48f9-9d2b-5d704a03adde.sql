
-- 1) RPC atômica de compra de itens (previne race condition / oversell)
CREATE OR REPLACE FUNCTION public.comprar_item(
  p_item_id uuid,
  p_qtd integer,
  p_excursao_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.excursao_itens%ROWTYPE;
  v_pax public.passageiros%ROWTYPE;
  v_pedido_id uuid;
  v_valor_unit numeric;
  v_valor_total numeric;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_qtd IS NULL OR p_qtd < 1 OR p_qtd > 10 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  SELECT * INTO v_item
  FROM public.excursao_itens
  WHERE id = p_item_id AND excursao_id = p_excursao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF v_item.ativo = false OR v_item.status = 'oculto' OR v_item.status = 'esgotado' THEN
    RAISE EXCEPTION 'item_unavailable';
  END IF;

  -- Decremento atômico com checagem de estoque
  UPDATE public.excursao_itens
     SET quantidade_vendida = quantidade_vendida + p_qtd,
         updated_at = now()
   WHERE id = p_item_id
     AND (quantidade_total IS NULL OR quantidade_vendida + p_qtd <= quantidade_total);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'sold_out';
  END IF;

  -- Localiza passageiro do comprador (opcional)
  SELECT * INTO v_pax
  FROM public.passageiros
  WHERE excursao_id = p_excursao_id AND comprador_id = v_uid
  ORDER BY created_at ASC
  LIMIT 1;

  v_valor_unit := v_item.valor;
  v_valor_total := v_valor_unit * p_qtd;

  INSERT INTO public.pedidos_itens (
    excursao_id, item_id, passageiro_id, comprador_id,
    quantidade, valor_unitario, valor_total, status
  ) VALUES (
    p_excursao_id, p_item_id, v_pax.id, v_uid,
    p_qtd, v_valor_unit, v_valor_total, 'pendente'
  )
  RETURNING id INTO v_pedido_id;

  RETURN v_pedido_id;
END;
$$;

-- Permissões: apenas usuários autenticados executam a compra
REVOKE ALL ON FUNCTION public.comprar_item(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comprar_item(uuid, integer, uuid) TO authenticated;

-- 2) REVOGAR EXECUTE em funções internas (triggers/helpers) que não devem ser chamadas via API
DO $$
DECLARE
  fn text;
  fn_list text[] := ARRAY[
    'public.touch_updated_at()',
    'public.handle_new_user()',
    'public.link_pending_staff_invites()',
    'public.lock_seat_changes()',
    'public.lock_passageiro_choices()',
    'public.release_seat_on_cancel()',
    'public.sync_passageiro_on_pagamento()',
    'public.apply_pagamento_to_reserva()',
    'public.apply_pagamento_to_reserva_v2()',
    'public.set_pagamento_onibus()',
    'public.ensure_seats_for_onibus()',
    'public.recalc_passageiro_payments(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fn_list LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- ignora se assinatura não existir
      NULL;
    END;
  END LOOP;
END $$;

-- 3) Documentar política de acesso direto (sem link)
COMMENT ON POLICY "Passengers view booked excursoes" ON public.excursoes IS
  'Acesso direto: passageiro que já reservou continua vendo a excursão mesmo sem o link do excursionista. Regra explícita do produto.';
