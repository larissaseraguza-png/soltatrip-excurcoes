
-- Sócio gerencia staff (mas não outros sócios)
CREATE POLICY "Coorg manage staff invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (is_coorganizador(excursao_id, auth.uid()) AND papel <> 'coorganizador')
WITH CHECK (is_coorganizador(excursao_id, auth.uid()) AND papel <> 'coorganizador');

CREATE POLICY "Coorg manage staff members"
ON public.equipe_excursoes
FOR ALL
TO authenticated
USING (is_coorganizador(excursao_id, auth.uid()) AND papel <> 'coorganizador')
WITH CHECK (is_coorganizador(excursao_id, auth.uid()) AND papel <> 'coorganizador');
