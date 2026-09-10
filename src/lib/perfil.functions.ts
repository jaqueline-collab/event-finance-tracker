import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const salvarPerfilSchema = z.object({
  nome: z.string().trim().max(120).nullable().optional(),
  telefone: z.string().trim().max(40).nullable().optional(),
  avatarPath: z.string().trim().max(300).nullable().optional(),
});

export interface PerfilPayload {
  userId: string;
  email: string | null;
  nome: string | null;
  telefone: string | null;
  avatarPath: string | null;
}

/** Perfil do usuário logado (cria implicitamente vazio se ainda não existir). */
export const getMeuPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PerfilPayload> => {
    const db = context.supabase as any;
    const { data } = await db
      .from("perfis")
      .select("nome, telefone, avatar_path")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId,
      email: (context.claims as any)?.email ?? null,
      nome: data?.nome ?? null,
      telefone: data?.telefone ?? null,
      avatarPath: data?.avatar_path ?? null,
    };
  });

/** Grava nome, telefone e foto do próprio usuário. */
export const salvarMeuPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => salvarPerfilSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<PerfilPayload> => {
    const db = context.supabase as any;
    const registro = {
      user_id: context.userId,
      nome: data.nome?.length ? data.nome : null,
      telefone: data.telefone?.length ? data.telefone : null,
      avatar_path: data.avatarPath?.length ? data.avatarPath : null,
    };
    const { error } = await db
      .from("perfis")
      .upsert(registro, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return {
      userId: context.userId,
      email: (context.claims as any)?.email ?? null,
      nome: registro.nome,
      telefone: registro.telefone,
      avatarPath: registro.avatar_path,
    };
  });

const avatarSchema = z.object({
  base64: z.string().min(10),
  contentType: z.string().min(3).max(80),
  ext: z.string().trim().max(8).default("jpg"),
});

/** Sobe a foto do perfil pelo servidor (evita travar no navegador). */
export const enviarAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => avatarSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ path: string }> => {
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bin.byteLength > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
    const ext = (data.ext || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const caminho = `${context.userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await context.supabase.storage
      .from("avatars")
      .upload(caminho, bin, { upsert: true, contentType: data.contentType });
    if (error) throw new Error(error.message);
    return { path: caminho };
  });
