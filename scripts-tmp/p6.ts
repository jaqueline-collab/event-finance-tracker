import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerBaseCampos } from "@/lib/campos-elora.server";
const t=performance.now(); const b=await lerBaseCampos(supabaseAdmin as any,"8c0ojhr2"); console.log(process.argv[2],b.contatos.length,((performance.now()-t)/1000).toFixed(2)); process.exit(0);
