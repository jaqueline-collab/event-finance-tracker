import { supabaseAdmin } from "@/integrations/supabase/client.server";
await (supabaseAdmin as any).from("elora_paineis_incorporados").delete().eq("cliente_id", "8c0ojhr2").is("criado_por", null);
process.exit(0);
