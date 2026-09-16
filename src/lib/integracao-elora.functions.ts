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

export type FiltrosElora = {
  usuarios: string[];
  etiquetas: string[];
  campoPersonalizado: { chave: string; valor: string } | null;
  etapasFunil: string[];
  campanha: string | null;
};

type IntegracaoVisivel = {
  clienteId: string;
  configurada: boolean;
  ativo: boolean;
  baseUrl: string | null;
  chaveMascarada: string | null;
  campoProcedimentoKey: string | null;
  campoDataConsultaKey: string | null;
  filtros: FiltrosElora;
  retomadaPendente: boolean;
  ultimaSync: string | null;
  ultimaSyncConversas: string | null;
  ultimoErro: string | null;
};

const listaTexto = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];


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
      .select("*")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();

    const semFiltros: FiltrosElora = {
      usuarios: [],
      etiquetas: [],
      campoPersonalizado: null,
      etapasFunil: [],
      campanha: null,
    };

    if (!conta) {
      return {
        clienteId: data.clienteId,
        configurada: false,
        ativo: false,
        baseUrl: null,
        chaveMascarada: null,
        campoProcedimentoKey: null,
        campoDataConsultaKey: null,
        filtros: semFiltros,
        retomadaPendente: false,
        ultimaSync: null,
        ultimaSyncConversas: null,
        ultimoErro: null,
      };
    }

    const c = conta as any;
    const campo = c.filtro_campo_personalizado as any;

    return {
      clienteId: c.cliente_id,
      configurada: true,
      ativo: Boolean(c.ativo),
      baseUrl: c.base_url,
      chaveMascarada: mascaraChave(String(c.api_key)),
      campoProcedimentoKey: c.campo_procedimento_key ? String(c.campo_procedimento_key) : null,
      campoDataConsultaKey: c.campo_data_consulta_key ? String(c.campo_data_consulta_key) : null,
      filtros: {
        usuarios: listaTexto(c.filtro_usuarios),
        etiquetas: listaTexto(c.filtro_etiquetas),
        campoPersonalizado:
          campo && typeof campo === "object" && campo.chave
            ? { chave: String(campo.chave), valor: String(campo.valor ?? "") }
            : null,
        etapasFunil: listaTexto(c.filtro_etapas_funil),
        campanha: c.filtro_campanha ? String(c.filtro_campanha) : null,
      },
      retomadaPendente: Boolean(c.sync_janela_inicio),
      ultimaSync: c.ultima_sync ? String(c.ultima_sync) : null,
      ultimaSyncConversas: c.sync_conversas_ultima ? String(c.sync_conversas_ultima) : null,
      ultimoErro: c.ultimo_erro ? String(c.ultimo_erro) : null,
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
          base_url: data.baseUrl.replace(/\/+$/, "").replace(/\/(core|crm|chat)$/i, ""),
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

type ServicoElora = "core" | "crm" | "chat";

/**
 * O "Endereço da conta" guarda só o domínio raiz (ex.: https://api.wts.chat).
 * Contatos/campos/etiquetas vivem em /core, painéis em /crm, sequências e
 * conversas em /chat. Contas antigas podem ter um sufixo residual salvo —
 * removemos aqui para nada quebrar antes da normalização.
 */
const normalizarRaiz = (baseUrl: string) =>
  baseUrl.replace(/\/+$/, "").replace(/\/(core|crm|chat)$/i, "");

async function lerApiElora(
  baseUrl: string,
  apiKey: string,
  servico: ServicoElora,
  caminho: string,
  opts: { metodo?: "GET" | "POST"; corpo?: unknown } = {},
): Promise<Record<string, unknown>> {
  const url = `${normalizarRaiz(baseUrl)}/${servico}${caminho}`;
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

    const texto = await resposta.text();
    let corpo: unknown = null;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      throw new Error(
        "O endereço informado não é o da API da conta — a resposta veio como página do site, não como dados.",
      );
    }

    if (!resposta.ok) {
      const chave = String((corpo as any)?.key ?? "");
      if (chave === "ERROR_UNAUTHORIZED" || resposta.status === 401 || resposta.status === 403) {
        throw new Error(
          `A conta recusou o acesso a ${caminho.split("?")[0]}. Verifique se a chave de API tem permissão para esse recurso nas configurações da conta.`,
        );
      }
      if (resposta.status === 404) {
        throw new Error(`O app Elora não reconheceu o endereço ${caminho.split("?")[0]} nesta conta.`);
      }
      throw new Error(`O app Elora respondeu com erro (${resposta.status}). Tente novamente.`);
    }
    return corpo as Record<string, unknown>;
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
      // Chamada real e barata de leitura: confirma endereço + chave de uma vez.
      await lerApiElora(
        String(conta.base_url),
        String(conta.api_key),
        "core",
        "/v1/contact/custom-field?NestedList=false",
      );

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
      "core",
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
      .select("*")
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

    // Filtros salvos do cliente: vazio = sem restrição.
    const fUsuarios = listaTexto((conta as any).filtro_usuarios);
    const fEtiquetas = listaTexto((conta as any).filtro_etiquetas);
    const fEtapas = listaTexto((conta as any).filtro_etapas_funil);
    const fCampanha = (conta as any).filtro_campanha ? String((conta as any).filtro_campanha) : null;
    const fCampo = (conta as any).filtro_campo_personalizado as any;

    try {
      let pagina = 0;
      let gravados = 0;
      for (;;) {
        pagina += 1;
        const resp = await lerApiElora(String(conta.base_url), String(conta.api_key), "core", "/v1/contact/filter", {
          metodo: "POST",
          corpo: {
            pageNumber: pagina,
            pageSize: 100,
            createdAt: { after: janelaInicio, before: null },
            includeDetails: ["CustomFields"],
            ...(fUsuarios.length > 0 ? { userIds: fUsuarios } : {}),
            ...(fEtiquetas.length > 0 ? { tagIds: fEtiquetas } : {}),
            ...(fEtapas.length > 0 ? { stepIds: fEtapas } : {}),
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
            .filter((c: any) => {
              if (fCampanha) {
                const camp = String(c?.utm?.campaign ?? "");
                if (!camp.toLowerCase().includes(fCampanha.toLowerCase())) return false;
              }
              if (fCampo?.chave) {
                const v = (c.customFields ?? {})[fCampo.chave];
                const alvo = String(fCampo.valor ?? "").trim();
                if (alvo && String(v ?? "").toLowerCase() !== alvo.toLowerCase()) return false;
                if (!alvo && (v == null || v === "")) return false;
              }
              return true;
            })
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

    // Mesmo trio de permissões de painel_cliente_dados(): equipe interna,
    // o próprio cliente, ou parceiro com painel liberado.
    const [{ data: interno }, { data: meuCliente }, { data: parceiroOk }] = await Promise.all([
      db.rpc("is_equipe_interna"),
      db.rpc("cliente_do_usuario"),
      db.rpc("parceiro_pode_ver_painel", { _cliente_id: data.clienteId }),
    ]);
    const podeVer = Boolean(interno) || meuCliente === data.clienteId || Boolean(parceiroOk);
    if (!podeVer) throw new Error("acesso-negado: este painel não está liberado para você.");

    const inicio = data.de ? `${data.de}T00:00:00Z` : null;
    const fim = data.ate ? `${data.ate}T23:59:59.999Z` : null;

    const noPeriodo = (q: any, coluna = "criado_em") => {
      let x = q.eq("cliente_id", data.clienteId);
      if (inicio) x = x.gte(coluna, inicio);
      if (fim) x = x.lte(coluna, fim);
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

    // Ranking de campanhas: agregado a partir dos contatos já sincronizados.
    const { data: comCampanha } = await noPeriodo(
      db
        .from("elora_contatos_sincronizados")
        .select("utm_campaign, utm_source, utm_medium")
        .not("utm_campaign", "is", null),
    ).limit(5000);

    const mapa = new Map<
      string,
      { campanha: string; source: string | null; medium: string | null; leads: number }
    >();
    for (const c of (comCampanha ?? []) as any[]) {
      const nome = String(c.utm_campaign ?? "").trim();
      if (!nome) continue;
      const atual = mapa.get(nome) ?? { campanha: nome, source: null, medium: null, leads: 0 };
      atual.leads += 1;
      atual.source = atual.source ?? (c.utm_source ? String(c.utm_source) : null);
      atual.medium = atual.medium ?? (c.utm_medium ? String(c.utm_medium) : null);
      mapa.set(nome, atual);
    }
    const ranking = [...mapa.values()].sort((a, b) => b.leads - a.leads).slice(0, 20);

    // Conversas do período (já sincronizadas, sem tocar a API) — com tempos e contato.
    const { data: conversas } = await noPeriodo(
      db
        .from("elora_conversas_classificadas")
        .select("category_name, teve_resposta, contato_id, criado_em, time_wait_segundos, time_service_segundos"),
    ).limit(20000);

    const linhasConversa = (conversas ?? []) as any[];

    // Contatos com anúncio, para o "% de anúncio" dentro dos blocos de rótulo.
    const { data: contatosAnuncio } = await db
      .from("elora_contatos_sincronizados")
      .select("contact_id")
      .eq("cliente_id", data.clienteId)
      .not("utm_source", "is", null)
      .limit(20000);
    const setAnuncio = new Set(((contatosAnuncio ?? []) as any[]).map((c) => String(c.contact_id)));

    let conversasComResposta = 0;
    let somaEspera = 0, nEspera = 0, somaAtend = 0, nAtend = 0;
    const porClassificacao = new Map<string, { qtd: number; anuncio: number }>();
    const porMesClasse = new Map<string, number>(); // "YYYY-MMclasse"
    for (const s of linhasConversa) {
      if (s.teve_resposta) conversasComResposta += 1;
      if (typeof s.time_wait_segundos === "number") { somaEspera += s.time_wait_segundos; nEspera += 1; }
      if (typeof s.time_service_segundos === "number") { somaAtend += s.time_service_segundos; nAtend += 1; }
      const nome = s.category_name ? String(s.category_name) : "";
      if (!nome) continue;
      const atual = porClassificacao.get(nome) ?? { qtd: 0, anuncio: 0 };
      atual.qtd += 1;
      if (s.contato_id && setAnuncio.has(String(s.contato_id))) atual.anuncio += 1;
      porClassificacao.set(nome, atual);
      if (s.criado_em) {
        const mes = String(s.criado_em).slice(0, 7);
        porMesClasse.set(`${mes}${nome}`, (porMesClasse.get(`${mes}${nome}`) ?? 0) + 1);
      }
    }

    // Configuração das peças: quais rótulos alimentam blocos e séries.
    // Lida só depois da checagem de permissão; rótulos de outro cliente são
    // ignorados (tratados como "não configurado") mesmo se um dado antigo
    // estiver incorreto.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select(
        "bloco2_rotulo_id, bloco3_rotulo_id, grafico1_serie1_rotulo_id, grafico1_serie2_rotulo_id, grafico2_serie1_rotulo_id, grafico2_serie2_rotulo_id",
      )
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    const cfg = (conta as any) ?? {};
    const idsConfig = [
      cfg.bloco2_rotulo_id, cfg.bloco3_rotulo_id,
      cfg.grafico1_serie1_rotulo_id, cfg.grafico1_serie2_rotulo_id,
      cfg.grafico2_serie1_rotulo_id, cfg.grafico2_serie2_rotulo_id,
    ].filter((x): x is string => Boolean(x));

    const rotuloInfo = new Map<string, { nome: string; valores: Set<string> }>();
    if (idsConfig.length > 0) {
      const { data: rotulos } = await supabaseAdmin
        .from("elora_classificacoes_rotulos")
        .select("id, nome, cliente_id")
        .in("id", idsConfig)
        .eq("cliente_id", data.clienteId); // mesma conta ou nada
      const okIds = ((rotulos ?? []) as any[]).map((r) => String(r.id));
      const { data: valores } = okIds.length
        ? await supabaseAdmin
            .from("elora_classificacoes_rotulo_valores")
            .select("rotulo_id, valor_bruto")
            .in("rotulo_id", okIds)
        : { data: [] as any[] };
      for (const r of (rotulos ?? []) as any[]) {
        rotuloInfo.set(String(r.id), {
          nome: String(r.nome),
          valores: new Set(
            ((valores ?? []) as any[])
              .filter((v) => String(v.rotulo_id) === String(r.id))
              .map((v) => String(v.valor_bruto)),
          ),
        });
      }
    }

    const blocoDoRotulo = (rotuloId: string | null | undefined) => {
      const info = rotuloId ? rotuloInfo.get(String(rotuloId)) : undefined;
      if (!info) return { rotulo: null as string | null, quantidade: 0, anuncio: 0 };
      let qtd = 0, anuncioBloco = 0;
      for (const v of info.valores) {
        const a = porClassificacao.get(v);
        if (a) { qtd += a.qtd; anuncioBloco += a.anuncio; }
      }
      return { rotulo: info.nome, quantidade: qtd, anuncio: anuncioBloco };
    };

    // Séries mensais (últimos 12 meses) por rótulo.
    const meses: string[] = [];
    {
      const base = new Date();
      base.setUTCDate(1);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
        meses.push(d.toISOString().slice(0, 7));
      }
    }
    const serieDoRotulo = (rotuloId: string | null | undefined) => {
      const info = rotuloId ? rotuloInfo.get(String(rotuloId)) : undefined;
      return {
        rotulo: info?.nome ?? null,
        valores: meses.map((mes) =>
          info
            ? [...info.valores].reduce((acc, v) => acc + (porMesClasse.get(`${mes}${v}`) ?? 0), 0)
            : 0,
        ),
      };
    };

    const medias = (soma: number, n: number) =>
      n > 0 ? { segundos: Math.round(soma / n), conversas: n } : null;

    return {
      total: total ?? 0,
      anuncio: anuncio ?? 0,
      pagina: data.pagina,
      porPagina: data.porPagina,
      totalPaginas: Math.max(1, Math.ceil((total ?? 0) / data.porPagina)),
      bloco2: blocoDoRotulo(cfg.bloco2_rotulo_id),
      bloco3: blocoDoRotulo(cfg.bloco3_rotulo_id),
      conversasRealizadas: conversasComResposta,
      conversasTotal: linhasConversa.length,
      tempoPrimeiraResposta: medias(somaEspera, nEspera),
      tempoAtendimento: medias(somaAtend, nAtend),
      graficos: {
        meses,
        g1s1: serieDoRotulo(cfg.grafico1_serie1_rotulo_id),
        g1s2: serieDoRotulo(cfg.grafico1_serie2_rotulo_id),
        g2s1: serieDoRotulo(cfg.grafico2_serie1_rotulo_id),
        g2s2: serieDoRotulo(cfg.grafico2_serie2_rotulo_id),
      },
      ranking,
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

/* ------------------------------------------------------------------ *
 * Exploração da conta: painéis, sequências, usuários, etiquetas e
 * classificações. Tudo passa pela mesma trava de equipe interna.
 * ------------------------------------------------------------------ */

async function contaDoCliente(clienteId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conta } = await supabaseAdmin
    .from("elora_integracao_contas")
    .select("*")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!conta) throw new Error("integracao: nenhuma chave configurada para este cliente.");
  return { conta: conta as any, supabaseAdmin };
}

const listaDe = (resp: unknown): any[] => {
  if (Array.isArray(resp)) return resp;
  const r = resp as any;
  if (Array.isArray(r?.items)) return r.items;
  if (Array.isArray(r?.data)) return r.data;
  return [];
};

const soClienteId = z.object({ clienteId: z.string().min(1) });

export type PainelElora = {
  id: string;
  titulo: string;
  tipo: string | null;
  etapas: { id: string; nome: string }[];
};

/** Painéis (funis) da conta, com as etapas de cada um. */
export const listarPaineisCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<{ paineis: PainelElora[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { conta, supabaseAdmin } = await contaDoCliente(data.clienteId);

    const paineis: PainelElora[] = [];
    for (let pagina = 1; pagina <= 20; pagina++) {
      const resp = await lerApiElora(
        String(conta.base_url),
        String(conta.api_key),
        "crm",
        `/v2/panel?PageNumber=${pagina}&PageSize=50&IncludeDetails=Steps`,
      );
      const itens = listaDe(resp);
      for (const p of itens) {
        paineis.push({
          id: String(p.id ?? ""),
          titulo: String(p.title ?? p.name ?? "Sem título"),
          tipo: p.type ? String(p.type) : null,
          etapas: (Array.isArray(p.steps) ? p.steps : []).map((s: any) => ({
            id: String(s.id ?? ""),
            nome: String(s.title ?? s.name ?? s.id ?? ""),
          })),
        });
      }
      if (!(resp as any)?.hasMorePages || itens.length === 0) break;
      await new Promise((r) => setTimeout(r, 400));
    }

    if (paineis.length > 0) {
      const agora = new Date().toISOString();
      await supabaseAdmin.from("elora_paineis_sincronizados").upsert(
        paineis.map((p) => ({
          cliente_id: data.clienteId,
          painel_id: p.id,
          titulo: p.titulo,
          tipo: p.tipo,
          etapas: p.etapas as never,
          sincronizado_em: agora,
        })),
        { onConflict: "cliente_id,painel_id" },
      );
    }

    return { paineis };
  });

/** Campos personalizados de um painel específico. */
export const listarCamposDoPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clienteId: z.string().min(1), painelId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ campos: CampoElora[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { conta, supabaseAdmin } = await contaDoCliente(data.clienteId);

    const resp = await lerApiElora(
      String(conta.base_url),
      String(conta.api_key),
      "crm",
      `/v1/panel/${encodeURIComponent(data.painelId)}/custom-fields`,
    );
    const campos = listaDe(resp)
      .map((c: any) => ({
        chave: String(c.key ?? c.id ?? ""),
        nome: String(c.label ?? c.name ?? c.title ?? c.key ?? c.id ?? ""),
      }))
      .filter((c) => c.chave.length > 0);

    await supabaseAdmin
      .from("elora_paineis_sincronizados")
      .update({ campos_personalizados: campos as never })
      .eq("cliente_id", data.clienteId)
      .eq("painel_id", data.painelId);

    return { campos };
  });

/** Sequências da conta. */
export const listarSequenciasCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<{ sequencias: { id: string; nome: string }[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { conta, supabaseAdmin } = await contaDoCliente(data.clienteId);

    const sequencias: { id: string; nome: string }[] = [];
    for (let pagina = 1; pagina <= 20; pagina++) {
      const resp = await lerApiElora(
        String(conta.base_url),
        String(conta.api_key),
        "chat",
        `/v1/sequence?PageNumber=${pagina}&PageSize=50`,
      );
      const itens = listaDe(resp);
      for (const s of itens) {
        sequencias.push({ id: String(s.id ?? ""), nome: String(s.name ?? s.title ?? s.id ?? "") });
      }
      if (!(resp as any)?.hasMorePages || itens.length === 0) break;
      await new Promise((r) => setTimeout(r, 400));
    }

    if (sequencias.length > 0) {
      const agora = new Date().toISOString();
      await supabaseAdmin.from("elora_sequencias_sincronizadas").upsert(
        sequencias.map((s) => ({
          cliente_id: data.clienteId,
          sequencia_id: s.id,
          nome: s.nome,
          sincronizado_em: agora,
        })),
        { onConflict: "cliente_id,sequencia_id" },
      );
    }

    return { sequencias };
  });

/** Usuários da conta (para o filtro). */
export const listarUsuariosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<{ usuarios: { id: string; nome: string }[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { conta } = await contaDoCliente(data.clienteId);
    const resp = await lerApiElora(String(conta.base_url), String(conta.api_key), "core", "/v1/user?PageSize=200");
    const usuarios = listaDe(resp)
      .map((u: any) => ({
        id: String(u.id ?? ""),
        nome: String(u.name ?? u.displayName ?? u.email ?? u.id ?? ""),
      }))
      .filter((u) => u.id.length > 0);
    return { usuarios };
  });

/** Etiquetas da conta (para o filtro). */
export const listarEtiquetasCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<{ etiquetas: { id: string; nome: string }[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { conta } = await contaDoCliente(data.clienteId);
    const resp = await lerApiElora(String(conta.base_url), String(conta.api_key), "core", "/v1/tag?PageSize=200");
    const etiquetas = listaDe(resp)
      .map((t: any) => ({ id: String(t.id ?? ""), nome: String(t.name ?? t.title ?? t.id ?? "") }))
      .filter((t) => t.id.length > 0);
    return { etiquetas };
  });

/**
 * Classificações usadas recentemente (amostra dos últimos 90 dias, até 500
 * conversas). Não existe catálogo de classificações na API — são texto livre.
 */
export const listarClassificacoesRecentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<{ classificacoes: string[]; conversas: number }> => {
    await exigirEquipeInterna(context.supabase);
    const { conta, supabaseAdmin } = await contaDoCliente(data.clienteId);

    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const nomes = new Set<string>();
    let vistas = 0;

    for (let pagina = 1; pagina <= 5; pagina++) {
      const resp = await lerApiElora(
        String(conta.base_url),
        String(conta.api_key),
        "chat",
        `/v2/session?PageNumber=${pagina}&PageSize=100&StartDate=${encodeURIComponent(desde)}&IncludeDetails=ClassificationDetails`,
      );
      const itens = listaDe(resp);
      vistas += itens.length;
      for (const s of itens) {
        const nome = s?.classification?.categoryName ?? s?.classificationDetails?.categoryName ?? null;
        if (nome && String(nome).trim()) nomes.add(String(nome).trim());
      }
      if (!(resp as any)?.hasMorePages || itens.length === 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    const lista = [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (lista.length > 0) {
      await supabaseAdmin.from("elora_classificacoes_descobertas").upsert(
        lista.map((valor_bruto) => ({ cliente_id: data.clienteId, valor_bruto })),
        { onConflict: "cliente_id,valor_bruto" },
      );
    }

    // Une com o que já foi descoberto em sincronizações anteriores — a amostra
    // ao vivo dos últimos 90 dias pode não trazer valores antigos ainda úteis.
    const { data: guardadas } = await supabaseAdmin
      .from("elora_classificacoes_descobertas")
      .select("valor_bruto")
      .eq("cliente_id", data.clienteId)
      .order("valor_bruto");
    for (const g of (guardadas ?? []) as any[]) {
      if (g.valor_bruto) nomes.add(String(g.valor_bruto));
    }

    return {
      classificacoes: [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")),
      conversas: vistas,
    };
  });

/* ------------------------------------------------------------------ *
 * Rótulos de classificação: agrupam valores brutos (texto livre da
 * equipe) sob um nome próprio. Cada peça do dashboard aponta para um
 * rótulo — nada de regra fixa.
 * ------------------------------------------------------------------ */

export type RotuloClassificacao = { id: string; nome: string; valores: string[] };

export const listarRotulosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<{ rotulos: RotuloClassificacao[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rotulos, error } = await supabaseAdmin
      .from("elora_classificacoes_rotulos")
      .select("id, nome")
      .eq("cliente_id", data.clienteId)
      .order("nome");
    if (error) throw new Error(`rotulos: ${error.message}`);

    const ids = (rotulos ?? []).map((r: any) => r.id);
    const { data: valores } = ids.length
      ? await supabaseAdmin
          .from("elora_classificacoes_rotulo_valores")
          .select("rotulo_id, valor_bruto")
          .in("rotulo_id", ids)
      : { data: [] as any[] };

    const porRotulo = new Map<string, string[]>();
    for (const v of (valores ?? []) as any[]) {
      const arr = porRotulo.get(String(v.rotulo_id)) ?? [];
      arr.push(String(v.valor_bruto));
      porRotulo.set(String(v.rotulo_id), arr);
    }

    return {
      rotulos: ((rotulos ?? []) as any[]).map((r) => ({
        id: String(r.id),
        nome: String(r.nome),
        valores: (porRotulo.get(String(r.id)) ?? []).sort((a, b) => a.localeCompare(b, "pt-BR")),
      })),
    };
  });

const rotuloSchema = z.object({
  clienteId: z.string().min(1),
  rotuloId: z.string().uuid().nullable().default(null),
  nome: z.string().trim().min(1).max(120),
  valores: z.array(z.string().trim().min(1).max(200)).max(200).default([]),
});

/** Cria ou atualiza um rótulo e os valores brutos associados. */
export const salvarRotuloCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => rotuloSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ rotuloId: string }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let rotuloId = data.rotuloId;
    if (rotuloId) {
      const { error } = await supabaseAdmin
        .from("elora_classificacoes_rotulos")
        .update({ nome: data.nome })
        .eq("id", rotuloId)
        .eq("cliente_id", data.clienteId);
      if (error) throw new Error(`rotulos: ${error.message}`);
    } else {
      const { data: criado, error } = await supabaseAdmin
        .from("elora_classificacoes_rotulos")
        .insert({ cliente_id: data.clienteId, nome: data.nome })
        .select("id")
        .single();
      if (error) throw new Error(`rotulos: ${error.message}`);
      rotuloId = String(criado.id);
    }

    const { error: errDel } = await supabaseAdmin
      .from("elora_classificacoes_rotulo_valores")
      .delete()
      .eq("rotulo_id", rotuloId);
    if (errDel) throw new Error(`rotulos: ${errDel.message}`);

    const unicos = [...new Set(data.valores)];
    if (unicos.length > 0) {
      const { error: errIns } = await supabaseAdmin
        .from("elora_classificacoes_rotulo_valores")
        .insert(unicos.map((valor_bruto) => ({ rotulo_id: rotuloId, valor_bruto })));
      if (errIns) throw new Error(`rotulos: ${errIns.message}`);
    }

    return { rotuloId };
  });

/** Exclui um rótulo. As peças do dashboard que o usavam ficam sem rótulo. */
export const excluirRotuloCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clienteId: z.string().min(1), rotuloId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Limpa antes os seletores que apontam para o rótulo (a chave estrangeira
    // composta bloqueia a exclusão enquanto houver referência).
    await supabaseAdmin
      .from("elora_integracao_contas")
      .update({
        bloco2_rotulo_id: null,
        bloco3_rotulo_id: null,
        grafico1_serie1_rotulo_id: null,
        grafico1_serie2_rotulo_id: null,
        grafico2_serie1_rotulo_id: null,
        grafico2_serie2_rotulo_id: null,
      } as never)
      .eq("cliente_id", data.clienteId)
      .or(
        `bloco2_rotulo_id.eq.${data.rotuloId},bloco3_rotulo_id.eq.${data.rotuloId},grafico1_serie1_rotulo_id.eq.${data.rotuloId},grafico1_serie2_rotulo_id.eq.${data.rotuloId},grafico2_serie1_rotulo_id.eq.${data.rotuloId},grafico2_serie2_rotulo_id.eq.${data.rotuloId}`,
      );

    return { ok: true };
  });

export type ConfigDashboard = {
  bloco2: string | null;
  bloco3: string | null;
  grafico1Serie1: string | null;
  grafico1Serie2: string | null;
  grafico2Serie1: string | null;
  grafico2Serie2: string | null;
};

/** Lê a configuração das peças do dashboard (quais rótulos alimentam cada uma). */
export const getConfigDashboardCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }): Promise<ConfigDashboard> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select(
        "bloco2_rotulo_id, bloco3_rotulo_id, grafico1_serie1_rotulo_id, grafico1_serie2_rotulo_id, grafico2_serie1_rotulo_id, grafico2_serie2_rotulo_id",
      )
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    const c = conta as any;
    return {
      bloco2: c?.bloco2_rotulo_id ?? null,
      bloco3: c?.bloco3_rotulo_id ?? null,
      grafico1Serie1: c?.grafico1_serie1_rotulo_id ?? null,
      grafico1Serie2: c?.grafico1_serie2_rotulo_id ?? null,
      grafico2Serie1: c?.grafico2_serie1_rotulo_id ?? null,
      grafico2Serie2: c?.grafico2_serie2_rotulo_id ?? null,
    };
  });

const configSchema = z.object({
  clienteId: z.string().min(1),
  bloco2: z.string().uuid().nullable().default(null),
  bloco3: z.string().uuid().nullable().default(null),
  grafico1Serie1: z.string().uuid().nullable().default(null),
  grafico1Serie2: z.string().uuid().nullable().default(null),
  grafico2Serie1: z.string().uuid().nullable().default(null),
  grafico2Serie2: z.string().uuid().nullable().default(null),
});

/**
 * Salva quais rótulos alimentam cada peça. Confere no servidor que todo
 * rótulo informado pertence ao mesmo cliente — e o banco ainda reforça com
 * chave estrangeira composta (cliente_id + rotulo_id).
 */
export const salvarConfigDashboardCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [
      data.bloco2,
      data.bloco3,
      data.grafico1Serie1,
      data.grafico1Serie2,
      data.grafico2Serie1,
      data.grafico2Serie2,
    ].filter((x): x is string => Boolean(x));

    if (ids.length > 0) {
      const { data: rotulos } = await supabaseAdmin
        .from("elora_classificacoes_rotulos")
        .select("id, cliente_id")
        .in("id", ids);
      const pertencem = new Set(
        ((rotulos ?? []) as any[])
          .filter((r) => r.cliente_id === data.clienteId)
          .map((r) => String(r.id)),
      );
      if (ids.some((id) => !pertencem.has(id))) {
        throw new Error("rotulos: um dos rótulos escolhidos não pertence a este cliente.");
      }
    }

    const { error } = await supabaseAdmin
      .from("elora_integracao_contas")
      .update({
        bloco2_rotulo_id: data.bloco2,
        bloco3_rotulo_id: data.bloco3,
        grafico1_serie1_rotulo_id: data.grafico1Serie1,
        grafico1_serie2_rotulo_id: data.grafico1Serie2,
        grafico2_serie1_rotulo_id: data.grafico2Serie1,
        grafico2_serie2_rotulo_id: data.grafico2Serie2,
      } as never)
      .eq("cliente_id", data.clienteId);
    if (error) throw new Error(`dashboard: ${error.message}`);
    return { ok: true };
  });

/** "HH:MM:SS" (horas podem passar de 24) → segundos. Formato inesperado vira nulo. */
const duracaoParaSegundos = (v: unknown): number | null => {
  if (typeof v !== "string") return null;
  const m = /^(\d+):(\d{1,2}):(\d{1,2})(?:\.\d+)?$/.exec(v.trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

/** Salva os filtros do cliente (valem para sincronização e painel). */
export const salvarFiltrosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        clienteId: z.string().min(1),
        usuarios: z.array(z.string()).max(200).default([]),
        etiquetas: z.array(z.string()).max(200).default([]),
        campoPersonalizado: z
          .object({ chave: z.string().max(200), valor: z.string().max(400) })
          .nullable()
          .default(null),
        etapasFunil: z.array(z.string()).max(200).default([]),
        campanha: z.string().trim().max(200).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("elora_integracao_contas")
      .update({
        filtro_usuarios: data.usuarios as never,
        filtro_etiquetas: data.etiquetas as never,
        filtro_campo_personalizado: (data.campoPersonalizado?.chave
          ? data.campoPersonalizado
          : null) as never,
        filtro_etapas_funil: data.etapasFunil as never,
        filtro_campanha: data.campanha && data.campanha.length > 0 ? data.campanha : null,
      })
      .eq("cliente_id", data.clienteId);
    if (error) throw new Error(`filtros: ${error.message}`);
    return { ok: true };
  });

/**
 * Sincronização de conversas/classificações — separada e opcional.
 * Incremental: busca só o que mudou desde a última conclusão (na primeira vez,
 * os últimos 90 dias). Grava por (cliente, sessão) com upsert, então rodar
 * duas vezes não infla as contagens.
 */
export const sincronizarConversasCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soClienteId.parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { conta, supabaseAdmin } = await contaDoCliente(data.clienteId);
    if (!conta.ativo) throw new Error("integracao: a integração deste cliente está desligada.");

    const desde = conta.sync_conversas_ultima
      ? new Date(String(conta.sync_conversas_ultima)).toISOString()
      : new Date(Date.now() - 90 * 86_400_000).toISOString();

    try {
      let gravadas = 0;
      for (let pagina = 1; pagina <= 100; pagina++) {
        const resp = await lerApiElora(
          String(conta.base_url),
          String(conta.api_key),
          "chat",
          `/v2/session?PageNumber=${pagina}&PageSize=100&StartDate=${encodeURIComponent(desde)}&IncludeDetails=ClassificationDetails`,
        );
        const itens = listaDe(resp);
        if (itens.length === 0) break;

        const agora = new Date().toISOString();
        const nomesNovos = new Set<string>();
        const linhas = itens
          .map((s: any) => {
            const cls = s.classification ?? s.classificationDetails ?? {};
            const nomeCls = cls.categoryName ? String(cls.categoryName).trim() : "";
            if (nomeCls) nomesNovos.add(nomeCls);
            // Conversa com resposta = ao menos uma mensagem do contato e uma
            // da equipe. Usa os marcadores de última mensagem como referência.
            const recebeu = Boolean(s.lastMessageIn);
            const respondeu = Boolean(s.lastMessageOut ?? s.hasAnswer ?? s.answered);
            return {
              cliente_id: data.clienteId,
              sessao_id: String(s.id ?? ""),
              contato_id: s.contactId ? String(s.contactId) : null,
              category: cls.category ? String(cls.category) : null,
              category_name: nomeCls || null,
              criado_em: s.createdAt ? String(s.createdAt) : null,
              atualizado_em: s.updatedAt ? String(s.updatedAt) : null,
              first_response_at: s.firstResponseAt ? String(s.firstResponseAt) : null,
              time_wait_segundos: duracaoParaSegundos(s.timeWait),
              time_service_segundos: duracaoParaSegundos(s.timeService),
              teve_resposta: recebeu && respondeu,
              sincronizado_em: agora,
            };
          })
          .filter((l) => l.sessao_id.length > 0);

        if (nomesNovos.size > 0) {
          await supabaseAdmin.from("elora_classificacoes_descobertas").upsert(
            [...nomesNovos].map((valor_bruto) => ({ cliente_id: data.clienteId, valor_bruto })),
            { onConflict: "cliente_id,valor_bruto" },
          );
        }

        if (linhas.length > 0) {
          const { error } = await supabaseAdmin
            .from("elora_conversas_classificadas")
            .upsert(linhas as never, { onConflict: "cliente_id,sessao_id" });
          if (error) throw new Error(`conversas: ${error.message}`);
          gravadas += linhas.length;
        }

        if (!(resp as any)?.hasMorePages) break;
        await new Promise((r) => setTimeout(r, 500));
      }

      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ sync_conversas_ultima: new Date().toISOString(), ultimo_erro: null })
        .eq("cliente_id", data.clienteId);

      return { sincronizado: true as const, conversas: gravadas };
    } catch (e) {
      const mensagem = `Falha ao sincronizar conversas: ${e instanceof Error ? e.message : "falha desconhecida."}`;
      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ ultimo_erro: mensagem })
        .eq("cliente_id", data.clienteId);
      throw new Error(mensagem);
    }
  });

