
-- Scope elora_fechamentos policies by creator (criado_por)
ALTER TABLE public.elora_fechamentos ALTER COLUMN criado_por SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "auth read fechamentos" ON public.elora_fechamentos;
DROP POLICY IF EXISTS "auth insert fechamentos" ON public.elora_fechamentos;
DROP POLICY IF EXISTS "auth update fechamentos" ON public.elora_fechamentos;

CREATE POLICY "own read fechamentos" ON public.elora_fechamentos
  FOR SELECT USING (criado_por = auth.uid() OR public.is_admin());
CREATE POLICY "own insert fechamentos" ON public.elora_fechamentos
  FOR INSERT WITH CHECK (criado_por = auth.uid());
CREATE POLICY "own update fechamentos" ON public.elora_fechamentos
  FOR UPDATE USING (criado_por = auth.uid() OR public.is_admin())
  WITH CHECK (criado_por = auth.uid() OR public.is_admin());

-- Scope elora_fechamento_itens via parent fechamento ownership
DROP POLICY IF EXISTS "auth read fech itens" ON public.elora_fechamento_itens;
DROP POLICY IF EXISTS "auth insert fech itens" ON public.elora_fechamento_itens;
DROP POLICY IF EXISTS "auth update fech itens" ON public.elora_fechamento_itens;

CREATE POLICY "own read fech itens" ON public.elora_fechamento_itens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.elora_fechamentos f
            WHERE f.id = elora_fechamento_itens.fechamento_id
              AND (f.criado_por = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "own insert fech itens" ON public.elora_fechamento_itens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.elora_fechamentos f
            WHERE f.id = fechamento_id
              AND (f.criado_por = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "own update fech itens" ON public.elora_fechamento_itens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.elora_fechamentos f
            WHERE f.id = elora_fechamento_itens.fechamento_id
              AND (f.criado_por = auth.uid() OR public.is_admin()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.elora_fechamentos f
            WHERE f.id = fechamento_id
              AND (f.criado_por = auth.uid() OR public.is_admin()))
  );
