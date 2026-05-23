
-- Limpa referências órfãs antes de criar FKs
UPDATE public.passageiros p SET onibus_id = NULL
 WHERE onibus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.onibus o WHERE o.id = p.onibus_id);
UPDATE public.pontos_embarque pe SET onibus_id = NULL
 WHERE onibus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.onibus o WHERE o.id = pe.onibus_id);
UPDATE public.seats s SET onibus_id = NULL
 WHERE onibus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.onibus o WHERE o.id = s.onibus_id);
UPDATE public.pagamentos pg SET onibus_id = NULL
 WHERE onibus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.onibus o WHERE o.id = pg.onibus_id);
UPDATE public.checkins c SET onibus_id = NULL
 WHERE onibus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.onibus o WHERE o.id = c.onibus_id);
UPDATE public.equipe_excursoes ee SET onibus_id = NULL
 WHERE onibus_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.onibus o WHERE o.id = ee.onibus_id);

ALTER TABLE public.passageiros
  ADD CONSTRAINT passageiros_onibus_id_fkey FOREIGN KEY (onibus_id)
  REFERENCES public.onibus(id) ON DELETE SET NULL;

ALTER TABLE public.pontos_embarque
  ADD CONSTRAINT pontos_embarque_onibus_id_fkey FOREIGN KEY (onibus_id)
  REFERENCES public.onibus(id) ON DELETE SET NULL;

ALTER TABLE public.seats
  ADD CONSTRAINT seats_onibus_id_fkey FOREIGN KEY (onibus_id)
  REFERENCES public.onibus(id) ON DELETE SET NULL;

ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_onibus_id_fkey FOREIGN KEY (onibus_id)
  REFERENCES public.onibus(id) ON DELETE SET NULL;

ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_onibus_id_fkey FOREIGN KEY (onibus_id)
  REFERENCES public.onibus(id) ON DELETE SET NULL;

ALTER TABLE public.equipe_excursoes
  ADD CONSTRAINT equipe_excursoes_onibus_id_fkey FOREIGN KEY (onibus_id)
  REFERENCES public.onibus(id) ON DELETE SET NULL;
