import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { abrirLink, calcularPeloLink, matrizPeloLink } from "@/lib/incorporar.server";
import { hashToken, novoToken, cartoesDoLink } from "@/lib/incorporar";
import { cartoesValidos, cartoesDaMatriz } from "@/lib/graficos";
import { calcularCartoesServidor } from "@/lib/cartao-calculo.server";
import { montarMatrizCliente } from "@/lib/matriz.server";
import { criarContexto } from "@/lib/calculo-contexto.server";
import { filtrosFixosValidos } from "@/lib/filtros-fixos";
import { filtrosPadraoValidos } from "@/lib/campos-elora";
import { separarFiltros } from "@/lib/campos-elora";
import { writeFileSync } from "fs";
const db: any = supabaseAdmin; const A = "8c0ojhr2";
const PER = [{ de: "2026-10-14", ate: "2026-11-12" }, { de: "2026-09-22", ate: "2026-10-03" }];
const ord = (x: any): any => Array.isArray(x) ? x.map(ord) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, ord(x[k])])) : x;
const L = (x: any) => JSON.stringify(ord(JSON.parse(JSON.stringify(x))));
const t = novoToken();
const { data: ins, error } = await db.from("elora_paineis_incorporados").insert({ cliente_id: A, visao_id: null, token_hash: await hashToken(t) }).select("id").single();
if (error) throw error;
const l = await abrirLink(db, t, true);
console.log("abas:", l!.abas.map((a) => a.nome).join(" | "));
const { data: vs } = await db.from("elora_dashboard_visoes").select("id, nome, ordem, publicada, filtros").eq("cliente_id", A).order("ordem");
console.log("painel (visíveis):", vs.filter((v: any) => v.publicada).map((v: any) => v.nome).join(" | "), "· ocultas:", vs.filter((v: any) => !v.publicada).map((v: any) => v.nome).join(", ") || "nenhuma");
const { data: cfg } = await db.from("elora_relatorio_corte_config").select("matriz_cartoes, matriz_filtros_padrao, matriz_ordem").eq("cliente_id", A).maybeSingle();
const tab: string[] = []; let dif = 0;
for (const a of l!.abas) for (const p of PER) {
  let normal: any, link: any;
  if (a.matriz) {
    const padrao = filtrosPadraoValidos(cfg?.matriz_filtros_padrao);
    const { diretos, outros } = separarFiltros(padrao, new Set(["atendimento|canal","atendimento|atendente","atendimento|equipe"]) as any);
    const n = await montarMatrizCliente(db, A, p, diretos as any, { comCatalogo: false, campos: outros as any, ctx: criarContexto() });
    normal = { colunas: n.colunas, linhas: n.linhas, total: n.total };
    const k = await matrizPeloLink(db, t, { ...p, filtros: diretos as any, campos: outros as any });
    link = { colunas: k.colunas, linhas: k.linhas, total: k.total };
    const cs = cartoesDaMatriz(cfg?.matriz_cartoes);
    const nb = await calcularCartoesServidor(db, { clienteId: A, ...p, filtrosVisao: [] }, cs, { semDinheiro: false }, { usarCache: false });
    const lb = await calcularPeloLink(db, t, { abaId: a.id, ...p, cartoes: cs, filtrosVisao: [] });
    normal.blocos = nb; link.blocos = lb;
  } else {
    const v = vs.find((x: any) => x.id === a.id);
    const todos = cartoesDoLink(cartoesValidos(v.filtros?.cartoes), (v.filtros?.cartoesOcultos ?? []).map(String), false);
    normal = await calcularCartoesServidor(db, { clienteId: A, ...p, filtrosVisao: filtrosFixosValidos(v.filtros?.filtrosFixos) }, todos, { semDinheiro: false }, { usarCache: false });
    link = await calcularPeloLink(db, t, { abaId: a.id, ...p, cartoes: todos, filtrosVisao: [] });
  }
  const ok = L(normal) === L(link); if (!ok) dif++;
  const tot = a.matriz ? `conversas no total: ${JSON.stringify(Object.values(link.total).slice(0,1))}` : `${Object.keys(link).length} blocos`;
  tab.push(`| ${a.nome} | ${p.de.slice(8)}/${p.de.slice(5,7)}–${p.ate.slice(8)}/${p.ate.slice(5,7)} | ${a.matriz ? link.colunas.length + " colunas, " + link.linhas.length + " dias" : Object.keys(link).length + " blocos"} | ${ok ? "iguais" : "DIFERENTES"} |`);
}
console.log(tab.join("\n")); console.log("diferencas", dif);
console.log("colunas Relatório diário:", (await matrizPeloLink(db, t, { ...PER[0], filtros: {}, campos: [] })).colunas.map((c: any) => c.nome).join(", "));
// permissões pelo navegador
for (const [nome, key] of [["visitante", process.env.SUPABASE_PUBLISHABLE_KEY!]]) {
  const c = createClient(process.env.SUPABASE_URL!, key, { auth: { persistSession: false }, global: { fetch: (i: any, init: any) => { const h = new Headers(init?.headers); if (key.startsWith("sb_")) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } } });
  const r = await c.from("elora_paineis_incorporados").select("id").limit(1);
  console.log(nome, "lê a tabela?", r.error ? `não (${r.error.code})` : `linhas: ${r.data?.length}`);
}
const { data: priv } = await db.rpc("pg_has", {}).then(() => ({ data: null }), () => ({ data: null }));
// revogado + token inválido
await db.from("elora_paineis_incorporados").update({ revogado_em: new Date().toISOString() }).eq("id", ins.id);
console.log("revogado abre?", await abrirLink(db, t, false));
try { await calcularPeloLink(db, t, { abaId: "x", ...PER[0], cartoes: [], filtrosVisao: [] }); } catch (e: any) { console.log("erro do revogado:", e.message, "· contém token?", e.message.includes(t)); }
// link novo para o navegador
const t2 = novoToken();
await db.from("elora_paineis_incorporados").insert({ cliente_id: A, visao_id: null, token_hash: await hashToken(t2) });
writeFileSync("/tmp/inc-tokens.json", JSON.stringify({ todas: t2, revogado: t }));
process.exit(0);
