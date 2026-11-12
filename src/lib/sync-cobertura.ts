/** A conclusão de uma carga não prova cobertura diária. Só intervalos explícitos confirmam zero. */
export type Cobertura = { fonte: string; concluido_em?: string | null; cursor?: unknown; cobertura?: { de: string; ate: string }[] };
export type EstadoCobertura = "confirmado" | "aguardando sincronização" | "parcial";
export function estadoCobertura(dia: string, fontes: string[], estados: Cobertura[]): EstadoCobertura {
  if (!fontes.length) return "confirmado";
  const linhas = fontes.map(f => estados.find(s => s.fonte === f));
  if (linhas.some(s => !s || !s.concluido_em)) return "aguardando sincronização";
  return linhas.every(s => s?.cobertura?.some(c => dia >= c.de && dia <= c.ate)) ? "confirmado" : "parcial";
}