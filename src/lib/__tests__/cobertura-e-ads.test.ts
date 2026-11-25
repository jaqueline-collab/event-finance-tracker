import { describe, expect, it } from "vitest";
import { alternarColunasAds, chavesColunasPatrocinadas, ehColunaAds, type EstadoColunas } from "../colunas-tabela";
import { ATRASO_SYNC_MS, atualizarIntervaloCobertura, estadoCobertura, type Cobertura } from "../sync-cobertura";
import { conciliarPainelExclusao, decidirExclusao } from "../conferencia";

describe("botão ADS por configuração de Origem", () => {
  const origem = { campo: "campo.origem-do-lead", patrocinados: ["Meta ADS", "Google ADS", "Instagram"] };
  const configs = [
    { chave: "novos_contatos", condicoes: [] },
    { chave: "contatos_origem_meta_ads", condicoes: { op: "E", itens: [{ campo: { campo: "campo.origem-do-lead", fonte: "contato" }, operador: "igual", valor: "Meta ADS" }] } },
    { chave: "contatos_origem_google_ads", condicoes: { op: "E", itens: [{ campo: { campo: "campo.origem-do-lead", fonte: "contato" }, operador: "igual", valor: "Google ADS" }] } },
    { chave: "contatos_origem_instagram", condicoes: { op: "E", itens: [{ campo: { campo: "campo.origem-do-lead", fonte: "contato" }, operador: "igual", valor: "Instagram" }] } },
    { chave: "contatos_origem_organico", condicoes: { op: "E", itens: [{ campo: { campo: "campo.origem-do-lead", fonte: "contato" }, operador: "igual", valor: "Orgânico" }] } },
    { chave: "contatos_origem_patrocinado", condicoes: { op: "E", itens: [{ campo: { campo: "campo.origem-do-lead", fonte: "contato" }, operador: "em", lista: "origem_patrocinado" }] } },
  ];

  it("identifica Meta ADS, Google ADS e Instagram pela configuração e mantém Patrocinado fora do toggle", () => {
    const chaves = chavesColunasPatrocinadas(configs, origem);
    expect(chaves).toEqual(["contatos_origem_meta_ads", "contatos_origem_google_ads", "contatos_origem_instagram"]);
    expect(ehColunaAds("contatos_origem_instagram", chaves)).toBe(true);
    expect(ehColunaAds("contatos_origem_patrocinado", chaves)).toBe(false);
    expect(ehColunaAds("contatos_origem_organico", chaves)).toBe(false);

    const ini: EstadoColunas = { ordem: configs.map((c) => c.chave), ocultas: [], fixas: [] };
    const semAds = alternarColunasAds(ini, configs.map((c) => c.chave), false, chaves);
    expect(semAds.ocultas).toEqual(["contatos_origem_meta_ads", "contatos_origem_google_ads", "contatos_origem_instagram"]);
  });

  it("sem configuração de Origem mantém o comportamento padrão pelo sufixo", () => {
    expect(ehColunaAds("novos_contatos_ads", [])).toBe(true);
    expect(ehColunaAds("contatos_origem_instagram", [])).toBe(false);
  });
});

describe("estadoCobertura e intervalo de cobertura", () => {
  const agoraMs = Date.parse("2026-11-25T22:00:00Z"); // 19:00 Brasília -> hoje = 2026-11-25
  const ok = (fonte: string, extra: Partial<Cobertura> = {}): Cobertura => ({
    fonte,
    concluido_em: "2026-11-25T21:00:00Z",
    cobertura: [{ de: "2026-10-01", ate: "2026-11-25" }],
    ultima_execucao_situacao: "concluida",
    ...extra,
  });
  const fontes = ["contatos", "atendimentos", "mensagens"];

  it("confirma dia passado coberto com fontes em dia e sem diferença", () => {
    expect(estadoCobertura("2026-11-14", fontes, fontes.map((f) => ok(f)), { agoraMs })).toBe("confirmado");
  });

  it("mantém o dia de hoje sempre parcial", () => {
    expect(estadoCobertura("2026-11-25", fontes, fontes.map((f) => ok(f)), { agoraMs })).toBe("parcial");
  });

  it("mantém parcial dia anterior ao início do histórico", () => {
    expect(estadoCobertura("2026-09-15", fontes, fontes.map((f) => ok(f)), { agoraMs })).toBe("parcial");
  });

  it("dispara aviso se fonte está atrasada (> 6h) ou com erro", () => {
    const atrasada = new Date(agoraMs - ATRASO_SYNC_MS - 60_000).toISOString();
    expect(estadoCobertura("2026-11-14", fontes, [ok("contatos", { concluido_em: atrasada }), ok("atendimentos"), ok("mensagens")], { agoraMs })).toBe("parcial");
    expect(estadoCobertura("2026-11-14", fontes, [ok("contatos", { ultima_execucao_situacao: "erro" }), ok("atendimentos"), ok("mensagens")], { agoraMs })).toBe("parcial");
  });

  it("dispara aviso em dia apontado com diferença na conferência", () => {
    expect(estadoCobertura("2026-11-14", fontes, fontes.map((f) => ok(f)), { agoraMs, diasComDiferenca: ["2026-11-14"] })).toBe("parcial");
    expect(estadoCobertura("2026-11-15", fontes, fontes.map((f) => ok(f)), { agoraMs, diasComDiferenca: ["2026-11-14"] })).toBe("confirmado");
  });

  it("estende intervalo de cobertura sem perder o início", () => {
    const first = atualizarIntervaloCobertura([], "2026-10-01", "2026-11-24");
    expect(first).toEqual([{ de: "2026-10-01", ate: "2026-11-24" }]);
    expect(atualizarIntervaloCobertura(first, "2026-11-25", "2026-11-25")).toEqual([{ de: "2026-10-01", ate: "2026-11-25" }]);
  });
});

describe("conciliação de exclusões por painel e travas", () => {
  it("separa faltantes e reativações por painel sem carregar os demais", () => {
    const r = conciliarPainelExclusao(
      ["c1", "c3"],
      [
        { externo_id: "c1", excluido_em: null },
        { externo_id: "c2", excluido_em: null },
        { externo_id: "c3", excluido_em: "2026-11-20T00:00:00Z" },
      ],
    );
    expect(r.pendentes).toEqual(["c2"]);
    expect(r.reativar).toEqual(["c3"]);
  });

  it("mantém travas: nunca marca em rodada incompleta nem acima do limite", () => {
    expect(decidirExclusao(["c1"], 100, false).marcar).toEqual([]);
    expect(decidirExclusao(["c1", "c2", "c3"], 100, true).bloqueado).toBe(true);
  });
});