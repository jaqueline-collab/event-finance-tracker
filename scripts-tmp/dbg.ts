import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerTudo } from "@/lib/elora-espelho.server";
const db:any=supabaseAdmin;
const r:any[]=await lerTudo(()=>db.rpc("elora_conversas_pares",{_cliente_id:"8c0ojhr2",_inicio:"2026-10-14T03:00:00Z",_fim:"2026-11-13T03:00:00Z",_excluir:[]}).order("sessao_id").order("primeira_em"),8);
const c=(f:any)=>r.filter(f).length;
console.log("pares",r.length,"usuario",c((x:any)=>x.usuario),"humano",c((x:any)=>x.humano_user),"usuario sem humano",c((x:any)=>x.usuario&&!x.humano_user));
const u:any={};for(const x of r) if(x.humano_user) u[x.humano_user]=(u[x.humano_user]??0)+1; console.log(u);
const m=await db.from("elora_mensagens_espelho").select("user_id_elora, origem:payload->>origin, direcao").eq("cliente_id","8c0ojhr2").eq("direcao","TO_HUB").gte("enviada_em","2026-11-01").limit(2000);
const g:any={};for(const x of m.data) {const k=(x.origem)+"|"+(x.user_id_elora?"com":"sem");g[k]=(g[k]??0)+1} console.log(g);
process.exit(0)
