/** Leituras do modo administrador (somente servidor; cliente já validado). */
import type { DepsAdmin } from "./assistente-config-ferramentas";
import { cartoesValidos } from "./graficos";

export function depsAdmin(db: any): DepsAdmin {
  const cat = async (clienteId: string) => (await import("./campos-elora.server")).catalogoDoCliente(db, clienteId);
  return {
    catalogo: async (clienteId) => (await cat(clienteId)).catalogo.map((g: any) => ({ fonte: g.fonte, nome: g.nome, campos: g.campos.map((c: any) => ({ campo: c.campo, rotulo: c.rotulo, tipo: c.tipo, preenchidos: c.preenchidos, oculto: c.oculto })) })),
    definicoes: async (clienteId) => {
      const b = (await cat(clienteId)).base as any;
      const uniq = (l: unknown[]) => [...new Set(l.filter((x): x is string => typeof x === "string" && !!x.trim()))].slice(0, 200);
      const etapas = new Map<string, { painel: string; etapa: string }>();
      for (const c of b.cards ?? []) if (c.etapa) etapas.set(`${c.painel}|${c.etapa}`, { painel: String(c.painel ?? ""), etapa: String(c.etapa) });
      return {
        etapas: [...etapas.values()].slice(0, 300),
        campanhas: uniq((b.contatos ?? []).map((c: any) => c.utm_campaign)),
        etiquetas: uniq((b.contatos ?? []).flatMap((c: any) => c.etiquetas ?? [])),
        canais: uniq((b.atendimentos ?? []).map((a: any) => a.canal)),
      };
    },
    visoes: async (clienteId) => {
      const { data } = await db.from("elora_dashboard_visoes").select("id, nome, filtros").eq("cliente_id", clienteId).order("ordem");
      return (data ?? []).map((v: any) => ({ id: String(v.id), nome: String(v.nome), blocos: cartoesValidos(v.filtros?.cartoes).map((c) => ({ id: c.id, titulo: c.titulo, tipo: c.tipo })) }));
    },
  };
}
