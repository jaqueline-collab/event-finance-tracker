import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data: p, error } = await sb.rpc("elora_conversas_pares", { _cliente_id: "8c0ojhr2", _inicio: "2026-11-10T03:00:00Z", _fim: "2026-11-11T03:00:00Z" });
if (error) throw error;
const ids = p.map((x: any) => x.sessao_id);
const at: Record<string, any> = {};
for (let i = 0; i < ids.length; i += 150) {
  const { data } = await sb.from("elora_atendimentos_espelho").select("externo_id, atendente_nome, criado_em, canal_nome").eq("cliente_id", "8c0ojhr2").in("externo_id", ids.slice(i, i + 150));
  for (const a of data ?? []) at[a.externo_id] = a;
}
const g: Record<string, { n: number; u: number; b: number; ex: string[] }> = {};
for (const x of p) { const k = at[x.sessao_id]?.atendente_nome ?? "(vazio)"; const r = (g[k] ??= { n: 0, u: 0, b: 0, ex: [] }); r.n++; x.usuario ? r.u++ : r.b++; if (r.ex.length < 2) r.ex.push(x.sessao_id); }
console.log("total", p.length, JSON.stringify(g, null, 1));
const ex = p.find((x: any) => at[x.sessao_id]?.atendente_nome === "Jaqueline Ditós" && !x.usuario);
console.log("exemplo", JSON.stringify(ex), JSON.stringify(at[ex?.sessao_id]));
