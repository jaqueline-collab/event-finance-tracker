import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { contextoElora } from "@/lib/elora-cards.server";
import { rodarFonte, gravarExecucao, pegarTrava, soltarTrava } from "@/lib/sync-orquestrador.server";
const fonte = process.argv[2] as any; const max = Number(process.argv[3] ?? 1);
const db = supabaseAdmin as any; const cid = "8c0ojhr2";
const t0 = Date.now();
for (let i = 1; i <= max; i++) {
  const ctx = await contextoElora(db, cid);
  const dono = `manual-${crypto.randomUUID()}`;
  if (!(await pegarTrava(db, cid, dono))) { console.log("travado"); break; }
  let r;
  try { r = await rodarFonte(db, cid, fonte, ctx!, 25_000); await gravarExecucao(db, cid, { ...r, situacao: r.erro ? "erro" : r.concluido ? "concluida" : "em_andamento" }); }
  finally { await soltarTrava(db, cid, dono); }
  console.log(`rodada ${i}`, JSON.stringify(r), `${Math.round((Date.now()-t0)/1000)}s`);
  if (r.concluido || r.erro) break;
}
