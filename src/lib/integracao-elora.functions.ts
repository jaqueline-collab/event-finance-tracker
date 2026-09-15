import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Integração com o app Elora (uso real + resultados de atendimento, por cliente).
 *
 * Segurança combinada:
 * - a tabela `elora_integracao_contas` não tem GRANT para logins comuns —
 *   nenhum SELECT do navegador alcança a chave;
 * - toda função aqui exige equipe interna ANTES de carregar a credencial de
 *   serviço, que é a única que lê `api_key` em claro;
 * - nada retorna a chave para o navegador — no máximo `••••últimos 4`.
 */

type IntegracaoVisivel = {
  clienteId: string;
  configurada: boolean;
  ativo: boolean;
  baseUrl: string | null;
  chaveMascarada: string | null;
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
      .select("cliente_id, base_url, api_key, ativo, ultima_sync, ultimo_erro")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();

    if (!conta) {
      return {
        clienteId: data.clienteId,
        configurada: false,
        ativo: false,
        baseUrl: null,
        chaveMascarada: null,
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
 * Centraliza base + autenticação + tempo-limite + erro amigável, e devolve um
 * formato próprio do Elora CRM — a tela nunca depende do formato do fornecedor.
 */
async function lerApiElora(
  baseUrl: string,
  apiKey: string,
  caminho: string,
): Promise<Record<string, unknown>> {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 12_000);
  try {
    const resposta = await fetch(`${baseUrl}${caminho}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controlador.signal,
    });
    if (!resposta.ok) {
      throw new Error(
        resposta.status === 401 || resposta.status === 403
          ? "A chave de API foi recusada pelo app Elora. Confira a chave da conta."
          : `O app Elora respondeu com erro (${resposta.status}). Tente novamente.`,
      );
    }
    return (await resposta.json()) as Record<string, unknown>;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("O app Elora demorou demais para responder. Tente novamente.");
    }
    throw e;
  } finally {
    clearTimeout(limite);
  }
}

/** Testa a conexão com a conta do cliente. Não grava snapshot. */
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

/**
 * Ponto de atualização: lê uso e indicadores de um cliente no app Elora e
 * grava o snapshot do dia. Hoje acionado manualmente; pronto para agendamento.
 */
export const sincronizarIntegracaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conta } = await supabaseAdmin
      .from("elora_integracao_contas")
      .select("base_url, api_key, ativo")
      .eq("cliente_id", data.clienteId)
      .maybeSingle();
    if (!conta) throw new Error("integracao: nenhuma chave configurada para este cliente.");
    if (!conta.ativo) throw new Error("integracao: a integração deste cliente está desligada.");

    const hoje = new Date().toISOString().slice(0, 10);
    try {
      const [uso, indicadores] = await Promise.all([
        lerApiElora(String(conta.base_url), String(conta.api_key), "/v1/uso"),
        lerApiElora(String(conta.base_url), String(conta.api_key), "/v1/indicadores"),
      ]);

      const { error } = await supabaseAdmin.from("elora_uso_snapshots").upsert(
        {
          cliente_id: data.clienteId,
          data: hoje,
          uso: uso as never,
          indicadores: indicadores as never,
        },
        { onConflict: "cliente_id,data" },
      );
      if (error) throw new Error(`snapshot: ${error.message}`);

      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ ultima_sync: new Date().toISOString(), ultimo_erro: null })
        .eq("cliente_id", data.clienteId);

      return { sincronizado: true as const };
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha desconhecida.";
      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({ ultimo_erro: mensagem })
        .eq("cliente_id", data.clienteId);
      throw new Error(mensagem);
    }
  });
