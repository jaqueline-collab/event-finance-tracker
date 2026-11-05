import { describe, expect, it } from "vitest";
import {
  agregarPainel,
  conversasPorDia,
  diaSP,
  formatarDuracao,
  origemDoLead,
  periodoAnterior,
  periodoDe,
  variacao,
} from "../painel-visual";

describe("painel visual", () => {
  it("dia em São Paulo: 02:00 UTC ainda é o dia anterior", () => {
    expect(diaSP("2026-10-02T02:00:00Z")).toBe("2026-10-01");
    expect(diaSP("2026-10-02T03:00:00Z")).toBe("2026-10-02");
  });

  it("padrão de 30 dias termina hoje e o anterior tem o mesmo tamanho", () => {
    const p = periodoDe("30d", "2026-11-05T01:00:00Z");
    expect(p).toEqual({ de: "2026-10-06", ate: "2026-11-04" });
    expect(periodoAnterior(p)).toEqual({ de: "2026-09-06", ate: "2026-10-05" });
  });

  it("mês passado em janeiro volta para dezembro", () => {
    expect(periodoDe("mes_passado", "2027-01-15T15:00:00Z")).toEqual({ de: "2026-12-01", ate: "2026-12-31" });
  });

  it("formata TMR/TMA como 1h 20min", () => {
    expect(formatarDuracao(4800)).toBe("1h 20min");
    expect(formatarDuracao(90)).toBe("1min 30s");
    expect(formatarDuracao(null)).toBe("—");
  });

  it("variação sem base anterior é nula", () => {
    expect(variacao(10, 0)).toBeNull();
    expect(variacao(110, 100)).toBeCloseTo(10);
  });

  it("conversa realizada ignora NOTE, TRANSITION e TRACK; DEFAULT = usuário", () => {
    const r = conversasPorDia([
      { sessao_id: "s1", enviada_em: "2026-09-22T15:00:00Z", tipo: "TRACK", origem: "DEFAULT" },
      { sessao_id: "s1", enviada_em: "2026-09-22T15:01:00Z", tipo: "TEXT", origem: "BOT" },
      { sessao_id: "s2", enviada_em: "2026-09-22T16:00:00Z", tipo: "TEXT", origem: "DEFAULT" },
      { sessao_id: "s3", enviada_em: "2026-09-22T16:00:00Z", tipo: "NOTE", origem: "DEFAULT" },
    ]);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.sessao === "s1")?.usuario).toBe(false);
    expect(r.find((x) => x.sessao === "s2")?.usuario).toBe(true);
  });

  it("origem usa a UTM e cai para a origem do contato", () => {
    expect(origemDoLead("INSTAGRAM", "IMPORTED")).toBe("Instagram");
    expect(origemDoLead(null, "IMPORTED")).toBe("Importado");
  });

  it("filtro de canal recalcula leads e conversas", () => {
    const base = {
      contatos: [
        { id: "c1", criado_em: "2026-10-10T15:00:00Z", origem: "Instagram", etiquetas: [], campanha: "black" },
        { id: "c2", criado_em: "2026-10-10T15:00:00Z", origem: "Importado", etiquetas: ["vip"], campanha: null },
      ],
      atendimentos: [
        { id: "s1", contato_id: "c1", canal: "WhatsApp", atendente: "Ana", criado_em: "2026-10-10T15:00:00Z", tmr: 60, tma: null },
        { id: "s2", contato_id: "c2", canal: "Instagram", atendente: "Bia", criado_em: "2026-10-10T15:00:00Z", tmr: 120, tma: 600 },
      ],
      mensagens: [
        { sessao_id: "s1", enviada_em: "2026-10-10T15:00:00Z", tipo: "TEXT", origem: "DEFAULT" },
        { sessao_id: "s2", enviada_em: "2026-10-10T15:00:00Z", tipo: "TEXT", origem: "BOT" },
      ],
    };
    const p = { de: "2026-10-01", ate: "2026-10-31" };
    const tudo = agregarPainel(base, p, {});
    expect(tudo.kpis.atual).toMatchObject({ novosLeads: 2, leadsAds: 1, conversas: 2 });
    expect(tudo.kpis.atual.tmr).toEqual({ valor: 90, medidas: 2 });
    const wa = agregarPainel(base, p, { canal: "WhatsApp" });
    expect(wa.kpis.atual).toMatchObject({ novosLeads: 1, conversas: 1 });
    expect(wa.porDia.find((d) => d.dia === "2026-10-10")).toMatchObject({ usuario: 1, bot: 0, ads: 1 });
    const vip = agregarPainel(base, p, { etiqueta: "vip" });
    expect(vip.kpis.atual).toMatchObject({ novosLeads: 1, conversas: 1 });
  });
});
