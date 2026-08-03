import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapDbToCliente, mapDbToMovimento, mapDbToPlano } from "@/lib/mappers";
import { explicarReceitaCliente, receitaMensalCliente } from "@/lib/calc/receita";
import {
  concederAcessoSchema,
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
    await db.rpc("link_parceiro_usuario");
    const [{ data: interno }, { data: parceiroId }, { data: veValores }] = await Promise.all([
      db.rpc("is_equipe_interna"),
      db.rpc("parceiro_do_usuario"),
      db.rpc("parceiro_ve_valores"),
    ]);
    return {
      isInterno: Boolean(interno),
      parceiroId: (parceiroId as string | null) ?? null,
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
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    await db.rpc("link_parceiro_usuario");
    const { data: parceiroId } = await db.rpc("parceiro_do_usuario");
    if (!parceiroId) throw new Error("acesso-parceiro: este login não está vinculado a nenhum parceiro.");
    const { data: veValoresRaw } = await db.rpc("parceiro_ve_valores");
    const veValores = Boolean(veValoresRaw);

    const [parceiroRes, clientesRes, planosRes] = await Promise.all([
      db.from("elora_parceiros").select("id, nome, email, celular").eq("id", parceiroId).maybeSingle(),
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
      },
      veValores,
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
