import { supabaseAdmin } from "@/integrations/supabase/client.server";
const db: any = supabaseAdmin;
const r = await db.from("elora_paineis_sincronizados").select("*").eq("cliente_id","8c0ojhr2").eq("painel_id","324f16fc-b562-4001-b012-57f3e371b218");
console.log(JSON.stringify(r.data).slice(0,3000), r.error);
process.exit(0);
