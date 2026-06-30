
DROP POLICY IF EXISTS own_select_elora_descontos ON public.elora_descontos;
DROP POLICY IF EXISTS own_insert_elora_descontos ON public.elora_descontos;
DROP POLICY IF EXISTS own_update_elora_descontos ON public.elora_descontos;
DROP POLICY IF EXISTS own_delete_elora_descontos ON public.elora_descontos;

CREATE POLICY own_select_elora_descontos ON public.elora_descontos
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_insert_elora_descontos ON public.elora_descontos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY own_update_elora_descontos ON public.elora_descontos
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own_delete_elora_descontos ON public.elora_descontos
  FOR DELETE TO authenticated USING (user_id = auth.uid());
