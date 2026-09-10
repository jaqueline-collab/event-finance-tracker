import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Área do Cliente. Só devolve o que o cliente pode ver: plano, itens contratados,
 * histórico de mudanças, novidades e a equipe dele. Nunca custo, margem ou lucro.
 */

const equipeSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
});

const removerSchema = z.object({ id: z.string().uuid() });

const releaseSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(2).max(160),
  resumo: z.string().trim().max(300).nullable().optional(),
  conteudo: z.string().trim().max(20000).default(""),
  tag: z.string().trim().max(40).default("novidade"),
  publicado: z.boolean().default(false),
  paraTodos: z.boolean().default(false),
  clientesIds: z.array(z.string()).default([]),
});

const acessoClienteSchema = z.object({
  clienteId: z.string().min(1),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
});

const alterarAcessoClienteSchema = z.object({
  id: z.string().uuid(),
  ativo: z.boolean().optional(),
  remover: z.boolean().optional(),
});

async function resolverClienteId(db: any, verComo?: string): Promise<string | null> {
  if (verComo) {
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: modo de visualização é exclusivo da equipe interna.");
    return verComo;
  }
  await db.rpc("link_cliente_usuario");
  const { data: proprio } = await db.rpc("cliente_do_usuario");
  // Sem vínculo não é erro: pode ser um admin/parceiro abrindo a área do cliente.
  return (proprio as string) || null;
}

export const getPainelCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ verComoClienteId: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const clienteId = await resolverClienteId(db, data.verComoClienteId?.trim() || undefined);
    if (!clienteId) return { semVinculo: true as const };


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const [clienteRes, movRes, equipeRes] = await Promise.all([
      admin
        .from("elora_clientes")
        .select(
          "id, nome, plano_id, data_inicio, data_vencimento, data_churn, status_comercial, apps, mau, canais_whats, canais_insta, canais_messenger, canais_zapi, usuarios_ativos, contatos_ativos, agentes_ia, asaas, zapi, transcricao_ia",
        )
        .eq("id", clienteId)
        .maybeSingle(),
      admin
        .from("elora_movimentos")
        .select(
          "id, data, tipo, plano_id, canais_whats, canais_insta, canais_messenger, canais_zapi, usuarios_ativos, contatos_ativos, agentes_ia, asaas, zapi, transcricao_ia, observacao",
        )
        .eq("cliente_id", clienteId)
        .order("data", { ascending: false }),
      admin
        .from("elora_cliente_usuarios")
        .select("id, nome, email, ativo, user_id, created_at")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: true }),
    ]);

    if (clienteRes.error) throw new Error(`cliente: ${clienteRes.error.message}`);
    if (!clienteRes.data) throw new Error("cliente: conta não encontrada.");

    const cliente = clienteRes.data as any;

    let plano: { nome: string; inclusos: { label: string; valor: string }[] } | null = null;
    if (cliente.plano_id) {
      const { data: p } = await admin
        .from("elora_planos")
        .select(
          "nome, canais_whats_inclusos, canais_insta_inclusos, canais_messenger_inclusos, usuarios_inclusos, contatos_inclusos, inclui_ia, inclui_asaas, inclui_zapi, inclui_transcricao",
        )
        .eq("id", cliente.plano_id)
        .maybeSingle();
      if (p) {
        plano = {
          nome: p.nome as string,
          inclusos: [
            { label: "Canais WhatsApp", valor: String(p.canais_whats_inclusos ?? 0) },
            { label: "Canais Instagram", valor: String(p.canais_insta_inclusos ?? 0) },
            { label: "Canais Messenger", valor: String(p.canais_messenger_inclusos ?? 0) },
            { label: "Usuários", valor: String(p.usuarios_inclusos ?? 0) },
            { label: "Contatos", valor: String(p.contatos_inclusos ?? 0) },
            { label: "Agentes de IA", valor: p.inclui_ia ? "Incluso" : "Adicional" },
            { label: "Asaas", valor: p.inclui_asaas ? "Incluso" : "Adicional" },
            { label: "Z-API", valor: String(p.inclui_zapi ?? 0) },
            { label: "Transcrição", valor: p.inclui_transcricao ? "Incluso" : "Adicional" },
          ],
        };
      }
    }

    const releasesRes = await admin
      .from("elora_releases")
      .select("id, titulo, resumo, conteudo, tag, publicado_em, para_todos, elora_release_destinos(cliente_id)")
      .eq("publicado", true)
      .order("publicado_em", { ascending: false });

    const releases = ((releasesRes.data ?? []) as any[])
      .filter(
        (r) =>
          r.para_todos ||
          ((r.elora_release_destinos ?? []) as any[]).some((d) => d.cliente_id === clienteId),
      )
      .map((r) => ({
        id: r.id as string,
        titulo: r.titulo as string,
        resumo: (r.resumo as string) ?? null,
        conteudo: (r.conteudo as string) ?? "",
        tag: (r.tag as string) ?? "novidade",
        publicadoEm: r.publicado_em ? String(r.publicado_em) : null,
      }));

    return {
      cliente: {
        id: cliente.id as string,
        nome: cliente.nome as string,
        dataInicio: cliente.data_inicio ?? null,
        dataVencimento: cliente.data_vencimento ?? null,
        dataChurn: cliente.data_churn ?? null,
        status: (cliente.status_comercial as string) ?? "ativo",
      },
      plano,
      releases,
      contratado: [
        { label: "Canais WhatsApp", valor: cliente.canais_whats ?? 0 },
        { label: "Canais Instagram", valor: cliente.canais_insta ?? 0 },
        { label: "Canais Messenger", valor: cliente.canais_messenger ?? 0 },
        { label: "Canais Z-API", valor: cliente.canais_zapi ?? 0 },
        { label: "Usuários", valor: cliente.usuarios_ativos ?? 0 },
        { label: "Contatos", valor: cliente.contatos_ativos ?? 0 },
      ],
      recursos: {
        agentesIa: Boolean(cliente.agentes_ia),
        asaas: Boolean(cliente.asaas),
        zapi: Boolean(cliente.zapi),
        transcricao: Boolean(cliente.transcricao_ia),
      },
      historico: ((movRes.data ?? []) as any[]).map((m) => ({
        id: m.id as string,
        data: String(m.data),
        tipo: m.tipo as string,
        observacao: (m.observacao as string) ?? null,
        itens: [
          ["Canais WhatsApp", m.canais_whats],
          ["Canais Instagram", m.canais_insta],
          ["Canais Messenger", m.canais_messenger],
          ["Canais Z-API", m.canais_zapi],
          ["Usuários", m.usuarios_ativos],
          ["Contatos", m.contatos_ativos],
        ]
          .filter(([, v]) => typeof v === "number" && v !== 0)
          .map(([label, v]) => `${label}: ${(v as number) > 0 ? "+" : ""}${v}`),
      })),
      equipe: ((equipeRes.data ?? []) as any[]).map((p) => ({
        id: p.id as string,
        nome: p.nome as string,
        email: p.email as string,
        ativo: Boolean(p.ativo),
        vinculado: Boolean(p.user_id),
      })),
      // Reservado para o painel de resultados que virá de uma API externa.
      resultados: null as null | Record<string, number>,
    };
  });

/** Cliente adiciona alguém da equipe dele. */
export const adicionarPessoaEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => equipeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await db.rpc("link_cliente_usuario");
    const { data: clienteId } = await db.rpc("cliente_do_usuario");
    if (!clienteId) throw new Error("acesso-cliente: login não vinculado a uma conta de cliente.");
    const { data: row, error } = await db
      .from("elora_cliente_usuarios")
      .insert({
        cliente_id: clienteId,
        nome: data.nome,
        email: data.email.toLowerCase(),
        ativo: true,
        criado_por: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`equipe: ${error.message}`);
    return { id: row?.id as string };
  });

/** Cliente remove alguém da equipe dele. */
export const removerPessoaEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => removerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: row, error } = await db
      .from("elora_cliente_usuarios")
      .delete()
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`equipe: ${error.message}`);
    if (!row?.id) throw new Error("equipe: registro não encontrado.");
    return { id: row.id as string };
  });

/* ------------------------- Lado interno (admin) ------------------------- */

export const listarAcessosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
    const { data: rows, error } = await db
      .from("elora_cliente_usuarios")
      .select("id, nome, email, ativo, user_id, created_at")
      .eq("cliente_id", data.clienteId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`acessos: ${error.message}`);
    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id as string,
      nome: r.nome as string,
      email: r.email as string,
      ativo: Boolean(r.ativo),
      vinculado: Boolean(r.user_id),
    }));
  });

export const concederAcessoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => acessoClienteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
    const { data: row, error } = await db
      .from("elora_cliente_usuarios")
      .insert({
        cliente_id: data.clienteId,
        nome: data.nome,
        email: data.email.toLowerCase(),
        ativo: true,
        criado_por: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`conceder-acesso: ${error.message}`);
    if (!row?.id) throw new Error("conceder-acesso: registro não confirmado.");
    return { id: row.id as string };
  });

export const alterarAcessoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => alterarAcessoClienteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
    if (data.remover) {
      const { data: row, error } = await db
        .from("elora_cliente_usuarios")
        .delete()
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(`remover-acesso: ${error.message}`);
      return { id: row?.id as string, removido: true };
    }
    const { data: row, error } = await db
      .from("elora_cliente_usuarios")
      .update({ ativo: data.ativo ?? true })
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`alterar-acesso: ${error.message}`);
    return { id: row?.id as string, removido: false };
  });

/** Lista todas as novidades (equipe interna). */
export const listarReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
    const { data, error } = await db
      .from("elora_releases")
      .select("id, titulo, resumo, conteudo, tag, publicado, para_todos, publicado_em, elora_release_destinos(cliente_id)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`novidades: ${error.message}`);
    return ((data ?? []) as any[]).map((r) => ({
      id: r.id as string,
      titulo: r.titulo as string,
      resumo: (r.resumo as string) ?? "",
      conteudo: (r.conteudo as string) ?? "",
      tag: (r.tag as string) ?? "novidade",
      publicado: Boolean(r.publicado),
      paraTodos: Boolean(r.para_todos),
      publicadoEm: r.publicado_em ? String(r.publicado_em) : null,
      clientesIds: ((r.elora_release_destinos ?? []) as any[]).map((d) => d.cliente_id as string),
    }));
  });

/** Cria ou atualiza uma novidade e seus destinatários (equipe interna). */
export const salvarRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => releaseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");

    const registro = {
      titulo: data.titulo,
      resumo: data.resumo ?? null,
      conteudo: data.conteudo,
      tag: data.tag,
      publicado: data.publicado,
      para_todos: data.paraTodos,
      publicado_em: data.publicado ? new Date().toISOString().slice(0, 10) : null,
      criado_por: context.userId,
      updated_at: new Date().toISOString(),
    };

    let id = data.id;
    if (id) {
      const { error } = await db.from("elora_releases").update(registro).eq("id", id);
      if (error) throw new Error(`novidade: ${error.message}`);
    } else {
      const { data: row, error } = await db
        .from("elora_releases")
        .insert(registro)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(`novidade: ${error.message}`);
      if (!row?.id) throw new Error("novidade: registro não confirmado.");
      id = row.id as string;
    }

    await db.from("elora_release_destinos").delete().eq("release_id", id);
    if (!data.paraTodos && data.clientesIds.length) {
      const { error } = await db
        .from("elora_release_destinos")
        .insert(data.clientesIds.map((cliente_id) => ({ release_id: id, cliente_id })));
      if (error) throw new Error(`destinatários: ${error.message}`);
    }
    return { id: id as string };
  });

export const removerRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => removerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
    const { error } = await db.from("elora_releases").delete().eq("id", data.id);
    if (error) throw new Error(`novidade: ${error.message}`);
    return { id: data.id };
  });

/** Lista de clientes para o modo "ver como cliente" (somente equipe interna). */
export const listarClientesParaVer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const { data: interno } = await db.rpc("is_equipe_interna");
    if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
    const { data, error } = await db
      .from("elora_clientes")
      .select("id, nome")
      .order("nome", { ascending: true });
    if (error) throw new Error(`clientes: ${error.message}`);
    return (data ?? []) as { id: string; nome: string }[];
  });
