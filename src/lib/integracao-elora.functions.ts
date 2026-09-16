import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Integração com o app Elora (contatos sincronizados + resultados, por cliente).
 *
 * Segurança combinada:
 * - a tabela `elora_integracao_contas` não tem GRANT para logins comuns —
 *   nenhum SELECT do navegador alcança a chave nem o mapeamento;
 * - toda função que toca a chave exige equipe interna ANTES de carregar a
 *   credencial de serviço, a única que lê `api_key` em claro;
 * - nada retorna a chave para o navegador — no máximo `••••últimos 4`;
 * - a leitura do painel "Resultados" usa a sessão do usuário (RLS aplicada);
 * - a gravação de contatos é exclusiva da sincronização (service role).
 */

type IntegracaoVisivel = {
  clienteId: string;
  configurada: boolean;
  ativo: boolean;
  baseUrl: string | null;
  chaveMascarada: string | null;
  campoProcedimentoKey: string | null;
  campoDataConsultaKey: string | null;
  retomadaPendente: boolean;
  ultimaSync: string | null;
  ultimoErro: string | null;
};

const mascaraChave = (chave: string) =>
  chave.length <= 4 ? "••••" : `••••${chave.slice(-4)}`;

async function exigirEquipeInterna(db: any) {
  const { data: interno } = await db.rpc("is_equipe_interna");
  if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
}

/** Lê o estado da integração de um cliente, com a chave sempre mascarada. */
export const getIntegracaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<IntegracaoVisivel> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select(
        "cliente_id, base_url, api_key, ativo, campo_procedimento_key, campo_data_consulta_key, sync_janela_inicio, ultima_sync, ultimo_erro",
      )
      .eq("cliente_id", data.clienteId)
      .maybeSingle();

    if (!conta) {
      return {
        clienteId: data.clienteId,
        configurada: false,
        ativo: false,
        baseUrl: null,
        chaveMascarada: null,
        campoProcedimentoKey: null,
        campoDataConsultaKey: null,
        retomadaPendente: false,
        ultimaSync: null,
        ultimoErro: null,
      };
    }

    return {
      clienteId: conta.cliente_id,
      configurada: true,
      ativo: Boolean(conta.ativo),
      baseUrl: conta.base_url,
      chaveMascarada: mascaraChave(String(conta.api_key)),
      campoProcedimentoKey: conta.campo_procedimento_key ? String(conta.campo_procedimento_key) : null,
      campoDataConsultaKey: conta.campo_data_consulta_key ? String(conta.campo_data_consulta_key) : null,
      retomadaPendente: Boolean(conta.sync_janela_inicio),
      ultimaSync: conta.ultima_sync ? String(conta.ultima_sync) : null,
      ultimoErro: conta.ultimo_erro ? String(conta.ultimo_erro) : null,
    };
  });

const salvarSchema = z.object({
  clienteId: z.string().min(1),
  baseUrl: z.string().trim().url().max(500),
  apiKey: z.string().trim().min(1).max(500),
});

/** Grava ou substitui a chave da conta de um cliente. Campo de escrita apenas. */
export const salvarIntegracaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => salvarSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("elora_integracao_contas")
      .upsert(
        {
          cliente_id: data.clienteId,
          base_url: data.baseUrl.replace(/\/+$/, ""),
          api_key: data.apiKey,
          ativo: true,
          ultimo_erro: null,
          criado_por: context.userId,
        },
        { onConflict: "cliente_id" },
      );
    if (error) throw new Error(`integracao: ${error.message}`);
    return { ok: true };
  });

/** Liga ou desliga a integração sem tocar na chave. */
export const alternarIntegracaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1), ativo: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("elora_integracao_contas")
      .update({ ativo: data.ativo })
      .eq("cliente_id", data.clienteId);
    if (error) throw new Error(`integracao: ${error.message}`);
    return { ok: true };
  });

/**
 * Camada única de leitura da API do app Elora.
 * Centraliza base + autenticação + tempo-limite + limites de requisição
 * (429: espera e tenta de novo; 1.000 req/5 min, pico de 200/5s por conta),
 * e devolve JSON — a tela nunca depende do formato do fornecedor.
 */
const ESPERAS_429 = [5_000, 15_000, 45_000];

async function chamadaComTempo(url: string, init: RequestInit): Promise<Response> {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 12_000);
  try {
    return await fetch(url, { ...init, signal: controlador.signal });
  } finally {
    clearTimeout(limite);
  }
}

async function lerApiElora(
  baseUrl: string,
  apiKey: string,
  caminho: string,
  opts: { metodo?: "GET" | "POST"; corpo?: unknown } = {},
): Promise<Record<string, unknown>> {
  const url = `${baseUrl}${caminho}`;
  const init: RequestInit = {
    method: opts.metodo ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(opts.corpo !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.corpo !== undefined ? JSON.stringify(opts.corpo) : undefined,
  };

  for (let tentativa = 0; ; tentativa++) {
    let resposta: Response;
    try {
      resposta = await chamadaComTempo(url, init);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("O app Elora demorou demais para responder. Tente novamente.");
      }
      throw new Error(
        "Não foi possível falar com o app Elora. Confira o endereço da conta e a conexão.",
      );
    }

    if (resposta.status === 429) {
      if (tentativa >= ESPERAS_429.length) {
        throw new Error(
          "limite de requisições do app Elora atingido. Tente novamente em alguns minutos — a sincronização retoma de onde parou.",
        );
      }
      const bruto = Number(resposta.headers.get("Retry-After") ?? "");
      const espera =
        Number.isFinite(bruto) && bruto > 0 ? Math.min(bruto * 1000, 300_000) : ESPERAS_429[tentativa];
      await new Promise((r) => setTimeout(r, espera));
      continue;
    }

    if (!resposta.ok) {
      throw new Error(
        resposta.status === 401 || resposta.status === 403
          ? "A chave de API foi recusada pelo app Elora. Confira a chave da conta."
          : `O app Elora respondeu com erro (${resposta.status}). Tente novamente.`,
      );
    }
    return (await resposta.json()) as Record<string, unknown>;
  }
}

/** Testa a conexão com a conta do cliente. Não grava nada. */
export const testarIntegracaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select("base_url, api_key")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    if (!conta) throw new Error("integracao: nenhuma chave configurada para este cliente.");

    try {
      await lerApiElora(String(conta.base_url), String(conta.api_key), "/v1/status");
      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ ultimo_erro: null })
        .eq("cliente_id", data.clienteId);
      return { conectado: true as const, mensagem: "Conectado com sucesso." };
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha desconhecida.";
      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ ultimo_erro: mensagem })
        .eq("cliente_id", data.clienteId);
      return { conectado: false as const, mensagem };
    }
  });

export type CampoElora = { chave: string; nome: string };

/** Lista os campos personalizados da conta, para a pessoa escolher no mapa. */
export const listarCamposPersonalizados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<{ campos: CampoElora[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select("base_url, api_key")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    if (!conta) throw new Error("integracao: nenhuma chave configurada para este cliente.");

    const resp = await lerApiElora(
      String(conta.base_url),
      String(conta.api_key),
      "/v1/contact/custom-field?NestedList=false",
    );

    const lista = Array.isArray(resp)
      ? resp
      : Array.isArray((resp as any)?.items)
        ? (resp as any).items
        : Array.isArray((resp as any)?.data)
          ? (resp as any).data
          : [];

    const campos = ((lista ?? []) as any[])
      .map((c: any) => {
        const chave = String(c.key ?? c.id ?? c.slug ?? c.field ?? c.value ?? "");
        const nome = String(c.label ?? c.name ?? c.title ?? c.displayName ?? c.nome ?? chave);
        return { chave, nome };
      })
      .filter((c) => c.chave.length > 0);

    return { campos };
  });

const mapeamentoSchema = z.object({
  clienteId: z.string().min(1),
  campoProcedimentoKey: z.string().trim().min(1).max(200),
  campoDataConsultaKey: z.string().trim().min(1).max(200),
});

/** Salva qual campo é "Procedimento de interesse" e qual é "Data da consulta". */
export const salvarMapeamentoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => mapeamentoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("elora_integracao_contas")
      .update({
        campo_procedimento_key: data.campoProcedimentoKey,
        campo_data_consulta_key: data.campoDataConsultaKey,
      })
      .eq("cliente_id", data.clienteId);
    if (error) throw new Error(`mapeamento: ${error.message}`);
    return { ok: true };
  });

/**
 * Sincronização de contatos: lê o app Elora página a página (100 por página,
 * pausa de 500ms entre páginas) e grava cada contato uma única vez, por
 * cliente + código do contato. O ponto de busca avança conforme as páginas
 * completam; a "última sincronização" só atualiza quando tudo termina —
 * se parar no meio (rede, rate limit), a próxima tentativa retoma de onde
 * parou, sem duplicar e sem recomeçar do zero.
 */
export const sincronizarIntegracaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select(
        "base_url, api_key, ativo, campo_procedimento_key, campo_data_consulta_key, ultima_sync, sync_janela_inicio, sync_paginas_ok",
      )
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    if (!conta) throw new Error("integracao: nenhuma chave configurada para este cliente.");
    if (!conta.ativo) throw new Error("integracao: a integração deste cliente está desligada.");
    if (!conta.campo_procedimento_key || !conta.campo_data_consulta_key) {
      throw new Error("sincronizar: configure o mapeamento de campos primeiro.");
    }

    const epoca = new Date(0).toISOString();
    const retomando = Boolean(conta.sync_janela_inicio);
    const janelaInicio = retomando
      ? String(conta.sync_janela_inicio)
      : conta.ultima_sync
        ? new Date(String(conta.ultima_sync)).toISOString()
        : epoca;
    const paginasPular = retomando ? Math.max(0, Number(conta.sync_paginas_ok ?? 0)) : 0;

    if (!retomando) {
      const { error } = await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ sync_janela_inicio: janelaInicio, sync_paginas_ok: 0, ultimo_erro: null })
        .eq("cliente_id", data.clienteId);
      if (error) throw new Error(`integracao: ${error.message}`);
    }

    try {
      let pagina = 0;
      let gravados = 0;
      for (;;) {
        pagina += 1;
        const resp = await lerApiElora(String(conta.base_url), String(conta.api_key), "/v1/contact/filter", {
          metodo: "POST",
          corpo: {
            pageNumber: pagina,
            pageSize: 100,
            createdAt: { after: janelaInicio, before: null },
            includeDetails: ["CustomFields"],
          },
        });

        const hasMore = Boolean((resp as any)?.hasMorePages);

        if (pagina <= paginasPular) {
          // Páginas já gravadas em tentativa anterior: só avança.
          if (!hasMore) break;
          continue;
        }

        const itens = (Array.isArray((resp as any)?.items) ? (resp as any).items : []) as any[];
        if (itens.length > 0) {
          const agora = new Date().toISOString();
          const linhas = itens
            .map((c: any) => {
              const custom = (c.customFields ?? {}) as Record<string, unknown>;
              const valor = (k: string) => {
                const v = custom[k];
                return v == null || v === "" ? null : String(v);
              };
              const utm = (c.utm ?? {}) as Record<string, unknown>;
              return {
                cliente_id: data.clienteId,
                contact_id: String(c.id ?? ""),
                nome: c.name ? String(c.name) : null,
                telefone: c.phoneNumber ? String(c.phoneNumber) : null,
                criado_em: c.createdAt ? String(c.createdAt) : null,
                utm_source: utm.source ? String(utm.source) : null,
                utm_medium: utm.medium ? String(utm.medium) : null,
                utm_campaign: utm.campaign ? String(utm.campaign) : null,
                procedimento_interesse: valor(String(conta.campo_procedimento_key)),
                data_consulta: valor(String(conta.campo_data_consulta_key)),
                sincronizado_em: agora,
              };
            })
            .filter((l) => l.contact_id.length > 0);

          if (linhas.length > 0) {
            const { error } = await supabaseAdmin
              .from("elora_contatos_sincronizados")
              .upsert(linhas, { onConflict: "cliente_id,contact_id" });
            if (error) throw new Error(`contatos: ${error.message}`);
            gravados += linhas.length;
          }
        }

        // Ponto de busca avança página a página: se parar aqui, retoma daqui.
        const { error: errPagina } = await supabaseAdmin
          .from("elora_integracao_contas")
          .update({ sync_paginas_ok: pagina })
          .eq("cliente_id", data.clienteId);
        if (errPagina) throw new Error(`integracao: ${errPagina.message}`);

        if (!hasMore || itens.length === 0) break;
        await new Promise((r) => setTimeout(r, 500));
      }

      const { error: errFim } = await supabaseAdmin
        .from("elora_integracao_contas")
        .update({
          ultima_sync: new Date().toISOString(),
          ultimo_erro: null,
          sync_janela_inicio: null,
          sync_paginas_ok: 0,
        })
        .eq("cliente_id", data.clienteId);
      if (errFim) throw new Error(`integracao: ${errFim.message}`);

      return { sincronizado: true as const, contatos: gravados, retomado: retomando };
    } catch (e) {
      const mensagem = `Falha ao sincronizar: ${e instanceof Error ? e.message : "falha desconhecida."}`;
      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ ultimo_erro: mensagem })
        .eq("cliente_id", data.clienteId);
      throw new Error(mensagem);
    }
  });

const resultadosSchema = z.object({
  clienteId: z.string().min(1),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pagina: z.number().int().min(1).default(1),
  porPagina: z.number().int().min(10).max(100).default(20),
});

/**
 * Painel "Resultados": contatos do período, lidos com a sessão do usuário —
 * a RLS da tabela permite só equipe interna, o próprio cliente ou o parceiro
 * com painel liberado. Nenhum custo, margem ou chave passa por aqui.
 */
export const getResultadosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => resultadosSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;

    const noPeriodo = (q: any) => {
      let x = q.eq("cliente_id", data.clienteId);
      if (data.de) x = x.gte("criado_em", `${data.de}T00:00:00Z`);
      if (data.ate) x = x.lte("criado_em", `${data.ate}T23:59:59.999Z`);
      return x;
    };

    const { count: total, error: errTotal } = await noPeriodo(
      db.from("elora_contatos_sincronizados").select("*", { count: "exact", head: true }),
    );
    if (errTotal) throw new Error(`resultados: ${errTotal.message}`);

    const { count: anuncio, error: errAnuncio } = await noPeriodo(
      db
        .from("elora_contatos_sincronizados")
        .select("*", { count: "exact", head: true })
        .not("utm_source", "is", null),
    );
    if (errAnuncio) throw new Error(`resultados: ${errAnuncio.message}`);

    const de = (data.pagina - 1) * data.porPagina;
    const { data: rows, error } = await noPeriodo(db.from("elora_contatos_sincronizados").select("*"))
      .order("criado_em", { ascending: false, nullsFirst: false })
      .range(de, de + data.porPagina - 1);
    if (error) throw new Error(`resultados: ${error.message}`);

    return {
      total: total ?? 0,
      anuncio: anuncio ?? 0,
      pagina: data.pagina,
      porPagina: data.porPagina,
      totalPaginas: Math.max(1, Math.ceil((total ?? 0) / data.porPagina)),
      contatos: ((rows ?? []) as any[]).map((c) => ({
        id: String(c.id),
        nome: (c.nome as string) ?? null,
        telefone: (c.telefone as string) ?? null,
        criadoEm: c.criado_em ? String(c.criado_em) : null,
        utmSource: (c.utm_source as string) ?? null,
        utmMedium: (c.utm_medium as string) ?? null,
        utmCampaign: (c.utm_campaign as string) ?? null,
        procedimento: (c.procedimento_interesse as string) ?? null,
        dataConsulta: (c.data_consulta as string) ?? null,
      })),
    };
  });
