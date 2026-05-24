-- Tabela de itens vendidos pelo promoter dentro da excursão
CREATE TABLE public.excursao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'ingresso',
  nome text NOT NULL,
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  quantidade_total integer,
  quantidade_vendida integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'disponivel',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_excursao_itens_excursao ON public.excursao_itens(excursao_id);

ALTER TABLE public.excursao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage itens"
  ON public.excursao_itens FOR ALL
  USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = excursao_itens.excursao_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = excursao_itens.excursao_id AND e.organizer_id = auth.uid()));

CREATE POLICY "View itens of published or booked"
  ON public.excursao_itens FOR SELECT
  USING (
    ativo = true AND status <> 'oculto' AND EXISTS (
      SELECT 1 FROM public.excursoes e
      WHERE e.id = excursao_itens.excursao_id
        AND (e.status = 'publicada' OR public.has_booking_for_excursao(e.id, auth.uid()))
    )
  );

CREATE POLICY "Staff view itens"
  ON public.excursao_itens FOR SELECT
  USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE TRIGGER trg_excursao_itens_updated
  BEFORE UPDATE ON public.excursao_itens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Tabela de pedidos dos passageiros
CREATE TABLE public.pedidos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.excursao_itens(id) ON DELETE CASCADE,
  passageiro_id uuid,
  comprador_id uuid NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  emitido_em timestamptz,
  enviado_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_itens_excursao ON public.pedidos_itens(excursao_id);
CREATE INDEX idx_pedidos_itens_comprador ON public.pedidos_itens(comprador_id);
CREATE INDEX idx_pedidos_itens_item ON public.pedidos_itens(item_id);

ALTER TABLE public.pedidos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage pedidos"
  ON public.pedidos_itens FOR ALL
  USING (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = pedidos_itens.excursao_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = pedidos_itens.excursao_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Comprador insert own pedido"
  ON public.pedidos_itens FOR INSERT
  WITH CHECK (comprador_id = auth.uid());

CREATE POLICY "Comprador view own pedidos"
  ON public.pedidos_itens FOR SELECT
  USING (comprador_id = auth.uid());

CREATE POLICY "Comprador delete pending pedido"
  ON public.pedidos_itens FOR DELETE
  USING (comprador_id = auth.uid() AND status = 'pendente');

CREATE POLICY "Staff view pedidos"
  ON public.pedidos_itens FOR SELECT
  USING (public.is_active_staff(excursao_id, auth.uid()));

CREATE TRIGGER trg_pedidos_itens_updated
  BEFORE UPDATE ON public.pedidos_itens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();