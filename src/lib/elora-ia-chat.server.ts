/** Rota de conversa da Elora (somente servidor). */
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./ai-run-id.server";
import {
  corteRetencao,
  inicioDoDiaSP,
  instrucoesElora,
  limiteAtingido,
  MSG_LIMITE_DIARIO,
  pedeTextoDeMensagem,
  RESPOSTA_TEXTO_MENSAGEM,
  validarPergunta,
} from "./elora-ia";
import { criarFerramentasElora } from "./elora-ia-ferramentas";
import { lerConfigEloraIa, lerGuia, resolverAcessoEloraIa } from "./elora-ia.server";
import { ELORA_GUIA_URL } from "./links-globais";

const Corpo = z.object({
  area: z.enum(["cliente", "parceiro"]),
  como: z.string().max(100).optional().default(""),
  messages: z.array(z.any()).min(1).max(40),
});

const erro = (status: number, mensagem: string) => Response.json({ erro: mensagem }, { status });

function textoDe(m: UIMessage | undefined) {
  return (m?.parts ?? []).map((p: any) => (p.type === "text" ? p.text : "")).join("").trim();
}

/** Resposta fixa (sem chamar o modelo) no mesmo formato do chat. */
function respostaFixa(texto: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: "fixa" });
      writer.write({ type: "text-delta", id: "fixa", delta: texto });
      writer.write({ type: "text-end", id: "fixa" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function tratarChatElora(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL;
  const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!url || !pub || !apiKey) return erro(500, "A Elora não está configurada.");

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return erro(401, "Entre na sua conta para falar com a Elora.");
  const db = createClient(url, pub, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims } = await db.auth.getClaims(token);
  const usuarioId = claims?.claims?.sub;
  if (!usuarioId) return erro(401, "Sessão expirada. Entre de novo.");

  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return erro(400, "Pedido inválido.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const cfg = await lerConfigEloraIa(admin);
  if (!cfg.ligado) return erro(403, "A Elora está desligada no momento.");

  let acesso;
  try {
    acesso = await resolverAcessoEloraIa(db as any, admin, usuarioId, { area: corpo.data.area, como: corpo.data.como });
  } catch (e) {
    return erro(403, (e instanceof Error ? e.message : "Sem acesso.").replace(/^[a-z-]+:\s*/, ""));
  }

  const mensagens = corpo.data.messages as UIMessage[];
  const pergunta = textoDe([...mensagens].reverse().find((m) => m.role === "user"));
  const invalida = validarPergunta(pergunta, cfg);
  if (invalida) return erro(400, invalida);

  // Limpeza do histórico vencido + contagem do dia.
  await admin.from("elora_ia_conversas").delete().lt("criado_em", corteRetencao(cfg.retencao_dias));
  const { count } = await admin
    .from("elora_ia_conversas")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .gte("criado_em", inicioDoDiaSP());
  if (limiteAtingido(count ?? 0, cfg)) return erro(429, MSG_LIMITE_DIARIO);

  const registro = {
    usuario_id: usuarioId,
    area: acesso.area,
    cliente_id: acesso.clientes.length === 1 ? acesso.clientes[0].id : null,
    pergunta,
    modelo: cfg.modelo,
  };

  if (pedeTextoDeMensagem(pergunta)) {
    await admin.from("elora_ia_conversas").insert({ ...registro, resposta: RESPOSTA_TEXTO_MENSAGEM, clientes_consultados: [], ferramentas: [], tokens_entrada: 0, tokens_saida: 0 });
    return respostaFixa(RESPOSTA_TEXTO_MENSAGEM);
  }

  const consultados = new Set<string>();
  const { montarMatrizCliente, linhasPadrao } = await import("./matriz.server");
  const ferramentas = criarFerramentasElora(
    acesso,
    {
      matriz: async (clienteId, p) => {
        const r: any = await montarMatrizCliente(admin, clienteId, p, {});
        return { colunas: r.colunas, linhas: r.linhas, total: r.total };
      },
      linhasDimensao: (clienteId, p) => linhasPadrao(admin, clienteId, p) as any,
      guia: () => lerGuia(admin),
      guiaUrl: ELORA_GUIA_URL,
    },
    (id) => consultados.add(id),
  );

  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(cfg.modelo),
    instructions: instrucoesElora({ acesso, hoje, guiaUrl: ELORA_GUIA_URL }),
    messages: await convertToModelMessages(mensagens.slice(-12)),
    tools: ferramentas,
    stopWhen: stepCountIs(6),
    maxOutputTokens: cfg.max_resposta_tokens,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
    onFinish: async (fim: any) => {
      try {
        const nomes = (fim.steps ?? []).flatMap((s: any) => (s.toolCalls ?? []).map((t: any) => t.toolName));
        await admin.from("elora_ia_conversas").insert({
          ...registro,
          resposta: String(fim.text ?? "").slice(0, 20000),
          clientes_consultados: [...consultados],
          ferramentas: nomes,
          tokens_entrada: fim.totalUsage?.inputTokens ?? 0,
          tokens_saida: fim.totalUsage?.outputTokens ?? 0,
        });
      } catch (e) {
        console.error("[elora-ia] registro:", e);
      }
    },
  } as any);

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      sendReasoning: false,
      onError: (e: any) => {
        const s = e?.statusCode ?? e?.status;
        if (s === 402) return "Os créditos de IA acabaram. Avise a equipe Elora.";
        if (s === 429) return "Muitas perguntas ao mesmo tempo. Tente de novo em instantes.";
        if (s === 403) return "A IA recusou este pedido.";
        return "Não consegui responder agora. Tente de novo.";
      },
    }),
    runIdFetch,
  );
}
