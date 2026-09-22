import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  calcularPontos,
  extrairYoutubeId,
  medalhasElegiveis,
  nivelPara,
  trilhaConcluida,
  videoLiberado,
  type Medalha,
  type NivelGamificacao,
  type Trilha,
} from "@/lib/treinamento";

/**
 * Treinamento (LMS). Conteúdo é escrito só pela equipe interna; progresso,
 * pontos e medalhas são sempre do próprio usuário autenticado — nunca de outro.
 */

const audienciaSchema = z.enum(["parceiro", "cliente"]);

const getSchema = z.object({ audiencia: audienciaSchema.optional() }).default({});
const concluirSchema = z.object({ videoId: z.string().uuid() });

const trilhaSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(2000).nullable().default(null),
  audiencia: audienciaSchema,
  ativa: z.boolean().default(true),
  pontosBonusConclusao: z.number().int().min(0).max(100000).default(0),
  ordem: z.number().int().min(0).max(999).default(0),
});

const videoSchema = z.object({
  id: z.string().uuid().optional(),
  trilhaId: z.string().uuid(),
  titulo: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(1000).nullable().default(null),
  youtubeUrl: z.string().trim().min(5).max(500),
  ordem: z.number().int().min(0).max(999).default(0),
  pontos: z.number().int().min(0).max(100000).default(0),
});

const medalhaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(500).nullable().default(null),
  icone: z.string().trim().max(60).nullable().default(null),
  criterioTipo: z.enum(["trilha", "pontos", "videos"]),
  criterioValor: z.string().trim().min(1).max(80),
});

const nivelSchema = z.object({
  id: z.string().uuid().optional(),
  nivel: z.number().int().min(1).max(50),
  pontosMinimos: z.number().int().min(0).max(1000000),
  nome: z.string().trim().min(2).max(60),
  icone: z.string().trim().max(60).nullable().default(null),
});

const excluirSchema = z.object({ id: z.string().uuid(), tipo: z.enum(["trilha", "video", "medalha", "nivel"]) });

async function exigirInterna(db: any) {
  const { data: interna } = await db.rpc("is_equipe_interna");
  if (!interna) throw new Error("acesso-negado: apenas a equipe interna edita o Treinamento.");
}

/** Descobre se quem está logado é parceiro, cliente ou equipe interna. */
async function tipoDoUsuario(db: any): Promise<"parceiro" | "cliente" | "interno"> {
  await db.rpc("link_parceiro_usuario");
  const { data: parceiro } = await db.rpc("parceiro_do_usuario");
  if (parceiro) return "parceiro";
  await db.rpc("link_cliente_usuario");
  const { data: cliente } = await db.rpc("cliente_do_usuario");
  if (cliente) return "cliente";
  return "interno";
}

function montarTrilhas(trilhasRows: any[], videosRows: any[]): Trilha[] {
  return (trilhasRows ?? [])
    .map((t) => ({
      id: String(t.id),
      titulo: String(t.titulo),
      descricao: (t.descricao as string | null) ?? null,
      audiencia: t.audiencia as "parceiro" | "cliente",
      ativa: Boolean(t.ativa),
      pontosBonusConclusao: Number(t.pontos_bonus_conclusao ?? 0),
      ordem: Number(t.ordem ?? 0),
      videos: (videosRows ?? [])
        .filter((v) => String(v.trilha_id) === String(t.id))
        .map((v) => ({
          id: String(v.id),
          titulo: String(v.titulo),
          descricao: (v.descricao as string | null) ?? null,
          youtubeId: String(v.youtube_id),
          youtubeUrl: String(v.youtube_url),
          ordem: Number(v.ordem ?? 0),
          pontos: Number(v.pontos ?? 0),
        }))
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

async function carregarCatalogo(db: any) {
  const [tRes, vRes, nRes, mRes] = await Promise.all([
    db.from("elora_trilhas").select("*"),
    db.from("elora_trilha_videos").select("*"),
    db.from("elora_niveis_gamificacao").select("*"),
    db.from("elora_medalhas").select("*"),
  ]);
  if (tRes.error) throw new Error(`trilhas: ${tRes.error.message}`);
  if (vRes.error) throw new Error(`videos: ${vRes.error.message}`);
  const niveis: NivelGamificacao[] = ((nRes.data ?? []) as any[])
    .map((n) => ({
      nivel: Number(n.nivel),
      pontosMinimos: Number(n.pontos_minimos ?? 0),
      nome: String(n.nome),
      icone: (n.icone as string | null) ?? null,
    }))
    .sort((a, b) => a.pontosMinimos - b.pontosMinimos);
  const medalhas: Medalha[] = ((mRes.data ?? []) as any[]).map((m) => ({
    id: String(m.id),
    nome: String(m.nome),
    descricao: (m.descricao as string | null) ?? null,
    icone: (m.icone as string | null) ?? null,
    criterioTipo: m.criterio_tipo as Medalha["criterioTipo"],
    criterioValor: String(m.criterio_valor),
  }));
  return {
    trilhas: montarTrilhas((tRes.data ?? []) as any[], (vRes.data ?? []) as any[]),
    niveis,
    medalhas,
    niveisRows: (nRes.data ?? []) as any[],
  };
}

/** Painel do usuário: trilhas da audiência dele + progresso, pontos, nível e medalhas. */
export const getTreinamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => getSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const tipo = await tipoDoUsuario(db);
    const audiencia = (data.audiencia ?? (tipo === "cliente" ? "cliente" : "parceiro")) as
      | "parceiro"
      | "cliente";

    const { trilhas: todas, niveis, medalhas } = await carregarCatalogo(db);
    const trilhas = todas.filter((t) => t.ativa && t.audiencia === audiencia);

    const [progRes, conqRes] = await Promise.all([
      db.from("elora_progresso_video").select("video_id, concluido, concluido_em").eq("user_id", context.userId),
      db.from("elora_medalhas_conquistadas").select("medalha_id, conquistada_em").eq("user_id", context.userId),
    ]);
    const concluidos = new Set<string>(
      ((progRes.data ?? []) as any[]).filter((p) => p.concluido).map((p) => String(p.video_id)),
    );
    const pontos = calcularPontos(todas, concluidos);
    const conquistadas = new Set(((conqRes.data ?? []) as any[]).map((c) => String(c.medalha_id)));

    return {
      audiencia,
      tipo,
      trilhas,
      concluidos: [...concluidos],
      pontos,
      nivel: nivelPara(pontos, niveis),
      niveis,
      medalhas: medalhas.map((m) => ({ ...m, conquistada: conquistadas.has(m.id) })),
    };
  });

/**
 * Marca um vídeo como concluído. A trava de ordem é validada aqui — não só na tela.
 * Devolve os pontos novos, o nível e as medalhas conquistadas agora.
 */
export const concluirVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => concluirSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const tipo = await tipoDoUsuario(db);
    const { trilhas, niveis, medalhas } = await carregarCatalogo(db);

    const trilha = trilhas.find((t) => t.videos.some((v) => v.id === data.videoId));
    if (!trilha) throw new Error("treinamento: vídeo não encontrado.");
    if (!trilha.ativa) throw new Error("treinamento: esta trilha está desativada.");

    const progAntes = await db
      .from("elora_progresso_video")
      .select("video_id, concluido")
      .eq("user_id", context.userId);
    const concluidos = new Set<string>(
      ((progAntes.data ?? []) as any[]).filter((p) => p.concluido).map((p) => String(p.video_id)),
    );

    if (!videoLiberado(trilha, data.videoId, concluidos)) {
      throw new Error("treinamento: conclua o vídeo anterior desta trilha primeiro.");
    }

    const pontosAntes = calcularPontos(trilhas, concluidos);
    const nivelAntes = nivelPara(pontosAntes, niveis);

    if (!concluidos.has(data.videoId)) {
      const { error } = await db
        .from("elora_progresso_video")
        .upsert(
          {
            user_id: context.userId,
            usuario_tipo: tipo,
            video_id: data.videoId,
            concluido: true,
            concluido_em: new Date().toISOString(),
          },
          { onConflict: "user_id,video_id" },
        );
      if (error) throw new Error(`progresso: ${error.message}`);
      concluidos.add(data.videoId);
    }

    const pontos = calcularPontos(trilhas, concluidos);
    const nivel = nivelPara(pontos, niveis);
    const trilhasConcluidas = new Set(trilhas.filter((t) => trilhaConcluida(t, concluidos)).map((t) => t.id));

    const conqRes = await db
      .from("elora_medalhas_conquistadas")
      .select("medalha_id")
      .eq("user_id", context.userId);
    const jaTem = new Set(((conqRes.data ?? []) as any[]).map((c) => String(c.medalha_id)));

    const elegiveis = medalhasElegiveis(medalhas, {
      pontos,
      videosConcluidos: concluidos.size,
      trilhasConcluidas,
    });
    const novas = elegiveis.filter((m) => !jaTem.has(m.id));
    if (novas.length > 0) {
      await db.from("elora_medalhas_conquistadas").insert(
        novas.map((m) => ({ user_id: context.userId, usuario_tipo: tipo, medalha_id: m.id })),
      );
    }

    return {
      pontos,
      nivel,
      subiuDeNivel: (nivel?.nivel ?? 0) > (nivelAntes?.nivel ?? 0),
      novasMedalhas: novas,
      trilhaConcluida: trilhasConcluidas.has(trilha.id),
    };
  });

/** Catálogo completo para a administração da equipe interna. */
export const getTreinamentoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    const { trilhas, medalhas, niveisRows } = await carregarCatalogo(db);
    return {
      trilhas,
      medalhas,
      niveis: niveisRows
        .map((n) => ({
          id: String(n.id),
          nivel: Number(n.nivel),
          pontosMinimos: Number(n.pontos_minimos ?? 0),
          nome: String(n.nome),
          icone: (n.icone as string | null) ?? null,
        }))
        .sort((a, b) => a.pontosMinimos - b.pontosMinimos),
    };
  });

export const salvarTrilha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => trilhaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    const payload = {
      titulo: data.titulo,
      descricao: data.descricao,
      audiencia: data.audiencia,
      ativa: data.ativa,
      pontos_bonus_conclusao: data.pontosBonusConclusao,
      ordem: data.ordem,
    };
    const q = data.id
      ? db.from("elora_trilhas").update(payload).eq("id", data.id)
      : db.from("elora_trilhas").insert(payload);
    const { error } = await q;
    if (error) throw new Error(`trilha: ${error.message}`);
    return { ok: true };
  });

export const salvarVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => videoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    const youtubeId = extrairYoutubeId(data.youtubeUrl);
    if (!youtubeId) throw new Error("vídeo: o link do YouTube não parece válido.");
    const payload = {
      trilha_id: data.trilhaId,
      titulo: data.titulo,
      descricao: data.descricao,
      youtube_url: data.youtubeUrl,
      youtube_id: youtubeId,
      ordem: data.ordem,
      pontos: data.pontos,
    };
    const q = data.id
      ? db.from("elora_trilha_videos").update(payload).eq("id", data.id)
      : db.from("elora_trilha_videos").insert(payload);
    const { error } = await q;
    if (error) throw new Error(`vídeo: ${error.message}`);
    return { ok: true };
  });

export const reordenarVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await db.from("elora_trilha_videos").update({ ordem: i + 1 }).eq("id", data.ids[i]);
      if (error) throw new Error(`ordem: ${error.message}`);
    }
    return { ok: true };
  });

export const salvarMedalha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => medalhaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    const payload = {
      nome: data.nome,
      descricao: data.descricao,
      icone: data.icone,
      criterio_tipo: data.criterioTipo,
      criterio_valor: data.criterioValor,
    };
    const q = data.id
      ? db.from("elora_medalhas").update(payload).eq("id", data.id)
      : db.from("elora_medalhas").insert(payload);
    const { error } = await q;
    if (error) throw new Error(`medalha: ${error.message}`);
    return { ok: true };
  });

export const salvarNivel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => nivelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    const payload = {
      nivel: data.nivel,
      pontos_minimos: data.pontosMinimos,
      nome: data.nome,
      icone: data.icone,
    };
    const q = data.id
      ? db.from("elora_niveis_gamificacao").update(payload).eq("id", data.id)
      : db.from("elora_niveis_gamificacao").insert(payload);
    const { error } = await q;
    if (error) throw new Error(`nível: ${error.message}`);
    return { ok: true };
  });

/** Exclui conteúdo (nunca progresso de usuário). */
export const excluirItemTreinamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => excluirSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    await exigirInterna(db);
    const tabela = {
      trilha: "elora_trilhas",
      video: "elora_trilha_videos",
      medalha: "elora_medalhas",
      nivel: "elora_niveis_gamificacao",
    }[data.tipo];
    const { error } = await db.from(tabela).delete().eq("id", data.id);
    if (error) throw new Error(`exclusão: ${error.message}`);
    return { ok: true };
  });
