import { describe, expect, it } from "vitest";
import { calcularPadraoPorCorteDetalhado, COLUNAS_PADRAO, restringirAContatos } from "@/lib/indicadores-motor";
import { listaDias } from "@/lib/painel-visual";
import { diasDiferentes } from "@/lib/relatorio-recalculo.server";

// Base sintética de 12 dias: contatos com e sem campanha, sessões em 2 canais, bot e humano.
const dias = listaDias({ de: "2026-09-22", ate: "2026-10-03" });
const contatos: any[] = [], sessoes: any[] = [], msgs: any[] = [];
dias.forEach((d, i) => {
  for (let k = 0; k < 4; k++) {
    const id = `c${i}-${k}`;
    contatos.push({ externo_id: id, criado_em: `${d}T15:0${k}:00Z`, origem: k === 3 ? "IMPORTED" : "CREATED_FROM_HUB", utm_campaign: k % 2 ? "Campanha" : null });
    const sid = `s${i}-${k}`;
    sessoes.push({ id: sid, contato_id: id, canal_id: k % 2 ? "A" : "B", canal_nome: null, responsavel_id: k === 0 ? "u1" : null, responsavel_nome: null });
    msgs.push({ sessao_id: sid, enviada_em: `${d}T16:00:00Z`, tipo: "TEXT", origem: k === 0 ? "DEFAULT" : "BOT", user_id: k === 0 ? "u1" : null, direcao: "TO_HUB" });
  }
});
const cfg = { nomeCanal: { A: "Canal A", B: "Canal B" }, equipePorCanal: {}, agentes: { u1: { nome: "Pessoa" } }, ignorar: [] };
const calcular = (filtro?: Set<string>) => {
  let d = { sessoes, msgs, contatos, primeiras: sessoes };
  if (filtro) d = restringirAContatos(filtro, d) as any;
  return calcularPadraoPorCorteDetalhado(
    d.contatos.map((x) => ({ id: x.externo_id, criado_em: x.criado_em, origem: x.origem, utm_campaign: x.utm_campaign })),
    d.msgs, d.sessoes, cfg as any, d.primeiras,
  ).linhas as any[];
};
const porDia = (linhas: any[]) => Object.fromEntries(dias.map((d) => [d, Object.fromEntries(COLUNAS_PADRAO.map((c) => [c.chave, linhas.filter((l) => l.dia === d).reduce((a, l) => a + Number(l[c.chave] ?? 0), 0)]))]));

describe("Matriz: caminho sem filtro = filtro que não exclui ninguém", () => {
  it("dá exatamente o mesmo número em todas as colunas padrão, em todos os dias", () => {
    const sem = calcular();
    const com = calcular(new Set(contatos.map((c) => c.externo_id)));
    const a = porDia(sem), b = porDia(com);
    for (const d of dias) for (const c of COLUNAS_PADRAO) expect(b[d][c.chave], `${d} ${c.chave}`).toBe(a[d][c.chave]);
    expect(diasDiferentes(sem.map((l) => ({ ...l, data: l.dia })), com, dias)).toEqual([]);
  });
  it("contato que ganhou campanha depois muda só o dia dele (Novos ADS +1)", () => {
    const antes = calcular();
    contatos[4].utm_campaign = "Campanha nova";
    const depois = calcular();
    contatos[4].utm_campaign = null;
    expect(diasDiferentes(antes.map((l) => ({ ...l, data: l.dia })), depois, dias)).toEqual([dias[1]]);
    expect(porDia(depois)[dias[1]].novos_contatos_ads).toBe(porDia(antes)[dias[1]].novos_contatos_ads + 1);
  });
});
