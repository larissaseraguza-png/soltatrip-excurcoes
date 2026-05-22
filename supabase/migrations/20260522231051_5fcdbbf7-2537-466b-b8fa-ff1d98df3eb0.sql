
-- Add user_id to passageiros for self-booking
ALTER TABLE public.passageiros ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create equipe_excursoes table
CREATE TABLE IF NOT EXISTS public.equipe_excursoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursao_id uuid NOT NULL REFERENCES public.excursoes(id) ON DELETE CASCADE,
  staff_user_id uuid,
  convite_email text,
  papel text NOT NULL DEFAULT 'staff',
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipe_user_or_email CHECK (staff_user_id IS NOT NULL OR convite_email IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS equipe_excursao_user_uniq ON public.equipe_excursoes(excursao_id, staff_user_id) WHERE staff_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS equipe_excursao_email_uniq ON public.equipe_excursoes(excursao_id, lower(convite_email)) WHERE convite_email IS NOT NULL;

ALTER TABLE public.equipe_excursoes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER equipe_excursoes_touch BEFORE UPDATE ON public.equipe_excursoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Organizer: full CRUD on their trip team
CREATE POLICY "Organizers manage equipe" ON public.equipe_excursoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = equipe_excursoes.excursao_id AND e.organizer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = equipe_excursoes.excursao_id AND e.organizer_id = auth.uid())
  );

-- Staff: see their own links (by user_id or matching email)
CREATE POLICY "Staff view own links" ON public.equipe_excursoes
  FOR SELECT USING (
    staff_user_id = auth.uid()
    OR (convite_email IS NOT NULL AND lower(convite_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

CREATE POLICY "Staff update own links" ON public.equipe_excursoes
  FOR UPDATE USING (
    staff_user_id = auth.uid()
    OR (convite_email IS NOT NULL AND lower(convite_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

-- Passageiros: public can view published trips
CREATE POLICY "Anyone view published excursoes" ON public.excursoes
  FOR SELECT USING (status = 'publicada');

-- Staff vinculado pode ver excursao
CREATE POLICY "Staff view linked excursoes" ON public.excursoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.equipe_excursoes ee
      WHERE ee.excursao_id = excursoes.id
        AND ee.staff_user_id = auth.uid()
        AND ee.status = 'ativo')
  );

-- Passageiros self-service
CREATE POLICY "Passageiro creates own booking" ON public.passageiros
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.excursoes e WHERE e.id = excursao_id AND e.status = 'publicada')
  );

CREATE POLICY "Passageiro view own bookings" ON public.passageiros
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Passageiro cancel own booking" ON public.passageiros
  FOR DELETE USING (user_id = auth.uid());

-- Auto-link pending staff invites when a user signs up
CREATE OR REPLACE FUNCTION public.link_pending_staff_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.equipe_excursoes
     SET staff_user_id = NEW.id,
         status = 'ativo',
         convite_email = NULL,
         updated_at = now()
   WHERE staff_user_id IS NULL
     AND convite_email IS NOT NULL
     AND lower(convite_email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_link_invites ON auth.users;
CREATE TRIGGER on_auth_user_link_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_pending_staff_invites();
