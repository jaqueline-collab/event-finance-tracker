import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calcularCartaoServidor } from "@/lib/cartao-calculo.server";
import { cartoesValidos } from "@/lib/graficos";
import { montarMatrizCliente } from "@/lib/matriz.server";
import { writeFileSync } from "fs";
const db: any = supabaseAdmin;
const CL = "8c0ojhr2";
const PER = [{ de: "2026-10-14", ate: "2026-11-12" }, { de: "2026-09-22", ate: "2026-10-03" }];
const modo = process.argv[2] ?? "numeros"; const saida = process.argv[3];
const { data: vs } = await db.from("elora_dashboard_visoes").select("id, nome, filtros, publicada").eq("cliente_id", CL).order("ordem");
const limpa = (x: any): any => JSON.parse(JSON.stringify(x));
if (modo === "numeros") {
  const out: any = {};
  for (const p of PER) {
    const k = `${p.de}_${p.ate}`; out[k] = {};
    for (const v of vs) {
      const cs = cartoesValidos(v.filtros?.cartoes); const r: any = {};
      for (const c of cs) r[c.id] = limpa(await calcularCartaoServidor(db, { clienteId: CL, ...p, filtrosVisao: [] }, c, { semDinheiro: false }));
      out[k][v.nome] = r;
    }
    const m = await montarMatrizCliente(db, CL, p, {});
    out[k].Matriz = limpa({ linhas: m.linhas, colunas: m.todasColunas.map((c: any) => c.chave) });
  }
  writeFileSync(saida, JSON.stringify(out));
  console.log("ok", Object.keys(out[Object.keys(out)[0]]));
} else {
  const p = PER[0]; const alvo = process.argv[3];
  const t0 = performance.now();
  if (alvo === "Matriz") await montarMatrizCliente(db, CL, p, {});
  else { const v = vs.find((x: any) => x.nome === alvo); const cs = cartoesValidos(v.filtros?.cartoes);
    await Promise.all(cs.map((c) => calcularCartaoServidor(db, { clienteId: CL, ...p, filtrosVisao: [] }, c, { semDinheiro: false }))); }
  console.log(alvo, ((performance.now() - t0) / 1000).toFixed(1) + "s");
}
process.exit(0);
