import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { abrirLink, calcularPeloLink } from "@/lib/incorporar.server";
import { hashToken, novoToken, cartoesDoLink } from "@/lib/incorporar";
import { cartoesValidos } from "@/lib/graficos";
import { calcularCartoesServidor } from "@/lib/cartao-calculo.server";
import { filtrosFixosValidos } from "@/lib/filtros-fixos";
import { writeFileSync } from "fs";
const db: any = supabaseAdmin;
const A = "8c0ojhr2";
const PER = [{ de: "2026-10-14", ate: "2026-11-12" }, { de: "2026-09-22", ate: "2026-10-03" }];
const { data: vs } = await db.from("elora_dashboard_visoes").select("id, nome, publicada, filtros, cliente_id").eq("publicada", true);
const doA = vs.filter((v: any) => v.cliente_id === A);
const deB = { cliente_id: "(bloco de fora)", filtros: { cartoes: [{ id: "bloco-de-outro-cliente", titulo: "X", tipo: "numero", fonte: "contato" }] } };
const criados: string[] = []; const tokens: Record<string, string> = {};
async function criar(cliente: string, visao: string, pessoais = false) {
  const t = novoToken();
  const { data, error } = await db.from("elora_paineis_incorporados").insert({ cliente_id: cliente, visao_id: visao, token_hash: await hashToken(t), dados_pessoais: pessoais }).select("id").single();
  if (error) throw error; criados.push(data.id); return t;
}
const limpa = (x: any) => JSON.parse(JSON.stringify(x));
let dif = 0; const linhas: string[] = [];
for (const v of doA) {
  const t = await criar(A, v.id, true); tokens[v.nome] = t;
  const todos = cartoesDoLink(cartoesValidos(v.filtros?.cartoes), (v.filtros?.cartoesOcultos ?? []).map(String), true);
  const fixos = filtrosFixosValidos(v.filtros?.filtrosFixos);
  for (const p of PER) {
    const normal = limpa(await calcularCartoesServidor(db, { clienteId: A, ...p, filtrosVisao: fixos }, todos, { semDinheiro: false }, { usarCache: false }));
    const link = limpa(await calcularPeloLink(db, t, { ...p, cartoes: todos, filtrosVisao: [] }));
    const iguais = JSON.stringify(normal) === JSON.stringify(link);
    if (!iguais) dif++;
    linhas.push(`${v.nome} ${p.de}..${p.ate}: ${todos.length} blocos, ${iguais ? "iguais" : "DIFERENTES"}`);
  }
}
console.log(linhas.join("\n"));
// outro cliente: pedir blocos de B com link de A
const tA = Object.values(tokens)[0];
const r = await calcularPeloLink(db, tA, { ...PER[0], cartoes: cartoesValidos(deB.filtros.cartoes).map((c) => ({ ...c, id: c.id + (doA.some((v: any) => cartoesValidos(v.filtros?.cartoes).some((x) => x.id === c.id)) ? "" : "") })), filtrosVisao: [] });
const idsA = new Set(doA.flatMap((v: any) => cartoesValidos(v.filtros?.cartoes).map((c) => c.id)));
console.log("outro cliente: blocos de", deB.cliente_id, "pedidos pelo link de A →", Object.keys(r).filter((k) => !idsA.has(k)).length, "devolvidos");
const lA = await abrirLink(db, tA, false);
console.log("link de A abre cliente", lA?.clienteId);
// revogar
await db.from("elora_paineis_incorporados").update({ revogado_em: new Date().toISOString() }).eq("token_hash", await hashToken(tA));
console.log("revogado abre?", await abrirLink(db, tA, false));
try { await calcularPeloLink(db, tA, { ...PER[0], cartoes: [], filtrosVisao: [] }); console.log("revogado calculou!"); } catch (e: any) { console.log("revogado calcula?", e.message); }
console.log("token inventado abre?", await abrirLink(db, novoToken(), false));
// link de privacidade padrão
const vR = doA.find((v: any) => v.nome === "Agendamentos") ?? doA[0];
await db.from("elora_paineis_incorporados").update({ revogado_em: new Date().toISOString() }).eq("visao_id", vR.id).is("revogado_em", null);
const tP = await criar(A, vR.id, false);
const lp = await abrirLink(db, tP, false);
console.log("privacidade padrão em", vR.nome, ":", lp?.cartoes.map((c) => c.tipo).join(","));
writeFileSync("/tmp/inc-tokens.json", JSON.stringify({ tokens, privado: tP, criados, B: deB.cliente_id }));
console.log("diferencas", dif);
process.exit(0);
