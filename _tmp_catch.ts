import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { contextoElora } from "@/lib/elora-cards.server";
import { pegarTrava, soltarTrava, rodarFonte, FONTES_SYNC } from "@/lib/sync-orquestrador.server";
const db:any = supabaseAdmin, CL="8c0ojhr2"; const t0=Date.now();
const ctx = (await contextoElora(db, CL))!;
for (const f of FONTES_SYNC) {
  for (let i=0;i<400;i++) {
    const dono="manual-recuperacao";
    if (!(await pegarTrava(db, CL, dono))) { console.log("travado"); await new Promise(r=>setTimeout(r,20000)); continue; }
    let r; try { r = await rodarFonte(db, CL, f, ctx, 60000); } finally { await soltarTrava(db, CL, dono); }
    console.log(new Date().toISOString(), f, JSON.stringify(r), Math.round((Date.now()-t0)/1000)+"s");
    if (r.concluido || r.erro) break;
  }
}
console.log("FIM", Math.round((Date.now()-t0)/1000), "s", "chamadas", ctx.chamadas);
