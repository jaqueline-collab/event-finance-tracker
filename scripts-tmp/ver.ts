import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
const { data: vs } = await (db as any).from("elora_dashboard_visoes").select("nome, filtros").eq("cliente_id","8c0ojhr2");
for (const v of vs) for (const c of v.filtros?.cartoes ?? []) if (/consulta|procedimento/i.test(c.titulo ?? "")) console.log(v.nome, JSON.stringify(c));
const { data: ic } = await (db as any).from("elora_indicadores_config").select("chave,nome,tipo,fonte,evento,condicoes,ativo").eq("cliente_id","8c0ojhr2");
for (const i of ic) console.log("IND", JSON.stringify(i));
const { data: h } = await (db as any).from("elora_cards_historico").select("estimado, visto_em").eq("cliente_id","8c0ojhr2").eq("estimado", false).order("visto_em").limit(1);
console.log("primeira exata", h);
process.exit(0);
