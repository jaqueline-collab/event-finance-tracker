import type { SupabaseClient } from "@supabase/supabase-js";
import { montarMapaCanais, type MapaCanais } from "./nome-canal";

/** Lê canais do espelho e apelidos do cliente (só servidor). */
export async function lerMapaCanais(db: SupabaseClient, clienteId: string): Promise<MapaCanais> {
  const d = db as any;
  const [apoio, ap, usados] = await Promise.all([
    d.from("elora_apoio_espelho").select("externo_id, nome, payload").eq("cliente_id", clienteId).eq("tipo", "canal").limit(1000),
    d.from("elora_dados_canais_permitidos").select("canal_id, apelido, nome, numero").eq("cliente_id", clienteId).limit(1000),
    d.rpc("elora_canais_atendimentos", { _cliente_id: clienteId }),
  ]);
  // Nome visto nos atendimentos: completa canais sem nome na conta e os que a conta não devolve.
  const vistos: Record<string, string> = {};
  for (const u of usados?.data ?? []) if (u.canal_id && u.canal_nome) vistos[String(u.canal_id)] = String(u.canal_nome);
  if (apoio.error) throw new Error(`canais: ${apoio.error.message}`);
  if (ap.error) throw new Error(`apelidos: ${ap.error.message}`);
  const apelidos: Record<string, string | null> = {};
  const extras: Record<string, (string | null)[]> = {};
  for (const r of ap.data ?? []) { apelidos[String(r.canal_id)] = r.apelido; extras[String(r.canal_id)] = [r.nome, r.numero]; }
  const canais = (apoio.data ?? []).map((a: any) => ({
    id: String(a.externo_id),
    real: a.payload?.identity?.displayName ?? a.payload?.identity?.name ?? a.nome ?? vistos[String(a.externo_id)] ?? null,
    nomes: [a.payload?.identity?.humanId, a.payload?.identity?.name, a.nome, a.payload?.numberFormatted, a.payload?.number, ...(extras[String(a.externo_id)] ?? [])],
  }));
  const conhecidos = new Set(canais.map((c: any) => c.id));
  for (const [id, nome] of Object.entries(vistos)) if (!conhecidos.has(id)) canais.push({ id, real: nome, nomes: [nome] });
  return montarMapaCanais(canais, apelidos);
}
