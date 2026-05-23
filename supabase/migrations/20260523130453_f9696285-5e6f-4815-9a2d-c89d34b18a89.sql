
-- Limpa órfãos
DELETE FROM public.pagamentos WHERE reserva_id IS NOT NULL AND reserva_id NOT IN (SELECT id FROM public.reservas);
DELETE FROM public.passageiros WHERE reserva_id IS NOT NULL AND reserva_id NOT IN (SELECT id FROM public.reservas);
DELETE FROM public.reservas WHERE excursao_id NOT IN (SELECT id FROM public.excursoes);
DELETE FROM public.reservas WHERE comprador_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.reservas
  ADD CONSTRAINT reservas_excursao_id_fkey FOREIGN KEY (excursao_id) REFERENCES public.excursoes(id) ON DELETE CASCADE,
  ADD CONSTRAINT reservas_comprador_id_fkey FOREIGN KEY (comprador_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.passageiros
  ADD CONSTRAINT passageiros_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES public.reservas(id) ON DELETE CASCADE;

ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES public.reservas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reservas_excursao ON public.reservas(excursao_id);
CREATE INDEX IF NOT EXISTS idx_reservas_comprador ON public.reservas(comprador_id);
CREATE INDEX IF NOT EXISTS idx_passageiros_reserva ON public.passageiros(reserva_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_reserva ON public.pagamentos(reserva_id);

NOTIFY pgrst, 'reload schema';
