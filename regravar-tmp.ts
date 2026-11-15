import { contaDoCliente, lerApiElora, camposCompletos } from "@/lib/integracao-elora.functions";
import { writeFileSync } from "fs";
const CL = "jvu3dzqk";
const { conta, supabaseAdmin: db } = await contaDoCliente(CL) as any;
const tam = async () => (await db.rpc("pg_total_relation_size" as any, {})).data;
const { data: antes } = await db.from("elora_contatos_sincronizados").select("*").eq("cliente_id", CL).range(0, 9999);
writeFileSync("/mnt/documents/desempenho/backup-contatos-sincronizados-jvu3dzqk.json", JSON.stringify(antes));
const porId = new Map(antes.map((r: any) => [r.contact_id, r]));
const t0 = performance.now(); let pagina = 0, chamadas = 0; const novos = new Map<string, Record<string, string>>();
for (;;) {
  pagina++; chamadas++;
  const resp: any = await lerApiElora(String(conta.base_url), String(conta.api_key), "core", "/v1/contact/filter", { metodo: "POST", corpo: { pageNumber: pagina, pageSize: 100, createdAt: { after: new Date(0).toISOString(), before: conta.ultima_sync }, includeDetails: ["CustomFields"] } });
  const itens = resp?.items ?? [];
  for (const c of itens) if (porId.has(String(c.id))) novos.set(String(c.id), camposCompletos(c.customFields ?? {}));
  if (!resp?.hasMorePages || !itens.length) break;
  await new Promise((r) => setTimeout(r, 500));
}
const tLeitura = performance.now() - t0;
// regra de parada: os campos antigos têm de continuar idênticos dentro dos novos
const problemas: string[] = [];
for (const [id, r] of porId as any) {
  const n = novos.get(id); if (!n) { problemas.push(`${id}: não veio da API`); continue; }
  for (const [k, v] of Object.entries(r.campos_personalizados ?? {})) if (n[k] !== v) problemas.push(`${id}.${k}: ${v} -> ${n[k]}`);
}
console.log(JSON.stringify({ paginas: pagina, chamadas, contatosAntigos: porId.size, vindos: novos.size, leitura_s: (tLeitura / 1000).toFixed(1), problemas: problemas.length, exemplos: problemas.slice(0, 5) }));
if (problemas.length) { console.log("PAROU: algum valor mudaria"); process.exit(0); }
const t1 = performance.now();
const linhas = [...porId.values()].map((r: any) => ({ ...r, campos_personalizados: novos.get(r.contact_id) }));
for (let i = 0; i < linhas.length; i += 200) { const { error } = await db.from("elora_contatos_sincronizados").upsert(linhas.slice(i, i + 200), { onConflict: "cliente_id,contact_id" }); if (error) throw error; }
const camposAntes = antes.reduce((a: number, r: any) => a + Object.keys(r.campos_personalizados ?? {}).length, 0);
const camposDepois = linhas.reduce((a: number, r: any) => a + Object.keys(r.campos_personalizados).length, 0);
console.log(JSON.stringify({ gravacao_s: ((performance.now() - t1) / 1000).toFixed(1), total_s: ((performance.now() - t0) / 1000).toFixed(1), camposAntes, camposDepois, bytesJsonAntes: JSON.stringify(antes.map((r: any) => r.campos_personalizados)).length, bytesJsonDepois: JSON.stringify(linhas.map((r: any) => r.campos_personalizados)).length }));
process.exit(0);
