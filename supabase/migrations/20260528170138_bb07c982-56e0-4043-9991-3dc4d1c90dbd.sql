CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  excursao_id UUID,
  tipo TEXT NOT NULL DEFAULT 'info',
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacoes_user_created ON public.notificacoes (user_id, created_at DESC);
CREATE INDEX idx_notificacoes_user_lida ON public.notificacoes (user_id, lida) WHERE lida = false;

GRANT SELECT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprias notificações"
ON public.notificacoes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza próprias notificações"
ON public.notificacoes FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário apaga próprias notificações"
ON public.notificacoes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;