import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { contextoElora } from "@/lib/elora-cards.server";
const db: any = supabaseAdmin; const ctx: any = await contextoElora(db, "8c0ojhr2");
const { data } = await db.from("elora_cards_espelho").select("externo_id,payload").eq("cliente_id","8c0ojhr2").limit(1);
const id = data[0].externo_id; console.log("chaves do card:", Object.keys(data[0].payload).join(","));
for (const p of [`/crm/v2/panel/card/${id}`, `/crm/v2/panel/card/${id}/history`, `/crm/v2/panel/card/${id}/histories`, `/crm/v2/panel/card/${id}/timeline`, `/crm/v2/panel/card/${id}/activities`, `/crm/v1/panel/card/${id}/history`, `/crm/v2/panel/card/history?CardId=${id}`, `/crm/v2/panel/card/${id}/notes`]) {
  const r = await fetch(ctx.base + p, { headers: { Authorization: `Bearer ${ctx.chave}` } });
  const t = await r.text(); console.log(r.status, p.replace(id, "{id}"), t.slice(0, 160).replace(/\s+/g, " "));
}
process.exit(0);
