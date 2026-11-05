import { describe, expect, it } from "vitest";
import { agregarPainel, limitesUtc, periodoAnterior, type ContatoP } from "../painel-visual";
import { diffVisoes, visoesVisiveis } from "../dashboard-visoes";

const ct = (id: string, dia: string, extra: Partial<ContatoP> = {}): ContatoP => ({
  id, criado_em: `${dia}T15:00:00Z`, origem: "Chegou pelo WhatsApp", etiquetas: [], campanha: null, ...extra,
});
const base = {
  contatos: [
    ct("1", "2026-10-30"),
    ct("2", "2026-10-30", { campanha: "Promo" }),
    ct("3", "2026-10-30", { origem: "Importado", importado: true }),
    ct("4", "2026-10-31", { origem: "Importado", importado: true }),
  ],
  atendimentos: [],
  mensagens: [],
};
const p = { de: "2026-10-29", ate: "2026-11-04" };

describe("ajustes da Fase 1", () => {
  it("Novos leads não conta importados por padrão e informa quantos ficaram fora", () => {
    const r = agregarPainel(base, p, {});
    expect(r.kpis.atual.novosLeads).toBe(2);
    expect(r.kpis.atual.importadosFora).toBe(2);
    expect(r.kpis.atual.leadsAds).toBe(1);
    expect(r.porDia.find((d) => d.dia === "2026-10-31")?.leads).toBe(0);
    expect(r.leadsPor.origem.map((o) => o.nome)).not.toContain("Importado");
    expect(r.opcoes.origem).toContain("Importado");
  });

  it("filtro Origem = Importado mostra os importados", () => {
    const r = agregarPainel(base, p, { origem: "Importado" });
    expect(r.kpis.atual.novosLeads).toBe(2);
    expect(r.kpis.atual.importadosFora).toBe(0);
  });

  it("29/10 a 04/11 vai de 00:00 de 29/10 a 23:59:59 de 04/11 (São Paulo); anterior 22/10 a 28/10", () => {
    expect(limitesUtc(p)).toEqual({ inicio: "2026-10-29T03:00:00.000Z", fim: "2026-11-05T02:59:59.999Z" });
    expect(periodoAnterior(p)).toEqual({ de: "2026-10-22", ate: "2026-10-28" });
    const r = agregarPainel({ ...base, contatos: [ct("9", "2026-11-04", { criado_em: "2026-11-05T02:30:00Z" })] }, p, {});
    expect(r.kpis.atual.novosLeads).toBe(1);
  });

  it("visão rascunho (Widgets antigos) não aparece ao cliente", () => {
    const vs = [
      { id: "a", nome: "Resultados", ordem: 0, publicada: true },
      { id: "b", nome: "Widgets antigos", ordem: 1, publicada: false },
    ];
    expect(visoesVisiveis(vs, false).map((v) => v.id)).toEqual(["a"]);
  });

  it("ocultar um cartão conta como alteração a salvar", () => {
    const salvas = [{ id: "a", nome: "R", ordem: 0, publicada: true, ocultos: [] }];
    expect(diffVisoes(salvas, [{ ...salvas[0], ocultos: ["canais"] }]).atualizar).toHaveLength(1);
    expect(diffVisoes(salvas, [{ ...salvas[0] }]).atualizar).toHaveLength(0);
  });
});
