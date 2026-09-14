-- Ponto único e obrigatório de leitura do painel do cliente.
-- A autorização acontece dentro do banco, antes de qualquer linha ser devolvida.
CREATE OR REPLACE FUNCTION public.painel_cliente_dados(_cliente_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _pode boolean := false;
  _cliente jsonb;
  _plano jsonb;
  _movimentos jsonb;
  _equipe jsonb;
  _releases jsonb;
  _plano_id text;
BEGIN
  IF _cliente_id IS NULL OR _cliente_id = '' THEN
    RAISE EXCEPTION 'acesso-negado: cliente não informado.';
  END IF;

  SELECT public.is_equipe_interna()
      OR public.cliente_do_usuario() = _cliente_id
      OR public.parceiro_pode_ver_painel(_cliente_id)
    INTO _pode;

  IF NOT COALESCE(_pode, false) THEN
    RAISE EXCEPTION 'acesso-negado: este acesso ao painel do cliente não está liberado.';
  END IF;

  SELECT to_jsonb(x), x.plano_id INTO _cliente, _plano_id
  FROM (
    SELECT c.id, c.nome, c.plano_id, c.data_inicio, c.data_vencimento, c.data_churn,
           c.status_comercial, c.apps, c.mau, c.canais_whats, c.canais_insta,
           c.canais_messenger, c.canais_zapi, c.usuarios_ativos, c.contatos_ativos,
           c.agentes_ia, c.asaas, c.zapi, c.transcricao_ia
    FROM public.elora_clientes c
    WHERE c.id = _cliente_id
  ) x;

  IF _cliente IS NULL THEN
    RAISE EXCEPTION 'cliente: conta não encontrada.';
  END IF;

  IF _plano_id IS NOT NULL THEN
    SELECT to_jsonb(p) INTO _plano
    FROM (
      SELECT pl.nome, pl.canais_whats_inclusos, pl.canais_insta_inclusos,
             pl.canais_messenger_inclusos, pl.usuarios_inclusos, pl.contatos_inclusos,
             pl.inclui_ia, pl.inclui_asaas, pl.inclui_zapi, pl.inclui_transcricao
      FROM public.elora_planos pl
      WHERE pl.id = _plano_id
    ) p;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.data DESC), '[]'::jsonb) INTO _movimentos
  FROM (
    SELECT mv.id, mv.data, mv.tipo, mv.plano_id, mv.canais_whats, mv.canais_insta,
           mv.canais_messenger, mv.canais_zapi, mv.usuarios_ativos, mv.contatos_ativos,
           mv.agentes_ia, mv.asaas, mv.zapi, mv.transcricao_ia, mv.observacao
    FROM public.elora_movimentos mv
    WHERE mv.cliente_id = _cliente_id
  ) m;

  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at ASC), '[]'::jsonb) INTO _equipe
  FROM (
    SELECT cu.id, cu.nome, cu.email, cu.ativo, cu.user_id, cu.created_at
    FROM public.elora_cliente_usuarios cu
    WHERE cu.cliente_id = _cliente_id
  ) e;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.publicado_em DESC NULLS LAST), '[]'::jsonb) INTO _releases
  FROM (
    SELECT rl.id, rl.titulo, rl.resumo, rl.conteudo, rl.tag, rl.publicado_em
    FROM public.elora_releases rl
    WHERE rl.publicado = true
      AND (
        rl.para_todos
        OR EXISTS (
          SELECT 1 FROM public.elora_release_destinos d
          WHERE d.release_id = rl.id AND d.cliente_id = _cliente_id
        )
      )
  ) r;

  RETURN jsonb_build_object(
    'cliente', _cliente,
    'plano', _plano,
    'movimentos', _movimentos,
    'equipe', _equipe,
    'releases', _releases
  );
END;
$$;

REVOKE ALL ON FUNCTION public.painel_cliente_dados(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.painel_cliente_dados(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.painel_cliente_dados(text) TO service_role;

-- Políticas redundantes: eram permissivas e somavam com as regras antigas de
-- parceiro, então não bloqueavam nada. A proteção real passa a ser a função acima.
DROP POLICY IF EXISTS clientes_select_parceiro_painel ON public.elora_clientes;
DROP POLICY IF EXISTS movimentos_select_parceiro_painel ON public.elora_movimentos;
