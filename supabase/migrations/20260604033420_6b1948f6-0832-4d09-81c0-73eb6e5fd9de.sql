DROP FUNCTION IF EXISTS public.comprar_item(uuid, integer, uuid);

CREATE OR REPLACE FUNCTION public.comprar_item(
  p_item_id uuid,
  p_qtd integer,
  p_excursao_id uuid,
  p_reserva_id uuid DEFAULT NULL
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

  -- Quando uma reserva é informada, vincula ao passageiro titular DAQUELA reserva
  -- (escopo correto do combo recém-criado). Caso contrário, fallback compatível.
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

  RETURN v_pedido_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.comprar_item(uuid, integer, uuid, uuid) TO authenticated;