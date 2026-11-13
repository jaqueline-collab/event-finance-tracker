import { createClient } from "@supabase/supabase-js";
import { montarMatrizCliente } from "./src/lib/matriz.server";
import { calcularPainelVisual } from "./src/lib/painel-visual.server";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const p = { de: "2026-10-14", ate: "2026-11-12" };
const [m, v] = await Promise.all([montarMatrizCliente(sb as any, "8c0ojhr2", p, {} as any), calcularPainelVisual(sb, "8c0ojhr2", p)]);
console.log("matriz cols", Object.keys(m).join(","));
console.log("totais matriz", JSON.stringify((m as any).totais ?? (m as any).total).slice(0,600));
console.log("painel", JSON.stringify((v as any).kpis ?? Object.keys(v)).slice(0,800));
