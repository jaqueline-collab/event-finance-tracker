import { supabaseAdmin } from "@/integrations/supabase/client.server";
const db:any=supabaseAdmin;
const r=await db.rpc("elora_conversas_pares",{_cliente_id:"8c0ojhr2",_inicio:"2026-11-01T03:00:00Z",_fim:"2026-11-05T03:00:00Z",_excluir:[]}).limit(5);
console.log(r.error, r.data);
const u=await db.rpc("elora_ultimo_humano_sessao",{_cliente_id:"8c0ojhr2",_excluir:[]}).limit(3); console.log(u.error,u.data);
process.exit(0)
