import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Notas fiscais anexadas a lançamentos do Financeiro, salvas no Google Drive.
 *
 * Regras de posse:
 * - Escrever (anexar): apenas equipe interna.
 * - Ler/baixar: equipe interna, ou o parceiro dono da nota (escopo "parceiro").
 *   Clientes individuais nunca acessam notas por aqui.
 *
 * A chave do Drive fica só no servidor (gateway); o navegador nunca a vê.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

async function exigirEquipeInterna(db: any) {
  const { data: interno } = await db.rpc("is_equipe_interna");
  if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
}

function driveAuth() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  const rootFolder = process.env["NF_DRIVE_ROOT_FOLDER_ID"];
  if (!lovableKey || !driveKey || !rootFolder) {
    throw new Error("Google Drive não está configurado neste projeto.");
  }
  return { lovableKey, driveKey, rootFolder };
}

async function driveFetch(
  auth: { lovableKey: string; driveKey: string },
  path: string,
  init: RequestInit = {},
) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.lovableKey}`,
      "X-Connection-Api-Key": auth.driveKey,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const corpo = await res.text();
    console.error(`Google Drive [${res.status}]: ${corpo}`);
    throw new Error(`Google Drive [${res.status}]: ${corpo}`);
  }
  return res;
}

/** Nome de pasta seguro para a query do Drive (escapa aspas simples). */
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Encontra (ou cria) a subpasta do pagador dentro da pasta principal. */
async function garantirSubpasta(
  auth: { lovableKey: string; driveKey: string; rootFolder: string },
  nome: string,
): Promise<string> {
  const q = encodeURIComponent(
    `name = '${esc(nome)}' and '${auth.rootFolder}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const busca = await driveFetch(auth, `/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`);
  const achados = (await busca.json()) as any;
  const existente = achados?.files?.[0]?.id;
  if (existente) return String(existente);

  const criada = await driveFetch(auth, `/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nome,
      mimeType: "application/vnd.google-apps.folder",
      parents: [auth.rootFolder],
    }),
  });
  const pasta = (await criada.json()) as any;
  return String(pasta.id);
}

/** Upload multipart simples (metadados JSON + conteúdo do arquivo). */
async function uploadArquivo(
  auth: { lovableKey: string; driveKey: string },
  pastaId: string,
  nomeArquivo: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<string> {
  const boundary = `----elora_nf_${Math.random().toString(36).slice(2)}`;
  const enc = new TextEncoder();
  const meta = JSON.stringify({ name: nomeArquivo, parents: [pastaId] });
  const partes: Uint8Array[] = [
    enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    bytes,
    enc.encode(`\r\n--${boundary}--`),
  ];
  const corpo = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let offset = 0;
  for (const p of partes) {
    corpo.set(p, offset);
    offset += p.length;
  }
  const res = await driveFetch(auth, `/upload/drive/v3/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: corpo,
  });
  const arquivo = (await res.json()) as any;
  return String(arquivo.id);
}

export type NotaFiscalResumo = {
  id: string;
  escopo: "parceiro" | "cliente";
  parceiroId: string | null;
  clienteId: string | null;
  competencia: string | null;
  valorTotal: number;
  nomeArquivo: string;
  criadoEm: string;
  lancamentoIds: string[];
};

const anexarSchema = z.object({
  lancamentoIds: z.array(z.string().min(1)).min(1).max(50),
  nomeArquivo: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(3).max(100).default("application/pdf"),
  conteudoBase64: z.string().min(1).max(14_000_000), // ~10 MB em base64
});

export const anexarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => anexarSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ nota: NotaFiscalResumo }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lançamentos selecionados
    const { data: lancamentos, error: errLanc } = await supabaseAdmin
      .from("elora_financeiro")
      .select("id, descricao, valor, competencia")
      .in("id", data.lancamentoIds);
    if (errLanc) throw new Error(`lançamentos: ${errLanc.message}`);
    const lista = (lancamentos ?? []) as any[];
    if (lista.length !== data.lancamentoIds.length) {
      throw new Error("Um ou mais lançamentos selecionados não foram encontrados.");
    }

    // Pagador de cada lançamento, via itens de fechamento → cliente → parceiro
    const { data: itens, error: errItens } = await supabaseAdmin
      .from("elora_fechamento_itens")
      .select("lancamento_financeiro_id, cliente_id")
      .in("lancamento_financeiro_id", data.lancamentoIds);
    if (errItens) throw new Error(`itens de fechamento: ${errItens.message}`);

    const clienteIds = new Set<string>();
    for (const it of (itens ?? []) as any[]) {
      if (it.cliente_id) clienteIds.add(String(it.cliente_id));
    }
    const semVinculo = lista.filter(
      (l) => !(itens ?? []).some((it: any) => String(it.lancamento_financeiro_id) === String(l.id)),
    );
    if (semVinculo.length > 0) {
      throw new Error(
        `Não é possível anexar NF: ${semVinculo.length} lançamento(s) não têm cliente vinculado (${semVinculo
          .map((l) => l.descricao)
          .slice(0, 2)
          .join("; ")}).`,
      );
    }
    if (clienteIds.size === 0) {
      throw new Error("Não foi possível identificar o pagador dos lançamentos selecionados.");
    }

    const { data: clientesRows, error: errCli } = await supabaseAdmin
      .from("elora_clientes")
      .select("id, nome, parceiro_id")
      .in("id", [...clienteIds]);
    if (errCli) throw new Error(`clientes: ${errCli.message}`);
    const clientes = (clientesRows ?? []) as any[];

    const parceirosDistintos = new Set(clientes.map((c) => String(c.parceiro_id ?? "")));
    let escopo: "parceiro" | "cliente";
    let parceiroId: string | null = null;
    let clienteId: string | null = null;
    let nomePasta = "";

    if (parceirosDistintos.size > 1 || (parceirosDistintos.size === 1 && parceirosDistintos.has("") && clientes.length > 1)) {
      if (parceirosDistintos.size === 1 && parceirosDistintos.has("")) {
        // Todos sem parceiro: só vale se for o MESMO cliente
        throw new Error("Uma nota não pode cobrir clientes diferentes sem parceiro. Anexe um cliente por vez.");
      }
      throw new Error(
        "Uma nota não pode misturar pagadores diferentes (parceiros distintos ou com/sem parceiro). Ajuste a seleção.",
      );
    }

    const unicoParceiro = [...parceirosDistintos][0];
    if (unicoParceiro) {
      escopo = "parceiro";
      parceiroId = unicoParceiro;
      const { data: parceiro } = await supabaseAdmin
        .from("elora_parceiros")
        .select("nome")
        .eq("id", parceiroId)
        .maybeSingle();
      nomePasta = `${parceiro?.nome ?? "Parceiro"} (${parceiroId})`;
    } else {
      escopo = "cliente";
      clienteId = String(clientes[0].id);
      nomePasta = `${clientes[0].nome} (${clienteId})`;
    }

    // Upload para o Drive
    const auth = driveAuth();
    const bytes = new Uint8Array(Buffer.from(data.conteudoBase64, "base64"));
    const pastaId = await garantirSubpasta(auth, nomePasta);
    const arquivoId = await uploadArquivo(auth, pastaId, data.nomeArquivo, data.mimeType, bytes);

    const valorTotal = lista.reduce((s, l) => s + (Number(l.valor) || 0), 0);
    const competencia = lista.map((l) => l.competencia).find((c) => c) ?? null;

    const { data: notaRow, error: errNota } = await supabaseAdmin
      .from("elora_notas_fiscais")
      .insert({
        escopo,
        parceiro_id: parceiroId,
        cliente_id: clienteId,
        competencia,
        valor_total: Number(valorTotal.toFixed(2)),
        drive_file_id: arquivoId,
        drive_folder_id: pastaId,
        nome_arquivo: data.nomeArquivo,
        mime_type: data.mimeType,
        criado_por: context.userId,
      })
      .select("id, created_at")
      .single();
    if (errNota || !notaRow) throw new Error(`nota: ${errNota?.message ?? "falha ao gravar"}`);

    const { error: errVinc } = await supabaseAdmin.from("elora_nota_fiscal_lancamentos").insert(
      data.lancamentoIds.map((lancamentoId) => ({ nota_id: notaRow.id, lancamento_id: lancamentoId })),
    );
    if (errVinc) throw new Error(`vínculos: ${errVinc.message}`);

    return {
      nota: {
        id: String(notaRow.id),
        escopo,
        parceiroId,
        clienteId,
        competencia: competencia ? String(competencia) : null,
        valorTotal: Number(valorTotal.toFixed(2)),
        nomeArquivo: data.nomeArquivo,
        criadoEm: String(notaRow.created_at),
        lancamentoIds: data.lancamentoIds,
      },
    };
  });

/** Mapa lançamento → nota, para a equipe marcar o que já tem NF anexada. */
export const listarVinculosNotas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ porLancamento: Record<string, { notaId: string; nomeArquivo: string }> }> => {
    await exigirEquipeInterna(context.supabase);
    const { data, error } = await context.supabase
      .from("elora_nota_fiscal_lancamentos")
      .select("lancamento_id, nota_id, elora_notas_fiscais(nome_arquivo)");
    if (error) throw new Error(`vínculos: ${error.message}`);
    const porLancamento: Record<string, { notaId: string; nomeArquivo: string }> = {};
    for (const v of (data ?? []) as any[]) {
      porLancamento[String(v.lancamento_id)] = {
        notaId: String(v.nota_id),
        nomeArquivo: String(v.elora_notas_fiscais?.nome_arquivo ?? "Nota fiscal"),
      };
    }
    return { porLancamento };
  });

const listarSchema = z.object({ parceiroId: z.string().optional() });

export const listarNotasParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listarSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ notas: NotaFiscalResumo[] }> => {
    // Parceiro só vê as próprias notas; equipe interna pode ver qualquer parceiro (ver como).
    let parceiroId = data.parceiroId ?? null;
    const { data: interno } = await context.supabase.rpc("is_equipe_interna");
    if (!interno || !parceiroId) {
      const { data: meuParceiro } = await context.supabase.rpc("parceiro_do_usuario");
      if (!meuParceiro) {
        if (!interno) throw new Error("acesso-negado: parceiro não identificado.");
        throw new Error("Informe o parceiro.");
      }
      if (parceiroId && String(meuParceiro) !== parceiroId && !interno) {
        throw new Error("acesso-negado: estas notas pertencem a outro parceiro.");
      }
      parceiroId = parceiroId ?? String(meuParceiro);
    }

    const { data: notasRows, error } = await context.supabase
      .from("elora_notas_fiscais")
      .select("id, escopo, parceiro_id, cliente_id, competencia, valor_total, nome_arquivo, created_at")
      .eq("parceiro_id", parceiroId)
      .eq("escopo", "parceiro")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`notas: ${error.message}`);

    const notas = (notasRows ?? []) as any[];
    if (notas.length === 0) return { notas: [] };

    const { data: vinculos } = await context.supabase
      .from("elora_nota_fiscal_lancamentos")
      .select("nota_id, lancamento_id")
      .in("nota_id", notas.map((n) => n.id));
    const porNota = new Map<string, string[]>();
    for (const v of (vinculos ?? []) as any[]) {
      const arr = porNota.get(String(v.nota_id)) ?? [];
      arr.push(String(v.lancamento_id));
      porNota.set(String(v.nota_id), arr);
    }

    return {
      notas: notas.map((n) => ({
        id: String(n.id),
        escopo: "parceiro" as const,
        parceiroId: String(n.parceiro_id),
        clienteId: n.cliente_id ? String(n.cliente_id) : null,
        competencia: n.competencia ? String(n.competencia) : null,
        valorTotal: Number(n.valor_total) || 0,
        nomeArquivo: String(n.nome_arquivo),
        criadoEm: String(n.created_at),
        lancamentoIds: porNota.get(String(n.id)) ?? [],
      })),
    };
  });

const baixarSchema = z.object({ notaId: z.string().uuid() });

export const baixarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => baixarSchema.parse(input))
  .handler(
    async ({ data, context }): Promise<{ nomeArquivo: string; mimeType: string; conteudoBase64: string }> => {
      const { data: nota, error } = await context.supabase
        .from("elora_notas_fiscais")
        .select("id, escopo, parceiro_id, nome_arquivo, mime_type, drive_file_id")
        .eq("id", data.notaId)
        .maybeSingle();
      if (error) throw new Error(`nota: ${error.message}`);
      if (!nota) throw new Error("Nota não encontrada.");

      // Posse: equipe interna ou o parceiro dono da nota.
      const { data: interno } = await context.supabase.rpc("is_equipe_interna");
      if (!interno) {
        const { data: meuParceiro } = await context.supabase.rpc("parceiro_do_usuario");
        if (
          nota.escopo !== "parceiro" ||
          !meuParceiro ||
          String(nota.parceiro_id) !== String(meuParceiro)
        ) {
          throw new Error("acesso-negado: esta nota não pertence ao seu parceiro.");
        }
      }

      const auth = driveAuth();
      const res = await driveFetch(auth, `/drive/v3/files/${nota.drive_file_id}?alt=media`);
      const buf = await res.arrayBuffer();
      return {
        nomeArquivo: String(nota.nome_arquivo),
        mimeType: String(nota.mime_type ?? "application/octet-stream"),
        conteudoBase64: Buffer.from(buf).toString("base64"),
      };
    },
  );
