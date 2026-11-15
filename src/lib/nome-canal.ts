/** Nome do canal nas telas: apelido; senão @ do Instagram; senão página do Messenger; senão número do WhatsApp (55) 31 99864-6532; senão "Canal sem nome". Nunca "Instância ...". */
export const CANAL_SEM_NOME = "Canal sem nome";
/** "Instância decc86" é o código da instância, não um apelido. */
export const ehCodigoInstancia = (v: string | null | undefined) => /^inst[âa]ncia\s+\S+$/i.test((v ?? "").trim());
const limpo = (v: string | null | undefined) => (ehCodigoInstancia(v) ? "" : (v ?? "").trim());
export const nomeCanalExibido = (apelido: string | null | undefined, real?: string | null) => limpo(apelido) || limpo(real) || CANAL_SEM_NOME;

export type MapaCanais = { porId: Record<string, string>; porNome: Record<string, string> };

/** Monta o mapa a partir dos canais do Elora (id + nomes brutos) e dos apelidos por canal. */
export function montarMapaCanais(canais: { id: string; real?: string | null; nomes: (string | null | undefined)[] }[], apelidos: Record<string, string | null | undefined>): MapaCanais {
  const porId: Record<string, string> = {};
  const porNome: Record<string, string> = {};
  for (const c of canais) {
    const n = nomeCanalExibido(apelidos[c.id], c.real);
    porId[c.id] = n;
    for (const x of c.nomes) if (x) porNome[x] = n;
  }
  for (const [id, a] of Object.entries(apelidos)) if (!porId[id]) porId[id] = nomeCanalExibido(a);
  return { porId, porNome };
}

/** Nome exibido de um canal; vazio continua vazio (vira "Sem informação" no agrupamento). */
export function exibirCanal(m: MapaCanais, id: string | null | undefined, nomeBruto?: string | null): string {
  if (id && m.porId[id]) return m.porId[id];
  if (nomeBruto && m.porNome[nomeBruto]) return m.porNome[nomeBruto];
  if (!id && !nomeBruto) return "";
  return limpo(nomeBruto) || CANAL_SEM_NOME;
}

/**
 * Filtros de canal gravados com o nome antigo (nome bruto ou código da instância)
 * passam a valer pelo nome exibido, para um filtro antigo nunca esvaziar o bloco.
 */
export function traduzirFiltrosCanal<F extends { campo?: string; valores?: unknown }>(filtros: F[], m: MapaCanais): F[] {
  return filtros.map((f) => {
    if (f.campo !== "canal" || !Array.isArray(f.valores)) return f;
    const vs = (f.valores as unknown[]).map((v) => {
      const x = String(v ?? "");
      if (m.porNome[x]) return m.porNome[x];
      if (m.porId[x]) return m.porId[x];
      return x;
    });
    return { ...f, valores: [...new Set(vs)] };
  });
}
