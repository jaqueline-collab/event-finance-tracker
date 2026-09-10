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
