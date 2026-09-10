import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface Notificacao {
  id: string;
  titulo: string;
  texto: string | null;
  link: string | null;
  criadoEm: string;
  lida: boolean;
}

/** Avisos destinados ao usuário logado (gerais, pessoais, do cliente ou do parceiro dele). */
export const listarNotificacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Notificacao[]> => {
    const db = context.supabase as any;
    const [{ data: avisos }, { data: lidas }] = await Promise.all([
      db
        .from("elora_notificacoes")
        .select("id, titulo, texto, link, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      db.from("elora_notificacoes_lidas").select("notificacao_id").eq("user_id", context.userId),
    ]);
    const lidasSet = new Set<string>((lidas ?? []).map((l: any) => l.notificacao_id));
    return (avisos ?? []).map((a: any) => ({
      id: a.id,
      titulo: a.titulo,
      texto: a.texto ?? null,
      link: a.link ?? null,
      criadoEm: a.created_at,
      lida: lidasSet.has(a.id),
    }));
  });

/** Marca um aviso (ou todos os informados) como lido para o usuário atual. */
export const marcarNotificacoesLidas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string()).max(60) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true };
    const db = context.supabase as any;
    const { error } = await db
      .from("elora_notificacoes_lidas")
      .upsert(
        data.ids.map((id) => ({ notificacao_id: id, user_id: context.userId })),
        { onConflict: "notificacao_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
