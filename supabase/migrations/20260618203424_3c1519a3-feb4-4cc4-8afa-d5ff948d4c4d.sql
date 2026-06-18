-- 1) Coluna de ligação pagamento → pedido_item
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS pedido_item_id uuid
  REFERENCES public.pedidos_itens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido_item_id
  ON public.pagamentos(pedido_item_id);

-- 2) comprar_item agora também cria um pagamento pendente vinculado ao pedido.
--    Os triggers existentes (_internal_notify_pagamento_submitted e
--    _internal_notify_pagamento_status_changed) cuidam das notificações de
--    pagamento enviado/aprovado/recusado tanto para o excursionista quanto
--    para o comprador, sem precisar de lógica nova.
CREATE OR REPLACE FUNCTION public.comprar_item(
  p_item_id uuid,
  p_qtd integer,
  p_excursao_id uuid,
  p_reserva_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  UPDATE public.excursao_itens
     SET quantidade_vendida = quantidade_vendida + p_qtd,
         updated_at = now()
   WHERE id = p_item_id
     AND (quantidade_total IS NULL OR quantidade_vendida + p_qtd <= quantidade_total);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'sold_out';
  END IF;

  IF p_reserva_id IS NOT NULL THEN
    SELECT * INTO v_pax
    FROM public.passageiros
    WHERE reserva_id = p_reserva_id
      AND comprador_id = v_uid
      AND status <> 'cancelado'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_pax.id IS NULL THEN
    SELECT * INTO v_pax
    FROM public.passageiros
    WHERE excursao_id = p_excursao_id
      AND comprador_id = v_uid
      AND status <> 'cancelado'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

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

  -- Cria pagamento pendente referente a este pedido de item.
  -- O excursionista vai aprovar/recusar no painel financeiro.
  IF v_valor_total > 0 THEN
    INSERT INTO public.pagamentos (
      excursao_id, passageiro_id, reserva_id, pedido_item_id,
      valor, metodo, status, observacao
    ) VALUES (
      p_excursao_id, v_pax.id, NULL, v_pedido_id,
      v_valor_total, 'pix', 'pendente',
      'Pagamento referente ao pedido de item (' || v_item.tipo || '): ' || v_item.nome
        || CASE WHEN p_qtd > 1 THEN ' x' || p_qtd ELSE '' END
    );
  END IF;

  RETURN v_pedido_id;
END;
$function$;