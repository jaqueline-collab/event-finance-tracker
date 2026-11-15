import type { SupabaseClient } from "@supabase/supabase-js";
import { criarEhSuporte } from "./suporte";
export async function lerEhSuporte(db: SupabaseClient) {
  const { data, error } = await (db as any).from("elora_suporte_interno").select("nome, email");
  if (error) throw new Error(`usuários de suporte: ${error.message}`);
  return criarEhSuporte(data ?? []);
}
