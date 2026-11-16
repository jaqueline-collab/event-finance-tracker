import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calcularPeloLink } from "@/lib/incorporar.server";
import { cartoesValidos } from "@/lib/graficos";
import { calcularCartoesServidor } from "@/lib/cartao-calculo.server";
import { filtrosFixosValidos } from "@/lib/filtros-fixos";
import { readFileSync } from "fs";
const db: any = supabaseAdmin; const A = "8c0ojhr2";
const tk = JSON.parse(readFileSync("/tmp/inc-tokens.json","utf8")).tokens.Resultados;
const { data: v } = await db.from("elora_dashboard_visoes").select("filtros").eq("cliente_id", A).eq("nome","Resultados").single();
const cs = cartoesValidos(v.filtros.cartoes); const fx = filtrosFixosValidos(v.filtros.filtrosFixos);
const p = { de: "2026-10-14", ate: "2026-11-12" };
const L = (x:any)=>JSON.parse(JSON.stringify(x));
const n1 = L(await calcularCartoesServidor(db, { clienteId: A, ...p, filtrosVisao: fx }, cs, { semDinheiro: false }, { usarCache: false }));
const n2 = L(await calcularCartoesServidor(db, { clienteId: A, ...p, filtrosVisao: fx }, cs, { semDinheiro: false }, { usarCache: true }));
const l = L(await calcularPeloLink(db, tk, { ...p, cartoes: cs, filtrosVisao: [] }));
for (const k of Object.keys(n1)) { const a=JSON.stringify(n1[k]), b=JSON.stringify(n2[k]), c=JSON.stringify(l[k]); if (a!==b||a!==c) console.log(k, "semCache=comCache?", a===b, "semCache=link?", a===c, "comCache=link?", b===c, a.slice(0,200), "|", c.slice(0,200)); }
const { data: s } = await db.from("elora_sync_estado").select("fonte, atualizado_em, status").eq("cliente_id", A); console.log(JSON.stringify(s));
process.exit(0);
