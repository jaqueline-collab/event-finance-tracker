import type { SupabaseClient } from "@supabase/supabase-js";
import { criarEhSuporte, dadosUsuario } from "./suporte";
export async function lerListaSuporte(db: SupabaseClient) {
  const { data, error } = await (db as any).from("elora_suporte_interno").select("nome, email, telefone");
  if (error) throw new Error(`usuários de suporte: ${error.message}`);
  return (data ?? []) as { nome: string | null; email: string | null; telefone: string | null }[];
}
export async function lerEhSuporte(db: SupabaseClient) {
  return criarEhSuporte(await lerListaSuporte(db));
}
/** userIds da conta que são usuários de suporte (por nome, e-mail ou telefone do cadastro do usuário). */
export async function idsSuporteDoCliente(db: SupabaseClient, clienteId: string): Promise<string[]> {
  const eh = await lerEhSuporte(db);
  const { data, error } = await (db as any).from("elora_apoio_espelho").select("externo_id, nome, payload").eq("cliente_id", clienteId).eq("tipo", "usuario");
  if (error) throw new Error(`usuários da conta: ${error.message}`);
  return (data ?? []).filter((a: any) => { const u = dadosUsuario(a); return eh(u.nome, u.email, u.telefone); }).map((a: any) => String(a.externo_id));
}
