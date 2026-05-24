ALTER TABLE public.pedidos_itens
  ADD COLUMN IF NOT EXISTS recebido_em timestamptz,
  ADD COLUMN IF NOT EXISTS nao_recebido_em timestamptz;

DROP POLICY IF EXISTS "Comprador confirma recebimento" ON public.pedidos_itens;
CREATE POLICY "Comprador confirma recebimento"
ON public.pedidos_itens
FOR UPDATE
USING (comprador_id = auth.uid())
WITH CHECK (comprador_id = auth.uid());
