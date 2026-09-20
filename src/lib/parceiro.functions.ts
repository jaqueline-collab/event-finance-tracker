import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapDbToCliente, mapDbToMovimento, mapDbToPlano } from "@/lib/mappers";
import { detalharCicloCliente, explicarReceitaCliente } from "@/lib/calc/receita";
import {
  concederAcessoSchema,
  envioFechamentoSchema,
  painelParceiroSchema,
  toggleAcessoSchema,
} from "@/lib/parceiro.schemas";
import {
  montarFechamentosParceiro,
  type FechamentoParceiro,
  type ItemRelatorioParceiro,
} from "@/lib/parceiro.financeiro";
import type { PlanoCalculadoraParceiro } from "@/lib/parceiro.calculadora";

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
          .select("id, cliente_id, data, tipo, plano_id, canais, canais_whats, canais_insta, canais_messenger, canais_zapi, usuarios_ativos, contatos_ativos, agentes_ia, asaas, zapi, transcricao_ia, apps, mau, observacao, vigencia_plano, cobranca_troca")
          .in("cliente_id", ids)
          .order("data", { ascending: true })
      : { data: [], error: null };
    if (movimentosRes.error) throw new Error(`movimentos: ${movimentosRes.error.message}`);

    const nomePlano = new Map<string, string>(
      ((planosRes.data ?? []) as any[]).map((p) => [p.id as string, p.nome as string]),
    );

    // Preços do plano lidos com credencial de serviço apenas para calcular o que o
    // CLIENTE paga. Nenhum custo, margem, lucro, WTS ou desconto de escala é derivado aqui.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const planosRaw = await (supabaseAdmin as any).from("elora_planos").select("*");
    if (planosRaw.error) throw new Error(`planos: ${planosRaw.error.message}`);
    const planos = ((planosRaw.data ?? []) as any[]).map(mapDbToPlano);
    const planoPorId = new Map(planos.map((p) => [p.id, p]));

    const movimentosModel = ((movimentosRes.data ?? []) as any[]).map(mapDbToMovimento);

    const clientes = clientesDb.map((row) => {
      const c = mapDbToCliente(row);
      const plano = c.planoId ? planoPorId.get(c.planoId) : undefined;
      const explicacao = explicarReceitaCliente(c, planos);
      const linhaLicenca = explicacao.itens[0];
      const excedentes = explicacao.itens.slice(1).map((i) => ({
        label: i.label,
        qtd: i.qtd,
        unit: i.unit,
        total: i.total,
      }));

      const publico = {
        id: c.id,
        nome: c.nome,
        planoId: c.planoId,
        plano: c.planoId ? nomePlano.get(c.planoId) ?? "—" : "—",
        statusComercial: c.statusComercial,
        dataInicio: c.dataInicio,
        dataVencimento: c.dataVencimento,
        dataChurn: c.dataChurn,
        // Pacote de recursos: quantidades contratadas e franquias do plano (não é preço).
        recursos: {
          canaisWhats: c.canaisWhats ?? 0,
          canaisInsta: c.canaisInsta ?? 0,
          canaisMessenger: c.canaisMessenger ?? 0,
          canaisZapi: c.canaisZapi ?? 0,
          usuariosAtivos: c.usuariosAtivos ?? 0,
          contatosAtivos: c.contatosAtivos ?? 0,
          agentesIA: Boolean(c.agentesIA),
          asaas: Boolean(c.asaas),
          transcricaoIA: Boolean(c.transcricaoIA),
          canaisWhatsInclusos: plano?.canaisWhatsInclusos ?? 0,
          canaisInstaInclusos: plano?.canaisInstaInclusos ?? 0,
          canaisMessengerInclusos: plano?.canaisMessengerInclusos ?? 0,
          zapiInclusos:
            typeof plano?.incluiZapi === "number" ? plano.incluiZapi : plano?.incluiZapi ? 1 : 0,
          usuariosInclusos: plano?.usuariosInclusos ?? 0,
          contatosInclusos: plano?.contatosInclusos ?? 0,
          incluiIA: Boolean(plano?.incluiIA),
          incluiAsaas: Boolean(plano?.incluiAsaas),
          incluiTranscricao: Boolean(plano?.incluiTranscricao),
        },
      };

      if (veValores) {
        // Com permissão de composição: licença base e acompanhamento discriminados.
        const itens = [
          ...(linhaLicenca
            ? [{ label: linhaLicenca.label, qtd: 1, unit: linhaLicenca.unit, total: linhaLicenca.total }]
            : []),
          ...(explicacao.acompanhamento > 0
            ? [
                {
                  label: "Acompanhamento mensal",
                  qtd: 1,
                  unit: explicacao.acompanhamento,
                  total: explicacao.acompanhamento,
                },
              ]
            : []),
          ...excedentes,
        ];
        return {
          ...publico,
          mensalidade: explicacao.total,
          licenca: linhaLicenca?.total ?? 0,
          acompanhamento: explicacao.acompanhamento,
          excedentes,
          itens,
        };
      }

      // Sem permissão: licença base e acompanhamento somados e indivisíveis.
      return {
        ...publico,
        mensalidade: explicacao.total,
        totalPlano: (linhaLicenca?.total ?? 0) + explicacao.acompanhamento,
        excedentes,
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

    // Previsão da competência em curso: mesma máquina de cálculo do fechamento
    // mensal, em modo somente leitura (nada é gravado em fechamentos/financeiro).
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    let totalCarteira = 0;
    let totalLicenca = 0;
    let totalAcompanhamento = 0;
    let totalExcedentes = 0;
    for (const row of clientesDb) {
      const c = mapDbToCliente(row);
      const doCiclo = detalharCicloCliente(c, planos, [], movimentosModel, ano, mes).total;
      totalCarteira += doCiclo;
      if (!veValores || doCiclo <= 0) continue;
      // Composição do mesmo valor projetado: a mensalidade vigente é rateada na
      // proporção do que o ciclo realmente cobra (troca de plano, proporcionalidade).
      const e = explicarReceitaCliente(c, planos);
      const fator = e.total > 0 ? doCiclo / e.total : 0;
      totalLicenca += (e.itens[0]?.total ?? 0) * fator;
      totalAcompanhamento += e.acompanhamento * fator;
      totalExcedentes += e.itens.slice(1).reduce((s, i) => s + i.total, 0) * fator;
    }


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
      totalCarteira,
    };

    if (!veValores) return base;

    return { ...base, totalLicenca, totalAcompanhamento, totalExcedentes };
  });


/** Catálogo comercial da calculadora, restrito aos planos vinculados ao parceiro. */
export const getPlanosCalculadoraParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => painelParceiroSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const verComo = (data as { verComoParceiroId?: string } | undefined)?.verComoParceiroId;
    let parceiroId: string;

    if (verComo) {
      const { data: interno } = await db.rpc("is_equipe_interna");
      if (!interno) throw new Error("acesso-negado: modo de visualização é exclusivo da equipe interna.");
      const { data: alvo, error: alvoErr } = await db
        .from("elora_parceiros")
        .select("id")
        .eq("id", verComo)
        .maybeSingle();
      if (alvoErr) throw new Error(`parceiro: ${alvoErr.message}`);
      if (!alvo?.id) throw new Error("calculadora: parceiro não encontrado.");
      parceiroId = alvo.id as string;
    } else {
      await db.rpc("link_parceiro_usuario");
      const { data: proprio } = await db.rpc("parceiro_do_usuario");
      if (!proprio) throw new Error("acesso-parceiro: este login não está vinculado a nenhum parceiro.");
      parceiroId = proprio as string;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("elora_planos")
      .select(
        "id, nome, ativo, cobranca, valor_mensal, valor_setup, valor_acompanhamento, canais_whats_inclusos, canais_insta_inclusos, canais_messenger_inclusos, usuarios_inclusos, contatos_inclusos, inclui_ia, inclui_asaas, inclui_zapi, inclui_transcricao, valor_canal_whats_exc, valor_canal_insta_exc, valor_canal_messenger_exc, valor_usuarios_exc, valor_contatos_exc, valor_ia, valor_asaas, valor_zapi, valor_transcricao_user, parceiro_ids",
      )
      .order("nome");
    if (error) throw new Error(`calculadora-planos: ${error.message}`);

    const vinculados = ((rows ?? []) as any[]).filter(
      (r) =>
        r.ativo !== false &&
        Array.isArray(r.parceiro_ids) &&
        r.parceiro_ids.includes(parceiroId),
    );
    const planos: PlanoCalculadoraParceiro[] = vinculados.map((r) => ({
      id: String(r.id),
      nome: String(r.nome),
      cobranca: r.cobranca === "unica" ? "unica" : "recorrente",
      valorMensal: Number(r.valor_mensal ?? 0),
      valorSetup: Number(r.valor_setup ?? 0),
      valorAcompanhamento: Number(r.valor_acompanhamento ?? 0),
      canaisWhatsInclusos: Number(r.canais_whats_inclusos ?? 0),
      canaisInstaInclusos: Number(r.canais_insta_inclusos ?? 0),
      canaisMessengerInclusos: Number(r.canais_messenger_inclusos ?? 0),
      usuariosInclusos: Number(r.usuarios_inclusos ?? 0),
      contatosInclusos: Number(r.contatos_inclusos ?? 0),
      incluiIA: Boolean(r.inclui_ia),
      incluiAsaas: Boolean(r.inclui_asaas),
      incluiZapi: Number(r.inclui_zapi ?? 0),
      incluiTranscricao: Boolean(r.inclui_transcricao),
      valorCanalWhatsExc: Number(r.valor_canal_whats_exc ?? 0),
      valorCanalInstaExc: Number(r.valor_canal_insta_exc ?? 0),
      valorCanalMessengerExc: Number(r.valor_canal_messenger_exc ?? 0),
      valorUsuariosExc: Number(r.valor_usuarios_exc ?? 0),
      valorContatosExc: Number(r.valor_contatos_exc ?? 0),
      valorIA: Number(r.valor_ia ?? 0),
      valorAsaas: Number(r.valor_asaas ?? 0),
      valorZapi: Number(r.valor_zapi ?? 0),
      valorTranscricaoUser: Number(r.valor_transcricao_user ?? 0),
    }));

    return { parceiroId, planos };
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
      .select("id, nome, pode_ver_fechamentos, mostrar_valores_cliente")
      .eq("id", parceiroId)
      .maybeSingle();
    if (parcErr) throw new Error(`parceiro: ${parcErr.message}`);
    if (!parc?.id) throw new Error("financeiro-parceiro: parceiro não encontrado.");

    // Permissão de composição: mesma trava usada em todo o resto da área.
    const veValores = Boolean(parc.mostrar_valores_cliente);

    const vazio = {
      habilitado: false as boolean,
      veValores,
      parceiro: { id: parceiroId, nome: (parc.nome as string) ?? "Parceiro" },
      fechamentos: [] as FechamentoParceiro[],
      relatorioItens: [] as ItemRelatorioParceiro[],
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
        "id, fechamento_id, cliente_id, ciclo_inicio, ciclo_fim, vencimento, valor_bruto, valor_desconto, valor_liquido, payload_snapshot, lancamento_financeiro_id",
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

    // Status do lançamento e nota fiscal anexada — só dos lançamentos deste parceiro.
    const lancamentoIds = [
      ...new Set(
        itensRows
          .map((i) => i.lancamento_financeiro_id)
          .filter((v): v is string => Boolean(v))
          .map(String),
      ),
    ];
    const statusPorLancamento = new Map<string, string>();
    const notaPorLancamento = new Map<string, string>();
    if (lancamentoIds.length > 0) {
      const [finRes, nfRes] = await Promise.all([
        (supabaseAdmin as any).from("elora_financeiro").select("id, status").in("id", lancamentoIds),
        (supabaseAdmin as any)
          .from("elora_nota_fiscal_lancamentos")
          .select("lancamento_id, nota_id")
          .in("lancamento_id", lancamentoIds),
      ]);
      for (const l of ((finRes.data ?? []) as any[])) {
        if (l.status) statusPorLancamento.set(String(l.id), String(l.status));
      }
      for (const v of ((nfRes.data ?? []) as any[])) {
        notaPorLancamento.set(String(v.lancamento_id), String(v.nota_id));
      }
    }

    const fechamentos = montarFechamentosParceiro({
      nomePorCliente,
      cabecalhos,
      itens: itensRows as Record<string, unknown>[],
      statusPorLancamento,
      notaPorLancamento,
    });

    // Insumo dos Relatórios: só itens de fechamentos já liberados ao parceiro.
    const competenciaPorFechamento = new Map<string, string>(
      cabecalhos.map((c) => [String(c.id), String(c.competencia ?? "").slice(0, 7)]),
    );
    const relatorioItens: ItemRelatorioParceiro[] = itensRows
      .filter((i) => competenciaPorFechamento.has(String(i.fechamento_id)))
      .map((i) => {
        const snap = (i.payload_snapshot ?? {}) as Record<string, unknown>;
        const lanc = i.lancamento_financeiro_id ? String(i.lancamento_financeiro_id) : null;
        return {
          clienteId: String(i.cliente_id),
          competencia: competenciaPorFechamento.get(String(i.fechamento_id)) ?? "",
          valorLiquido: Number(i.valor_liquido ?? 0),
          // Composição só viaja com permissão — sem ela, nem sai do servidor.
          sistema: veValores ? Number(snap["sistema"] ?? 0) : 0,
          acompanhamento: veValores ? Number(snap["acompanhamento"] ?? 0) : 0,
          pago: lanc ? statusPorLancamento.get(lanc) === "pago" : false,
        };
      });

    return {
      habilitado: true,
      veValores,
      parceiro: { id: parceiroId, nome: (parc.nome as string) ?? "Parceiro" },
      fechamentos,
      relatorioItens,
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
