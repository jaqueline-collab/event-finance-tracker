ALTER TABLE public.elora_parceiros
  ADD COLUMN IF NOT EXISTS acesso_painel_clientes boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.parceiro_pode_ver_painel(_cliente_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.elora_clientes c
    JOIN public.elora_parceiros p ON p.id = c.parceiro_id
    WHERE c.id = _cliente_id
      AND public.parceiro_do_usuario() IS NOT NULL
      AND c.parceiro_id = public.parceiro_do_usuario()
      AND p.acesso_painel_clientes = true
  )
$$;

DROP POLICY IF EXISTS clientes_select_parceiro_painel ON public.elora_clientes;
CREATE POLICY clientes_select_parceiro_painel
ON public.elora_clientes
FOR SELECT
TO authenticated
USING (public.parceiro_pode_ver_painel(id));

DROP POLICY IF EXISTS movimentos_select_parceiro_painel ON public.elora_movimentos;
CREATE POLICY movimentos_select_parceiro_painel
ON public.elora_movimentos
FOR SELECT
TO authenticated
USING (public.parceiro_pode_ver_painel(cliente_id));