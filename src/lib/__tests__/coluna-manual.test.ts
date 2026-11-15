import { describe, expect, it } from "vitest";
import { diaPermitido, lerNumeroManual, podePreencher } from "../coluna-manual";
import { montarMatriz } from "../matriz";

describe("coluna manual", () => {
  it("cliente preenche quando a coluna é do cliente", () => expect(podePreencher("cliente", { superAdmin: false, cliente: true, parceiro: false })).toBe(true));
  it("cliente não preenche coluna só da super admin", () => expect(podePreencher("super_admin", { superAdmin: false, cliente: true, parceiro: false })).toBe(false));
  it("parceiro não preenche coluna do cliente", () => expect(podePreencher("cliente", { superAdmin: false, cliente: false, parceiro: true })).toBe(false));
  it("dia futuro bloqueado por padrão", () => expect(diaPermitido("2026-11-16", "2026-11-15", false)).toBe(false));
  it("hoje é permitido", () => expect(diaPermitido("2026-11-15", "2026-11-15", false)).toBe(true));
  it("inteiro rejeita decimal", () => expect(lerNumeroManual("2,5", "inteiro").ok).toBe(false));
  it("texto é rejeitado", () => expect(lerNumeroManual("abc", "decimal").ok).toBe(false));
  it("vazio é vazio, não zero", () => expect(lerNumeroManual("", "inteiro")).toEqual({ ok: true, valor: null }));
  it("zero digitado é zero", () => expect(lerNumeroManual("0", "inteiro")).toEqual({ ok: true, valor: 0 }));
  it("moeda aceita vírgula", () => expect(lerNumeroManual("R$ 1.234,50", "moeda")).toEqual({ ok: true, valor: 1234.5 }));
  it("total soma só os dias preenchidos e fica vazio se nenhum", () => {
    const col = [{ chave: "ss", nome: "SS", tipo: "manual", formato: "numero", ativo: true } as any];
    const m = montarMatriz(col, ["2026-11-01", "2026-11-02"], new Map(), new Map([["2026-11-01", { ss: 3 }]]));
    expect(m.total.ss.valor).toBe(3);
    expect(m.linhas[1].celulas.ss.valor).toBeNull();
    expect(montarMatriz(col, ["2026-11-02"], new Map(), new Map()).total.ss.valor).toBeNull();
  });
});
import { alinhamento, colunaNumerica } from "../colunas-tabela";
describe("alinhamento", () => {
  it("números centralizados e tabulares", () => expect(alinhamento(true)).toBe("text-center tabular-nums"));
  it("texto à esquerda", () => expect(alinhamento(false)).toBe("text-left"));
  it("moeda e milhar são número", () => expect(colunaNumerica(["R$ 1.234,50", "12", ""])).toBe(true));
  it("nome é texto", () => expect(colunaNumerica(["Maria", "12"])).toBe(false));
});

import { redimensionar as redim, tamanhoDe as tam, LARGURAS_RAPIDAS as LR } from "../layout-blocos";
describe("tamanho dos blocos", () => {
  it("tabela do Relatório diário aceita largura inteira e guarda", () => {
    const c = redim({ id: "__tabela_matriz", tipo: "numero" } as any, 12, 8);
    expect(tam(c).largura).toBe(12);
  });
  it("larguras rápidas: metade 6, dois terços 8, inteira 12", () => {
    expect(LR.map((x) => x.largura)).toEqual([6, 8, 12]);
  });
});
