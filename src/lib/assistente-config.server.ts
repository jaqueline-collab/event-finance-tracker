/** Aplicar/desfazer propostas do assistente (somente servidor; chamador já é super admin). */
import { alvoDa, descreverProposta, tabelaDa, type Proposta } from "./assistente-config";
import { paraLinha } from "./matriz-coluna";
import { ehChavePadrao, slugColuna } from "./matriz";
import { cartoesValidos } from "./graficos";

type Quem = { usuarioId: string | null; email: string | null };

async function lerAntes(db: any, p: Proposta): Promise<unknown> {
  const t = tabelaDa(p);
  if (t === "elora_dashboard_visoes") {
    const { data, error } = await db.from(t).select("filtros").eq("id", (p as any).visaoId).eq("cliente_id", p.clienteId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("visão não encontrada para este cliente.");
    return data.filtros ?? {};
  }
  if (t === "elora_indicadores_config") {
    const chave = (p as any).coluna.chave;
    if (!chave) return null;
    const { data } = await db.from(t).select("*").eq("cliente_id", p.clienteId).eq("chave", chave).maybeSingle();
    return data ?? null;
  }
  const { data } = await db.from(t).select("*").eq("cliente_id", p.clienteId).eq("fonte", (p as any).fonte).eq("campo", (p as any).campo).maybeSingle();
  return data ?? null;
}

export async function aplicarPropostaServidor(db: any, p: Proposta, quem: Quem) {
  const antes = await lerAntes(db, p);
  let depois: unknown;
  let alvo = alvoDa(p);
  if (p.tipo === "cartao" || p.tipo === "layout" || p.tipo === "filtros_visao") {
    const f = (antes ?? {}) as Record<string, unknown>;
    const atuais = cartoesValidos(f.cartoes);
    depois = p.tipo === "cartao"
      ? { ...f, cartoes: [...atuais.filter((c) => c.id !== p.cartao.id), p.cartao] }
      : p.tipo === "layout" ? { ...f, cartoes: p.cartoes } : { ...f, filtrosPadrao: p.filtros };
    const { error } = await db.from("elora_dashboard_visoes").update({ filtros: depois }).eq("id", p.visaoId).eq("cliente_id", p.clienteId);
    if (error) throw new Error(error.message);
  } else if (p.tipo === "coluna_matriz") {
    const { data: ex } = await db.from("elora_indicadores_config").select("chave, ordem").eq("cliente_id", p.clienteId);
    const chaves = (ex ?? []).map((e: any) => e.chave as string);
    const chave = p.coluna.chave && (chaves.includes(p.coluna.chave) || ehChavePadrao(p.coluna.chave)) ? p.coluna.chave : slugColuna(p.coluna.nome, chaves);
    const ordem = p.coluna.ordem ?? Math.max(100, ...(ex ?? []).map((e: any) => Number(e.ordem) + 1));
    depois = paraLinha(p.clienteId, p.coluna, chave, ordem);
    alvo = `indicador:${chave}`;
    const { error } = await db.from("elora_indicadores_config").upsert(depois, { onConflict: "cliente_id,chave" });
    if (error) throw new Error(error.message);
  } else {
    depois = { cliente_id: p.clienteId, fonte: p.fonte, campo: p.campo, rotulo: p.rotulo || null, oculto: p.oculto, atualizado_em: new Date().toISOString(), atualizado_por: quem.email ?? quem.usuarioId };
    const { error } = await db.from("elora_campos_ajustes").upsert(depois, { onConflict: "cliente_id,fonte,campo" });
    if (error) throw new Error(error.message);
  }
  const { data: log, error: e2 } = await db.from("elora_config_acoes").insert({ cliente_id: p.clienteId, usuario_id: quem.usuarioId, usuario_email: quem.email, alvo, descricao: descreverProposta(p), antes, depois }).select("id").single();
  if (e2) throw new Error(e2.message);
  return { acaoId: String(log.id) };
}

/** Desfaz uma ação do assistente restaurando o valor anterior (só do mesmo cliente). */
export async function desfazerAcaoServidor(db: any, clienteId: string, acaoId: string) {
  const { data: a, error } = await db.from("elora_config_acoes").select("*").eq("id", acaoId).eq("cliente_id", clienteId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("ação não encontrada.");
  if (a.desfeita_em) throw new Error("esta ação já foi desfeita.");
  const [tipo, ...resto] = String(a.alvo).split(":");
  const id = resto.join(":");
  if (tipo === "visao") {
    const { error: e } = await db.from("elora_dashboard_visoes").update({ filtros: a.antes ?? {} }).eq("id", id).eq("cliente_id", clienteId);
    if (e) throw new Error(e.message);
  } else if (tipo === "indicador") {
    const r = a.antes
      ? await db.from("elora_indicadores_config").upsert(a.antes, { onConflict: "cliente_id,chave" })
      : await db.from("elora_indicadores_config").update({ ativo: false, atualizado_em: new Date().toISOString() }).eq("cliente_id", clienteId).eq("chave", id);
    if (r.error) throw new Error(r.error.message);
  } else if (tipo === "campo") {
    const [fonte, ...c] = id.split("|");
    const r = a.antes
      ? await db.from("elora_campos_ajustes").upsert(a.antes, { onConflict: "cliente_id,fonte,campo" })
      : await db.from("elora_campos_ajustes").update({ rotulo: null, oculto: false }).eq("cliente_id", clienteId).eq("fonte", fonte).eq("campo", c.join("|"));
    if (r.error) throw new Error(r.error.message);
  } else throw new Error("alvo desconhecido.");
  await db.from("elora_config_acoes").update({ desfeita_em: new Date().toISOString() }).eq("id", acaoId);
  return { ok: true };
}
