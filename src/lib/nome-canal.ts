/** Nome do canal nas telas: só o apelido dado pela super admin; sem apelido, "Canal sem nome". Nunca o código da instância. */
export const CANAL_SEM_NOME = "Canal sem nome";
/** "Instância decc86" é o código da instância, não um apelido. */
export const ehCodigoInstancia = (v: string | null | undefined) => /^inst[âa]ncia\s+\S+$/i.test((v ?? "").trim());
export const nomeCanalExibido = (apelido: string | null | undefined) => (ehCodigoInstancia(apelido) ? "" : (apelido ?? "").trim()) || CANAL_SEM_NOME;

export type MapaCanais = { porId: Record<string, string>; porNome: Record<string, string> };

/** Monta o mapa a partir dos canais do Elora (id + nomes brutos) e dos apelidos por canal. */
export function montarMapaCanais(canais: { id: string; nomes: (string | null | undefined)[] }[], apelidos: Record<string, string | null | undefined>): MapaCanais {
  const porId: Record<string, string> = {};
  const porNome: Record<string, string> = {};
  for (const c of canais) {
    const n = nomeCanalExibido(apelidos[c.id]);
    porId[c.id] = n;
    for (const x of c.nomes) if (x) porNome[x] = n;
  }
  for (const [id, a] of Object.entries(apelidos)) if (!porId[id]) porId[id] = nomeCanalExibido(a);
  return { porId, porNome };
}

/** Nome exibido de um canal; vazio continua vazio (vira "Não definido" adiante). */
export function exibirCanal(m: MapaCanais, id: string | null | undefined, nomeBruto?: string | null): string {
  if (id && m.porId[id]) return m.porId[id];
  if (nomeBruto && m.porNome[nomeBruto]) return m.porNome[nomeBruto];
  if (!id && !nomeBruto) return "";
  return CANAL_SEM_NOME;
}
