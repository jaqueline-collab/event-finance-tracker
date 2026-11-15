import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerBaseCampos } from "@/lib/campos-elora.server";
const b=await lerBaseCampos(supabaseAdmin as any,"8c0ojhr2"); const s=JSON.stringify(b); console.log("MB",(s.length/1e6).toFixed(1));
const t=performance.now(); const {gzipSync}=await import("zlib"); console.log("gz MB",(gzipSync(s).length/1e6).toFixed(2),((performance.now()-t)/1000).toFixed(2));
process.exit(0);
