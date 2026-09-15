import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapDbToCliente, mapDbToMovimento, mapDbToPlano } from "@/lib/mappers";
import { explicarReceitaCliente, receitaMensalCliente } from "@/lib/calc/receita";
import {
  concederAcessoSchema,
  envioFechamentoSchema,
  painelParceiroSchema,
  toggleAcessoSchema,
} from "@/lib/parceiro.schemas";

/**
 * Papel do usuário logado: equipe interna (admin/operacional) ou pessoa de parceiro.
 * Também casa o e-mail do login com a lista de acessos concedidos (primeiro login).
 */
export const getPapelUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    await Promise.all([db.rpc("link_parceiro_usuario"), db.rpc("link_cliente_usuario")]);
    const [{ data: interno }, { data: parceiroId }, { data: veValores }, { data: clienteId }] =
      await Promise.all([
        db.rpc("is_equipe_interna"),
        db.rpc("parceiro_do_usuario"),
        db.rpc("parceiro_ve_valores"),
        db.rpc("cliente_do_usuario"),
      ]);
    return {
      isInterno: Boolean(interno),
      parceiroId: (parceiroId as string | null) ?? null,
      clienteId: (clienteId as string | null) ?? null,
      veValores: Boolean(veValores),
    };
  });

/**
 * Dados da área do parceiro. Os valores cobrados só entram no payload quando o
 * toggle mostrar_valores_cliente está ligado — não existe filtragem no front.
 * Custo WTS, margem e lucro nunca são calculados neste caminho.
 */
export const getPainelParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => painelParceiroSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const verComo = (data as { verComoParceiroId?: string } | undefined)?.verComoParceiroId;
    let parceiroId: string | null = null;
    let veValores = false;
    let podeVerPainelCliente = false;

    if (verComo) {
      // Modo "visualizar como parceiro": exclusivo da equipe interna, somente leitura.
      const { data: interno } = await db.rpc("is_equipe_interna");
      if (!interno) throw new Error("acesso-negado: modo de visualização é exclusivo da equipe interna.");
      const { data: alvo, error: alvoErr } = await db
        .from("elora_parceiros")
        .select("id, mostrar_valores_cliente, acesso_painel_clientes")
        .eq("id", verComo)
        .maybeSingle();
      if (alvoErr) throw new Error(`parceiro: ${alvoErr.message}`);
      if (!alvo?.id) throw new Error("visualizar-como: parceiro não encontrado.");
      parceiroId = alvo.id as string;
      veValores = Boolean(alvo.mostrar_valores_cliente);
      podeVerPainelCliente = Boolean(alvo.acesso_painel_clientes);
    } else {
      await db.rpc("link_parceiro_usuario");
      const { data: proprio } = await db.rpc("parceiro_do_usuario");
      if (!proprio) throw new Error("acesso-parceiro: este login não está vinculado a nenhum parceiro.");
      parceiroId = proprio as string;
      const { data: veValoresRaw } = await db.rpc("parceiro_ve_valores");
      veValores = Boolean(veValoresRaw);
      // Sempre lido do banco no carregamento — nunca de cache local.
      const { data: proprioRow } = await db
        .from("elora_parceiros")
        .select("acesso_painel_clientes")
        .eq("id", parceiroId)
        .maybeSingle();
      podeVerPainelCliente = Boolean(proprioRow?.acesso_painel_clientes);
    }


    const [parceiroRes, clientesRes, planosRes] = await Promise.all([
      db
        .from("elora_parceiros")
        .select("id, nome, email, celular, site_url, pode_ver_fechamentos")
        .eq("id", parceiroId)
        .maybeSingle(),
      db
        .from("elora_clientes")
        .select(
          "id, nome, plano_id, parceiro_id, data_inicio, data_vencimento, data_churn, status_comercial, apps, mau, canais, canais_zapi, canais_whats, canais_insta, canais_messenger, usuarios_ativos, contatos_ativos, agentes_ia, asaas, zapi, transcricao_ia, extras, valor_acompanhamento, valor_setup_pago, ciclo_personalizado, ciclo_dia_inicial, ciclo_dia_final",
        )
        .eq("parceiro_id", parceiroId),
      db.from("elora_planos_parceiro").select("id, nome"),
    ]);
    if (parceiroRes.error) throw new Error(`parceiro: ${parceiroRes.error.message}`);
    if (clientesRes.error) throw new Error(`clientes: ${clientesRes.error.message}`);

    const clientesDb = (clientesRes.data ?? []) as any[];
    const ids = clientesDb.map((c) => c.id as string);
    const movimentosRes = ids.length
      ? await db
          .from("elora_movimentos")
          .select("id, cliente_id, data, tipo, plano_id, canais, canais_whats, canais_insta, canais_messenger, canais_zapi, usuarios_ativos, contatos_ativos, agentes_ia, asaas, zapi, transcricao_ia, apps, mau, observacao")
          .in("cliente_id", ids)
          .order("data", { ascending: true })
      : { data: [], error: null };
    if (movimentosRes.error) throw new Error(`movimentos: ${movimentosRes.error.message}`);

    const nomePlano = new Map<string, string>(
      ((planosRes.data ?? []) as any[]).map((p) => [p.id as string, p.nome as string]),
    );

    const clientes = clientesDb.map((row) => {
      const c = mapDbToCliente(row);
      return {
        id: c.id,
        nome: c.nome,
        planoId: c.planoId,
        plano: c.planoId ? nomePlano.get(c.planoId) ?? "—" : "—",
        statusComercial: c.statusComercial,
        dataInicio: c.dataInicio,
        dataVencimento: c.dataVencimento,
        dataChurn: c.dataChurn,
      };
    });

    const movimentos = ((movimentosRes.data ?? []) as any[]).map((row) => {
      const m = mapDbToMovimento(row);
      return {
        id: m.id,
        clienteId: m.clienteId,
        data: m.data,
        tipo: m.tipo,
        planoId: m.planoId ?? null,
        plano: m.planoId ? nomePlano.get(m.planoId) ?? null : null,
        canais: m.canais ?? null,
        canaisWhats: m.canaisWhats ?? null,
        canaisInsta: m.canaisInsta ?? null,
        canaisMessenger: m.canaisMessenger ?? null,
        canaisZapi: m.canaisZapi ?? null,
        usuariosAtivos: m.usuariosAtivos ?? null,
        contatosAtivos: m.contatosAtivos ?? null,
        agentesIa: m.agentesIA ?? null,
        asaas: m.asaas ?? null,
        zapi: m.zapi ?? null,
        transcricaoIa: m.transcricaoIA ?? null,
        observacao: m.observacao ?? null,
      };
    });

    const base = {
      parceiro: {
        id: parceiroId as string,
        nome: (parceiroRes.data?.nome as string) ?? "Parceiro",
        siteUrl: (parceiroRes.data?.site_url as string | null) ?? null,
      },
      veValores,
      podeVerPainelCliente,
      // Lido do banco a cada carregamento — sem cache, para a aba nunca ficar desatualizada.
      podeVerFechamentos: Boolean(parceiroRes.data?.pode_ver_fechamentos),
      clientes,
      movimentos,
    };

    if (!veValores) return base;

    // Toggle ligado: preços do plano são lidos com credencial de serviço apenas
    // para calcular o que o CLIENTE paga. Nenhum custo/margem é derivado aqui.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const planosRaw = await (supabaseAdmin as any).from("elora_planos").select("*");
    if (planosRaw.error) throw new Error(`planos: ${planosRaw.error.message}`);
    const planos = ((planosRaw.data ?? []) as any[]).map(mapDbToPlano);

    const clientesComValor = clientesDb.map((row) => {
      const c = mapDbToCliente(row);
      const explicacao = explicarReceitaCliente(c, planos);
      const publico = clientes.find((x) => x.id === c.id)!;
      return {
        ...publico,
        mensalidade: receitaMensalCliente(c, planos, []),
        acompanhamento: explicacao.acompanhamento,
        itens: explicacao.itens.map((i) => ({
          label: i.label,
          qtd: i.qtd,
          unit: i.unit,
          total: i.total,
        })),
      };
    });

    return {
      ...base,
      clientes: clientesComValor,
      totalCarteira: clientesComValor.reduce((s, c) => s + (c.mensalidade || 0), 0),
    };
  });

/** Lista de pessoas com acesso de parceiro (somente admin). */
export const listarAcessosParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const { data: admin } = await db.rpc("is_admin");
    if (!admin) throw new Error("acesso-negado: apenas administradores.");
    const { data, error } = await db
      .from("elora_parceiro_usuarios")
      .select("id, parceiro_id, nome, email, ativo, user_id, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(`acessos: ${error.message}`);
    return ((data ?? []) as any[]).map((r) => ({
      id: r.id as string,
      parceiroId: r.parceiro_id as string,
      nome: r.nome as string,
      email: r.email as string,
      ativo: Boolean(r.ativo),
      vinculado: Boolean(r.user_id),
      criadoEm: String(r.created_at ?? "").slice(0, 10),
    }));
  });

/** Concede acesso a uma pessoa de parceiro (somente admin). */
export const concederAcessoParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => concederAcessoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: admin } = await db.rpc("is_admin");
    if (!admin) throw new Error("acesso-negado: apenas administradores.");
    const email = data.email.trim().toLowerCase();
    const { data: row, error } = await db
      .from("elora_parceiro_usuarios")
      .insert({
        parceiro_id: data.parceiroId,
        nome: data.nome.trim(),
        email,
        ativo: true,
        criado_por: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`conceder-acesso: ${error.message}`);
    if (!row?.id) throw new Error("conceder-acesso: registro não confirmado após salvar.");
    return { id: row.id as string };
  });

/** Ativa ou revoga o acesso de uma pessoa (somente admin). */
export const alterarAcessoParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => toggleAcessoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: admin } = await db.rpc("is_admin");
    if (!admin) throw new Error("acesso-negado: apenas administradores.");
    if (data.remover) {
      const { data: row, error } = await db
        .from("elora_parceiro_usuarios")
        .delete()
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(`remover-acesso: ${error.message}`);
      if (!row?.id) throw new Error("remover-acesso: registro não encontrado.");
      return { id: row.id as string, removido: true };
    }
    const { data: row, error } = await db
      .from("elora_parceiro_usuarios")
      .update({ ativo: data.ativo })
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`alterar-acesso: ${error.message}`);
    if (!row?.id) throw new Error("alterar-acesso: registro não encontrado.");
    return { id: row.id as string, removido: false };
  });

/**
 * Financeiro da área do parceiro.
 *
 * Regras (todas aplicadas na fonte, nunca no front):
 * - só roda para o parceiro do login, ou para a equipe interna no modo "ver como";
 * - a aba só é habilitada quando elora_parceiros.pode_ver_fechamentos = true (lido do banco na hora);
 * - só entram fechamentos com enviado_parceiro_em preenchido e não excluídos;
 * - só entram linhas de clientes cujo parceiro_id é o deste parceiro;
 * - a projeção é por LISTA BRANCA: custo, margem, lucro, WTS e desconto de escala
 *   nunca são lidos nem devolvidos.
 */
type LinhaFechamentoParceiro = {
  id: string;
  clienteId: string;
  clienteNome: string;
  planoNome: string | null;
  cicloInicio: string | null;
  cicloFim: string | null;
  vencimento: string | null;
  valorBruto: number;
  valorDesconto: number;
  valorLiquido: number;
  composicao: { label: string; total: number }[];
};

type FechamentoParceiro = {
  id: string;
  competencia: string;
  titulo: string;
  enviadoEm: string;
  linhas: LinhaFechamentoParceiro[];
  totalBruto: number;
  totalDesconto: number;
  totalLiquido: number;
};

export const getFinanceiroParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => painelParceiroSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const verComo = (data as { verComoParceiroId?: string } | undefined)?.verComoParceiroId;

    let parceiroId: string;
    if (verComo) {
      const { data: interno } = await db.rpc("is_equipe_interna");
      if (!interno) throw new Error("acesso-negado: modo de visualização é exclusivo da equipe interna.");
      parceiroId = verComo;
    } else {
      await db.rpc("link_parceiro_usuario");
      const { data: proprio } = await db.rpc("parceiro_do_usuario");
      if (!proprio) throw new Error("acesso-parceiro: este login não está vinculado a nenhum parceiro.");
      parceiroId = proprio as string;
    }

    const { data: parc, error: parcErr } = await db
      .from("elora_parceiros")
      .select("id, nome, pode_ver_fechamentos")
      .eq("id", parceiroId)
      .maybeSingle();
    if (parcErr) throw new Error(`parceiro: ${parcErr.message}`);
    if (!parc?.id) throw new Error("financeiro-parceiro: parceiro não encontrado.");

    const vazio = {
      habilitado: false as boolean,
      parceiro: { id: parceiroId, nome: (parc.nome as string) ?? "Parceiro" },
      fechamentos: [] as FechamentoParceiro[],
    };
    if (!parc.pode_ver_fechamentos) return vazio;

    const { data: clientesRows, error: cliErr } = await db
      .from("elora_clientes")
      .select("id, nome")
      .eq("parceiro_id", parceiroId);
    if (cliErr) throw new Error(`clientes: ${cliErr.message}`);
    const nomePorCliente = new Map<string, string>(
      ((clientesRows ?? []) as any[]).map((c) => [c.id as string, c.nome as string]),
    );
    const ids = [...nomePorCliente.keys()];
    if (ids.length === 0) return { ...vazio, habilitado: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const itensRes = await (supabaseAdmin as any)
      .from("elora_fechamento_itens")
      .select(
        "id, fechamento_id, cliente_id, ciclo_inicio, ciclo_fim, vencimento, valor_bruto, valor_desconto, valor_liquido, payload_snapshot",
      )
      .in("cliente_id", ids);
    if (itensRes.error) throw new Error(`fechamento-itens: ${itensRes.error.message}`);
    const itensRows = (itensRes.data ?? []) as any[];
    if (itensRows.length === 0) return { ...vazio, habilitado: true };

    const fechIds = [...new Set(itensRows.map((i) => i.fechamento_id as string))];
    const fechRes = await (supabaseAdmin as any)
      .from("elora_fechamentos")
      .select("id, competencia, titulo, enviado_parceiro_em")
      .in("id", fechIds)
      .not("enviado_parceiro_em", "is", null)
      .is("deletado_em", null);
    if (fechRes.error) throw new Error(`fechamentos: ${fechRes.error.message}`);

    const cabecalhos = (fechRes.data ?? []) as any[];
    const permitidos = new Set(cabecalhos.map((f) => f.id as string));

    const composicaoDe = (snapshot: unknown) => {
      const s = (snapshot ?? {}) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
      const linhas: { label: string; total: number }[] = [];
      const sistema = num(s["sistema"]);
      const acompanhamento = num(s["acompanhamento"]);
      const mauQtd = num(s["mauExcedenteQtd"]);
      const mauValor = num(s["mauExcedenteValor"]);
      if (sistema) linhas.push({ label: "Sistema", total: sistema });
      if (acompanhamento) linhas.push({ label: "Acompanhamento", total: acompanhamento });
      if (mauValor) linhas.push({ label: `MAU excedente (${mauQtd})`, total: mauValor });
      return linhas;
    };

    const fechamentos = cabecalhos
      .map((f) => {
        const linhas = itensRows
          .filter((i) => i.fechamento_id === f.id && nomePorCliente.has(i.cliente_id as string))
          .map((i) => {
            const snap = (i.payload_snapshot ?? {}) as Record<string, unknown>;
            return {
              id: i.id as string,
              clienteId: i.cliente_id as string,
              clienteNome: nomePorCliente.get(i.cliente_id as string) ?? "—",
              planoNome: (snap["planoNome"] as string | null) ?? null,
              cicloInicio: (i.ciclo_inicio as string | null) ?? null,
              cicloFim: (i.ciclo_fim as string | null) ?? null,
              vencimento: (i.vencimento as string | null) ?? null,
              valorBruto: Number(i.valor_bruto ?? 0),
              valorDesconto: Number(i.valor_desconto ?? 0),
              valorLiquido: Number(i.valor_liquido ?? 0),
              composicao: composicaoDe(snap),
            };
          })
          .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"));
        return {
          id: f.id as string,
          competencia: f.competencia as string,
          titulo: f.titulo as string,
          enviadoEm: f.enviado_parceiro_em as string,
          linhas,
          // Totais somados SÓ sobre as linhas deste parceiro.
          totalBruto: linhas.reduce((s, l) => s + l.valorBruto, 0),
          totalDesconto: linhas.reduce((s, l) => s + l.valorDesconto, 0),
          totalLiquido: linhas.reduce((s, l) => s + l.valorLiquido, 0),
        };
      })
      .filter((f) => permitidos.has(f.id) && f.linhas.length > 0)
      .sort((a, b) => b.competencia.localeCompare(a.competencia));

    return {
      habilitado: true,
      parceiro: { id: parceiroId, nome: (parc.nome as string) ?? "Parceiro" },
      fechamentos,
    };
  });

/** Libera (ou revoga) a consulta de um fechamento pelos parceiros. Somente admin. */
export const alternarEnvioFechamentoParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => envioFechamentoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: admin } = await db.rpc("is_admin");
    if (!admin) throw new Error("acesso-negado: apenas administradores.");

    const agora = data.enviar ? new Date().toISOString() : null;
    const { data: row, error } = await db
      .from("elora_fechamentos")
      .update({
        enviado_parceiro_em: agora,
        enviado_parceiro_por: data.enviar ? context.userId : null,
      })
      .eq("id", data.fechamentoId)
      .select("id, enviado_parceiro_em")
      .maybeSingle();
    if (error) throw new Error(`envio-parceiro: ${error.message}`);
    if (!row?.id) throw new Error("envio-parceiro: fechamento não encontrado.");
    return { id: row.id as string, enviadoEm: (row.enviado_parceiro_em as string | null) ?? null };
  });
