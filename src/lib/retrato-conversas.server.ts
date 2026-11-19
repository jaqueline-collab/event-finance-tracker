/**
 * Retrato de conversas por dia: guarda, a cada retrato, a contagem de conversas
 * (atendimento × dia com mensagem recebida), Usuário do sistema, Bot e mensagens,
 * em `elora_retratos_conversas_dia` (só servidor), para explicar diferenças dia a dia.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { lerTudo } from "./ler-paginas.server";
import { contarMensagensDia } from "./elora-espelho.server";

export async function gravarRetratoConversasDia(db: SupabaseClient, clienteId: string, de: string, ate: string, motivo: string) {
  const inicio = new Date(`${de}T03:00:00Z`).toISOString();
  const fim = new Date(new Date(`${ate}T03:00:00Z`).getTime() + 86_400_000 - 1).toISOString();
  const excluir = await (await import("./suporte.server")).idsSuporteDoCliente(db, clienteId);
  const data = await lerTudo(() =>
    (db as any).rpc("elora_conversas_pares", { _cliente_id: clienteId, _inicio: inicio, _fim: fim, _excluir: excluir }).order("sessao_id").order("primeira_em"), 8);
  const porDia = new Map<string, { conversas: number; usuario: number; bot: number }>();
  for (const p of (data ?? []) as any[]) {
    const dia = new Date(new Date(p.primeira_em).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
    const d = porDia.get(dia) ?? { conversas: 0, usuario: 0, bot: 0 };
    d.conversas++;
    if (p.usuario) d.usuario++; else d.bot++;
    porDia.set(dia, d);
  }
  const retrato_em = new Date().toISOString();
  const linhas = [];
  for (let t = new Date(`${de}T12:00:00Z`).getTime(); t <= new Date(`${ate}T12:00:00Z`).getTime(); t += 86_400_000) {
    const dia = new Date(t).toISOString().slice(0, 10);
    const mensagens = await contarMensagensDia(db, clienteId, `${dia}T03:00:00Z`, new Date(t + 15 * 3_600_000).toISOString());
    const d = porDia.get(dia) ?? { conversas: 0, usuario: 0, bot: 0 };
    linhas.push({ cliente_id: clienteId, retrato_em, motivo, periodo_de: de, periodo_ate: ate, dia, ...d, mensagens });
  }
  const { error: e2 } = await db.from("elora_retratos_conversas_dia").insert(linhas);
  if (e2) throw e2;
  return { retrato_em, linhas };
}
