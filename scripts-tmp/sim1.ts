import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { lerLeiturasCards } from "@/lib/matriz.server";
import { lerConfig } from "@/lib/indicadores.server";
import { calcularIndicadoresCards, diaDoCard, eventoVale, avaliarGrupo, ehCombinadaDeCard } from "@/lib/indicadores-motor";
import { catalogoDoCliente } from "@/lib/campos-elora.server";
import { doisValoresDeCards, cartoesValidos } from "@/lib/graficos";
import { writeFileSync } from "fs";
const db: any = supabaseAdmin; const CL = "8c0ojhr2"; const CORTE = "2026-11-05";
const PER = [{ de: "2026-10-14", ate: "2026-11-12" }, { de: "2026-09-22", ate: "2026-10-03" }];
const [cfgs, ls, cat] = await Promise.all([lerConfig(db, CL), lerLeiturasCards(db, CL), catalogoDoCliente(db, CL)]);
const cardCfgs = cfgs.filter((c: any) => c.ativo && ehCombinadaDeCard(c));
const m = calcularIndicadoresCards(cfgs, ls);
const porCard = new Map<string, any[]>(); for (const l of ls) porCard.set(l.card_id, [...(porCard.get(l.card_id) ?? []), l]);
const ultima = (id: string) => [...porCard.get(id)!].sort((a, b) => b.visto_em.localeCompare(a.visto_em))[0];
const diaCampo = (v: any) => { const s = String(Array.isArray(v) ? v[0] : v ?? ""); const d = s.match(/^\d{4}-\d{2}-\d{2}/)?.[0]; if (d) return new Date(s).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); const b = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return b ? `${b[3]}-${b[2]}-${b[1]}` : null; };
const { data: vs } = await db.from("elora_dashboard_visoes").select("nome, filtros").eq("cliente_id", CL);
const dv = vs.flatMap((v: any) => cartoesValidos(v.filtros?.cartoes)).filter((c: any) => c.tipo === "dois_valores" && c.indicador);
const out: any = { matriz: [], blocos: [] };
let amostra: any = null;
for (const p of PER) {
  for (const cfg of cardCfgs) {
    let antes = 0, depois = 0, diasTraco = 0;
    for (const [dia, lin] of m) { if (dia < p.de || dia > p.ate) continue; const c = lin[cfg.chave]; if (!c) continue; antes += c.valor; if (dia >= CORTE) depois += c.valor - c.estimado; }
    for (let d = new Date(p.de + "T12:00:00Z"); d.toISOString().slice(0, 10) <= p.ate; d.setUTCDate(d.getUTCDate() + 1)) if (d.toISOString().slice(0, 10) < CORTE) diasTraco++;
    out.matriz.push({ periodo: `${p.de}_${p.ate}`, coluna: cfg.nome, antes, depois, diasTraco });
  }
  for (const c of dv) {
    const cfg: any = cfgs.find((x: any) => x.chave === c.indicador);
    const campoData = (cfg.condicoes.itens.find((i: any) => /data/.test(i.campo.campo))).campo;
    const chave = `card.${campoData.campo}`;
    const contadosAntes: any[] = []; const contadosDepois: any[] = [];
    for (const [id, l] of porCard) {
      const r = diaDoCard(cfg, l); if (r && r.dia >= p.de && r.dia <= p.ate) contadosAntes.push({ card_id: id, ...r });
      const vale = l.some((x: any) => eventoVale(cfg.evento, x) && avaliarGrupo(cfg.condicoes, x.campos));
      if (!vale) continue;
      const v = ultima(id).campos[chave]; if (!amostra) amostra = v;
      const d = diaCampo(v); if (d && d >= p.de && d <= p.ate) contadosDepois.push({ card_id: id, dia: d, estimado: false });
    }
    const a = doisValoresDeCards(cat.base, c, contadosAntes, null), b = doisValoresDeCards(cat.base, c, contadosDepois, null);
    out.blocos.push({ periodo: `${p.de}_${p.ate}`, bloco: c.titulo, qtdAntes: a.qtd, valorAntes: a.total, estimadosAntes: a.qtdEstimados, qtdDepois: b.qtd, valorDepois: b.total });
  }
}
console.log("amostra campo data:", amostra);
console.table(out.matriz); console.table(out.blocos);
writeFileSync("scripts-tmp/sim1.json", JSON.stringify(out));
process.exit(0);
