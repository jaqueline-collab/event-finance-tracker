-- Scope elora_descontos by user_id (matching other Elora tables)
ALTER TABLE public.elora_descontos ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Backfill from clientes (descontos por cliente)
UPDATE public.elora_descontos d
   SET user_id = c.user_id
  FROM public.elora_clientes c
 WHERE d.cliente_id = c.id
   AND d.user_id IS NULL;

-- Para descontos globais sem cliente_id, herdar do primeiro admin existente
UPDATE public.elora_descontos
   SET user_id = (SELECT user_id FROM public.app_users WHERE is_admin = true AND user_id IS NOT NULL ORDER BY criado_em NULLS LAST LIMIT 1)
 WHERE user_id IS NULL;

-- Tornar obrigatório
ALTER TABLE public.elora_descontos ALTER COLUMN user_id SET NOT NULL;

-- Remover policies permissivas
DROP POLICY IF EXISTS "Authenticated can read descontos" ON public.elora_descontos;
DROP POLICY IF EXISTS "Authenticated can insert descontos" ON public.elora_descontos;
DROP POLICY IF EXISTS "Authenticated can update descontos" ON public.elora_descontos;
DROP POLICY IF EXISTS "Authenticated can delete descontos" ON public.elora_descontos;

-- Recriar escopadas por user_id (padrão elora_clientes)
CREATE POLICY own_select_elora_descontos ON public.elora_descontos
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY own_insert_elora_descontos ON public.elora_descontos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY own_update_elora_descontos ON public.elora_descontos
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own_delete_elora_descontos ON public.elora_descontos
  FOR DELETE USING (user_id = auth.uid());