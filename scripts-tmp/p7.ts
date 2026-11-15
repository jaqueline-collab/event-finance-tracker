import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
let t=performance.now(); const {data}=await (db as any).from("elora_calculo_cache").select("chave, valor").eq("cliente_id","8c0ojhr2").not("valor->gz","is",null).limit(1).maybeSingle(); console.log("leitura",((performance.now()-t)/1000).toFixed(2), data?.valor?.gz?.length);
t=performance.now(); await (db as any).rpc("elora_versoes_cache",{_cliente_id:"8c0ojhr2"}); console.log("versoes",((performance.now()-t)/1000).toFixed(2));
process.exit(0);
