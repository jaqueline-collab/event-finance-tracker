/**
 * Visão padrão do painel: a primeira por ordem. Se o cliente não tiver
 * nenhuma, cria "Resultados" publicada e liga os widgets soltos a ela.
 * Recebe o cliente admin (service role) — chamar só depois de autorizar.
 */
export async function visaoPadrao(admin: any, clienteId: string): Promise<string> {
  const { data: atual } = await admin
    .from("elora_dashboard_visoes")
    .select("id, filtros")
    .eq("cliente_id", clienteId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (atual?.id) return String(atual.id);
  const { data: nova, error } = await admin
    .from("elora_dashboard_visoes")
    .insert({ cliente_id: clienteId, nome: "Resultados", ordem: 0, publicada: true, filtros: { cartoes: (await import("./graficos")).CARTOES_PAINEL, painelCartoesMigrado: true } })
    .select("id")
    .single();
  if (error) throw new Error(`visoes: ${error.message}`);
  await admin
    .from("elora_dashboard_widgets")
    .update({ visao_id: nova.id })
    .eq("cliente_id", clienteId)
    .is("visao_id", null);
  return String(nova.id);
}

/** Confere que a visão pertence ao cliente; devolve se está publicada. */
export async function conferirVisao(admin: any, clienteId: string, visaoId: string) {
  const { data } = await admin
    .from("elora_dashboard_visoes")
    .select("id, publicada")
    .eq("id", visaoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!data) throw new Error("visoes: esta visão não pertence a este cliente.");
  return { publicada: Boolean(data.publicada) };
}
