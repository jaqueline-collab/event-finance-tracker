import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerTudo } from "@/lib/ler-paginas.server";
const db: any = supabaseAdmin; const CL="8c0ojhr2";
const pn = (await db.from("elora_apoio_espelho").select("externo_id, nome, payload").eq("cliente_id", CL).eq("tipo","painel")).data;
for (const p of pn) console.log(p.nome, p.externo_id, p.payload.type, "steps", JSON.stringify(p.payload.steps).slice(0,300), JSON.stringify(p.payload.stepTitles));
const cs = await lerTudo(() => db.from("elora_cards_espelho").select("externo_id, painel_titulo, etapa_titulo, etapa_fase, status, stepId:payload->stepId, panelId:payload->panelId").eq("cliente_id", CL).order("externo_id"));
const g: any = {}; for (const c of cs) { const k = `${c.painel_titulo} | ${c.etapa_titulo} | ${c.etapa_fase} | ${c.status}`; g[k]=(g[k]??0)+1; }
console.log(cs.length); console.log(Object.entries(g).sort().map(([k,v])=>`${v}\t${k}`).join("\n"));
process.exit(0);
