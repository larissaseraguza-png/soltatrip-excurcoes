ALTER TABLE public.excursao_itens REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos_itens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.excursao_itens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos_itens;