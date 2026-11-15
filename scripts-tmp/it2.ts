import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerLeiturasCards } from "@/lib/matriz.server";
import { lerConfig } from "@/lib/indicadores.server";
import { cardsPorDataGravada } from "@/lib/indicadores-motor";
const db:any=supabaseAdmin; const CL="8c0ojhr2";
const [cfgs, ls]=await Promise.all([lerConfig(db,CL), lerLeiturasCards(db,CL)]);
const campos:any={consulta_agendada:{fonte:"card",campo:"campo.data-da-consulta"},procedimento_vendido:{fonte:"card",campo:"campo.data-do-procedimento"}};
for (const p of [{de:"2026-10-14",ate:"2026-11-12"},{de:"2026-09-22",ate:"2026-10-03"}]) {
  const s=new Set<string>(); for (const k of Object.keys(campos)) for (const x of cardsPorDataGravada(cfgs.find((c:any)=>c.chave===k)!, ls, campos[k], p.de, p.ate)) s.add(x.card_id);
  console.log(p.de, "por data gravada:", s.size);
}
process.exit(0);
