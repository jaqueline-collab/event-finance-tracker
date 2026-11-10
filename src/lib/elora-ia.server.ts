/** Elora: acesso, configuração, guia e histórico (somente servidor). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ELORA_GUIA_TEXTO_URL } from "./links-globais";
import { dividirGuia, normalizarConfig, type AcessoEloraIa, type ConfigEloraIa, type PaginaGuia } from "./elora-ia";

/**
 * Decide, no servidor e com o usuário autenticado, quais clientes a conversa pode
 * consultar. Nada do navegador amplia isso: `como` só é aceito para equipe interna.
 */
export async function resolverAcessoEloraIa(
  db: SupabaseClient,
  admin: SupabaseClient,
  usuarioId: string,
  pedido: { area: "cliente" | "parceiro"; como?: string },
): Promise<AcessoEloraIa> {
  const como = (pedido.como ?? "").trim();
  const rpc = async (nome: string) => (await (db as any).rpc(nome)).data;
  if (como) {
    if (!(await rpc("is_equipe_interna"))) throw new Error("acesso-negado: modo de visualização é exclusivo da equipe interna.");
  }
  if (pedido.area === "cliente") {
    const clienteId = como || ((await rpc("cliente_do_usuario")) as string | null);
    if (!clienteId) throw new Error("acesso-negado: este login não está vinculado a um cliente.");
    const { data } = await (admin as any).from("elora_clientes").select("id, nome").eq("id", clienteId).maybeSingle();
    if (!data) throw new Error("acesso-negado: cliente não encontrado.");
    return { usuarioId, area: como ? "visualizando_como" : "cliente", clientes: [{ id: data.id, nome: data.nome }], veValores: true };
  }
  let parceiroId: string | null = como || null;
  if (!parceiroId) {
    await (db as any).rpc("link_parceiro_usuario");
    parceiroId = (await rpc("parceiro_do_usuario")) as string | null;
  }
  if (!parceiroId) throw new Error("acesso-negado: este login não está vinculado a um parceiro.");
  const { data: parc } = await (admin as any)
    .from("elora_parceiros")
    .select("id, mostrar_valores_cliente, acesso_painel_clientes")
    .eq("id", parceiroId)
    .maybeSingle();
  if (!parc) throw new Error("acesso-negado: parceiro não encontrado.");
  let clientes: { id: string; nome: string }[] = [];
  if (parc.acesso_painel_clientes) {
    const { data } = await (admin as any).from("elora_clientes").select("id, nome").eq("parceiro_id", parceiroId).order("nome");
    clientes = (data ?? []).map((c: any) => ({ id: String(c.id), nome: String(c.nome ?? "") }));
  }
  return { usuarioId, area: como ? "visualizando_como" : "parceiro", clientes, veValores: Boolean(parc.mostrar_valores_cliente) };
}

export async function lerConfigEloraIa(admin: SupabaseClient): Promise<ConfigEloraIa> {
  const { data } = await (admin as any).from("elora_ia_config").select("*").eq("id", 1).maybeSingle();
  return normalizarConfig(data);
}

/** Texto do guia em cache por 24 h. Se a leitura falhar, usa o último cache. */
export async function lerGuia(admin: SupabaseClient): Promise<PaginaGuia[]> {
  const db = admin as any;
  const { data: cache } = await db.from("elora_ia_guia_cache").select("conteudo, lido_em").eq("url", ELORA_GUIA_TEXTO_URL).maybeSingle();
  const fresco = cache && Date.now() - Date.parse(cache.lido_em) < 24 * 3600_000;
  if (fresco) return dividirGuia(cache.conteudo);
  try {
    const partes: string[] = [];
    let url: string | null = ELORA_GUIA_TEXTO_URL;
    for (let i = 0; url && i < 12; i++) {
      const r: Response = await fetch(url);
      if (!r.ok) throw new Error(`guia ${r.status}`);
      const t: string = await r.text();
      partes.push(t);
      const prox: string | null = t.match(/^> Next part: (\S+)/m)?.[1] ?? null;
      url = prox && prox.startsWith("https://docs.flw.chat/") ? prox : null;
    }
    const conteudo = partes.join("\n\n");
    await db.from("elora_ia_guia_cache").upsert({ url: ELORA_GUIA_TEXTO_URL, conteudo, lido_em: new Date().toISOString() });
    return dividirGuia(conteudo);
  } catch (e) {
    console.error("[elora-ia] guia:", e);
    return cache ? dividirGuia(cache.conteudo) : [];
  }
}
