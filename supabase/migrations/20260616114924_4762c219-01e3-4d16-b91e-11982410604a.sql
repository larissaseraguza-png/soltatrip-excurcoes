CREATE OR REPLACE FUNCTION public.notify_item_ordered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pax_nome text;
  v_buyer_name text;
  v_item_nome text;
  v_item_tipo text;
  v_label text;
  v_titulo text;
  v_msg text;
BEGIN
  SELECT nome, tipo INTO v_item_nome, v_item_tipo
    FROM public.excursao_itens WHERE id = NEW.item_id;

  IF NEW.passageiro_id IS NOT NULL THEN
    SELECT nome INTO v_pax_nome FROM public.passageiros WHERE id = NEW.passageiro_id;
  END IF;
  IF v_pax_nome IS NULL OR v_pax_nome = '' THEN
    SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = NEW.comprador_id;
    v_pax_nome := COALESCE(NULLIF(v_buyer_name, ''), 'Comprador');
  END IF;

  v_label := CASE COALESCE(v_item_tipo, '')
    WHEN 'combo' THEN 'combo'
    WHEN 'ingresso' THEN 'ingresso'
    WHEN 'camping' THEN 'camping'
    WHEN 'solidario' THEN 'item solidário'
    ELSE 'item'
  END;

  v_titulo := v_pax_nome || ' solicitou ' || v_label;
  v_msg := COALESCE(v_item_nome, 'Item')
        || CASE WHEN NEW.quantidade > 1 THEN ' (x' || NEW.quantidade || ')' ELSE '' END;

  PERFORM public.emit_business_event(
    'item.ordered'::notification_type,
    NEW.excursao_id,
    NULL,
    NEW.passageiro_id,
    NULL,
    v_titulo,
    v_msg,
    NULL,
    jsonb_build_object(
      'pedido_id', NEW.id,
      'item_id', NEW.item_id,
      'tipo', v_item_tipo,
      'comprador_id', NEW.comprador_id,
      'quantidade', NEW.quantidade
    ),
    ARRAY['organizer_root','organizer_socios']::text[],
    ARRAY[]::uuid[],
    'item.ordered:' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_itens_notify_ordered ON public.pedidos_itens;
CREATE TRIGGER trg_pedidos_itens_notify_ordered
AFTER INSERT ON public.pedidos_itens
FOR EACH ROW EXECUTE FUNCTION public.notify_item_ordered();

REVOKE EXECUTE ON FUNCTION public.notify_item_ordered() FROM PUBLIC, anon, authenticated;