import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerBaseCampos } from "@/lib/campos-elora.server";
import { calcularCartoesServidor } from "@/lib/cartao-calculo.server";
import { cartoesValidos } from "@/lib/graficos";
const db: any = supabaseAdmin; const CL="8c0ojhr2"; const p={de:"2026-10-14",ate:"2026-11-12"};
const { data: vs } = await db.from("elora_dashboard_visoes").select("nome, filtros").eq("cliente_id", CL);
let a=performance.now(); await lerBaseCampos(db,CL); console.log("base",((performance.now()-a)/1000).toFixed(2));
for (const v of vs){ const cs=cartoesValidos(v.filtros?.cartoes); a=performance.now(); await calcularCartoesServidor(db,{clienteId:CL,...p,filtrosVisao:[]},cs,{semDinheiro:false},{usarCache:false}); console.log(v.nome,"(catálogo quente)",((performance.now()-a)/1000).toFixed(2), cs.map((c:any)=>c.tipo).join(","));}
process.exit(0);
