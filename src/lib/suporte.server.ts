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
  const ids = new Set<string>((data ?? []).filter((a: any) => { const u = dadosUsuario(a); return eh(u.nome, u.email, u.telefone); }).map((a: any) => String(a.externo_id)));
  // Pessoa que não está no cadastro de usuários da conta, mas aparece como atendente (ex.: suporte de fora).
  const nomes = (await lerListaSuporte(db)).map((p) => p.nome).filter(Boolean) as string[];
  if (nomes.length) {
    const { data: at, error: e2 } = await (db as any).from("elora_atendimentos_espelho").select("atendente_id, atendente_nome").eq("cliente_id", clienteId).in("atendente_nome", nomes).not("atendente_id", "is", null).limit(1000);
    if (e2) throw new Error(`atendentes de suporte: ${e2.message}`);
    for (const a of at ?? []) if (eh(a.atendente_nome, null, null)) ids.add(String(a.atendente_id));
  }
  return [...ids];
}
