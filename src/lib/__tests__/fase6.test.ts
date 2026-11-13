import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { agregarPainel } from "../painel-visual";
import { agregarCalendario, CARTOES_KPI, cartaoDoPainel, cartaoSchema, diasAguardando, itensDoDia, tiposDisponiveis } from "../graficos";
import { desfazer, empurrar, historico, layoutPadrao, redimensionar, refazer, reordenar, tamanhoDe } from "../layout-blocos";
import { nomesAmbiguos, propostaSchema, TABELAS_PERMITIDAS, validarProposta } from "../assistente-config";
import { criarFerramentasAdmin, NOMES_FERRAMENTAS_ADMIN } from "../assistente-config-ferramentas";
import { criarFerramentasElora } from "../elora-ia-ferramentas";

const ler = (f: string) => readFileSync(f, "utf8");
const p = { de: "2026-10-01", ate: "2026-10-02" };
const basePainel = {
  contatos: [
    { id: "a", criado_em: "2026-10-01T15:00:00Z", origem: "A", etiquetas: [], campanha: "C" },
    { id: "b", criado_em: "2026-10-02T15:00:00Z", origem: "B", etiquetas: [], campanha: null },
    { id: "i", criado_em: "2026-10-01T15:00:00Z", origem: "Importado", etiquetas: [], campanha: null, importado: true },
  ],
  atendimentos: [{ id: "s", contato_id: "a", criado_em: "2026-10-01T15:00:00Z", canal: "Canal", atendente: "Pessoa", tmr: 30, tma: 60 }],
  mensagens: [{ sessao_id: "s", enviada_em: "2026-10-01T15:00:00Z", tipo: "TEXT", origem: "DEFAULT" }],
};
const cartao = (x: Record<string, unknown>) => cartaoSchema.parse({ id: "x", titulo: "X", tipo: "barras", fonte: "contato", ...x });

describe("Fase 6: indicadores do cabeçalho como blocos", () => {
  it("dão os mesmos números do cabeçalho (mesma regra)", () => {
    for (const f of [{}, { canal: ["Canal"] }]) {
      const r = agregarPainel(basePainel as any, p, f as any);
      const [leads, conv, tmr, ads] = CARTOES_KPI.map((c) => cartaoDoPainel(r, c));
      expect(leads.total).toBe(r.kpis.atual.novosLeads);
      expect(leads.anterior).toBe(r.kpis.anterior.novosLeads);
      expect(conv.total).toBe(r.kpis.atual.conversas);
      expect(ads.total).toBe(r.kpis.atual.leadsAds);
      expect(Number.isNaN(tmr.total) ? null : tmr.total).toBe(r.kpis.atual.tmr.valor);
    }
  });
});

describe("Fase 6: layout em grade de 12 colunas", () => {
  it("respeita mínimo e máximo por tipo", () => {
    const n = cartao({ tipo: "numero" });
    expect(tamanhoDe(redimensionar(n, 12, 9))).toEqual({ largura: 6, altura: 2 });
    expect(tamanhoDe(redimensionar(cartao({}), 1, 0))).toEqual({ largura: 3, altura: 2 });
    expect(tamanhoDe(redimensionar(cartao({}), 12, 4))).toEqual({ largura: 12, altura: 4 });
  });
  it("restaurar layout volta tamanhos padrão e ordem dos blocos padrão, sem remover nenhum", () => {
    const meu = cartao({ id: "meu", largura: 9 });
    const kpi = { ...CARTOES_KPI[0], largura: 6 };
    const r = layoutPadrao([meu, kpi]);
    expect(r.map((c) => c.id)).toEqual(["kpi-leads", "meu"]);
    expect(tamanhoDe(r[0]).largura).toBe(3);
    expect(r[1].largura).toBeUndefined();
  });
  it("reordena entre linhas e desfaz/refaz", () => {
    const l = [cartao({ id: "a" }), cartao({ id: "b" }), cartao({ id: "c" })];
    const n = reordenar(l, "c", "a");
    expect(n.map((c) => c.id)).toEqual(["c", "a", "b"]);
    let h = empurrar(historico(l), n);
    h = desfazer(h);
    expect(h.presente.map((c) => c.id)).toEqual(["a", "b", "c"]);
    h = refazer(h);
    expect(h.presente.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
  it("layout é gravado por visão e cliente, só pela super admin no servidor", () => {
    const fn = ler("src/lib/graficos.functions.ts");
    const salvar = fn.slice(fn.indexOf("export const salvarCartoesVisao"), fn.indexOf("export const moverCartaoVisao"));
    expect(salvar.indexOf("superAdmin")).toBeLessThan(salvar.indexOf("gravar("));
    const gravar = fn.slice(fn.indexOf("async function gravar"));
    expect(gravar).toContain('.eq("id", visaoId).eq("cliente_id", clienteId)');
  });
});

describe("Fase 6: Calendário", () => {
  const cat = (comData: boolean) => [{ fonte: "card", nome: "Card", campos: [{ campo: "campo.data", nome: "Data", rotulo: "Data", tipo: comData ? "data" : "texto", preenchidos: 3, oculto: false }] }] as any;
  it("sem campo de data o tipo não aparece", () => {
    expect(tiposDisponiveis(cat(false), { dimensao: null, medida: "contagem" })).not.toContain("calendario");
    expect(tiposDisponiveis(cat(true), { dimensao: null, medida: "contagem" })).toContain("calendario");
  });
  const base = {
    definicoes: [],
    contatos: [{ id: "k1", nome: "Ana", telefone: "+55 11 9", criado_em: "2026-09-01T12:00:00Z", cf: {} }],
    atendimentos: [{ id: "s1", contato_id: "k1", atendente: "Bia", criado_em: "2026-09-01T12:00:00Z" }],
    cards: [
      { id: "c1", contato_ids: ["k1"], valor: 500, criado_em: "2026-09-01T12:00:00Z", cf: { data: "2026-10-02" } },
      { id: "c2", contato_ids: [], valor: 300, criado_em: "2026-09-01T12:00:00Z", cf: { data: "2026-10-02" } },
    ],
  } as any;
  const cal = cartao({ tipo: "calendario", fonte: "card", dimensao: { fonte: "card", campo: "campo.data" }, medida: "soma", campoMedida: { fonte: "card", campo: "valor" } });
  it("agrupa pelo campo de data escolhido (não pela criação)", () => {
    const r = agregarCalendario(base, cal, { de: "2026-10-01", ate: "2026-10-31" });
    expect(r.categorias).toEqual([{ rotulo: "2026-10-02", valores: { Valor: 800 }, total: 800 }]);
  });
  it("dia sem sincronização é 'aguardando', estimado não vira aguardando, dia com valor também não", () => {
    const r = { categorias: [{ rotulo: "2026-10-02", valores: {}, total: 5 }], estimados: ["2026-10-03"] };
    expect(diasAguardando({ de: "2026-10-01", ate: "2026-10-04" }, r, () => "aguardando sincronização")).toEqual(["2026-10-01", "2026-10-04"]);
    expect(diasAguardando({ de: "2026-10-01", ate: "2026-10-04" }, r, () => "confirmado")).toEqual([]);
  });
  it("lista do dia traz nome, telefone, atendente e valor; parceiro sem valores não vê dinheiro", () => {
    const com = itensDoDia(base, cal, "2026-10-02", [], false);
    expect(com[0]).toMatchObject({ nome: "Ana", telefone: "+55 11 9", atendente: "Bia", valor: 500 });
    expect(com[1].nome).toBe("Não definido");
    expect(itensDoDia(base, cal, "2026-10-02", [], true).every((i) => i.valor === null)).toBe(true);
  });
  it("cliente sem cards nem classificação não dá erro", () => {
    const vazio = { definicoes: [], contatos: [], atendimentos: [], cards: [] } as any;
    expect(agregarCalendario(vazio, cal, p).total).toBe(0);
    expect(itensDoDia(vazio, cal, "2026-10-02", [], false)).toEqual([]);
  });
});

describe("Fase 6: seção antiga de listas retirada sem mudar números", () => {
  it("Matriz, gráficos e painel não leem as colunas antigas filtro_*", () => {
    for (const f of ["src/lib/matriz.server.ts", "src/lib/matriz.ts", "src/lib/graficos.ts", "src/lib/graficos.functions.ts", "src/lib/painel-visual.ts", "src/lib/painel-visual.server.ts", "src/lib/indicadores-motor.ts"]) {
      expect(ler(f)).not.toMatch(/filtro_(usuarios|etiquetas|campo_personalizado|etapas_funil|campanha)/);
    }
  });
  it("a tela e a gravação saíram; nenhuma escrita nessas colunas", () => {
    expect(ler("src/components/configurar-api-cliente.tsx")).not.toContain("Listas e filtros padrão da conta");
    expect(ler("src/lib/integracao-elora.functions.ts")).not.toContain("salvarFiltrosCliente");
  });
});

describe("Fase 6: assistente de configuração", () => {
  const proposta = { tipo: "ajuste_campo", clienteId: "cli1", fonte: "card", campo: "campo.x", rotulo: "X", oculto: false };
  it("recusa proposta de outro cliente e tipos fora da configuração", () => {
    expect(() => validarProposta(proposta, "cli2")).toThrow(/outro cliente/);
    expect(validarProposta(proposta, "cli1").tipo).toBe("ajuste_campo");
    for (const t of ["mensagem", "contato", "credencial", "financeiro", "elora_contatos_espelho"]) expect(propostaSchema.safeParse({ ...proposta, tipo: t }).success).toBe(false);
    expect([...TABELAS_PERMITIDAS].some((t) => /espelho|mensag|credenc|financ|fechamento/.test(t))).toBe(false);
  });
  it("ferramentas de proposta não gravam nada (sem Aplicar não há escrita)", async () => {
    let escritas = 0;
    const deps = { catalogo: async () => [], definicoes: async () => ({ etapas: [], campanhas: [], etiquetas: [], canais: [] }), visoes: async () => { return []; } };
    const t: any = criarFerramentasAdmin("cli1", new Proxy(deps, { get: (o: any, k) => (k in o ? o[k] : (escritas++, () => {})) }));
    const r = await t.propor_ajuste_campo.execute({ fonte: "card", campo: "campo.x", rotulo: "X", oculto: false, motivo: "m" }, {} as any);
    expect(r.proposta.clienteId).toBe("cli1");
    expect(r.aplicada).toBe(false);
    expect(escritas).toBe(0);
    const src = ler("src/lib/assistente-config-ferramentas.ts");
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
  it("proposta sempre fica presa ao cliente aberto, mesmo se o modelo pedir outro", async () => {
    const t: any = criarFerramentasAdmin("cli1", { catalogo: async () => [], definicoes: async () => ({ etapas: [], campanhas: [], etiquetas: [], canais: [] }), visoes: async () => [] });
    const r = await t.propor_ajuste_campo.execute({ fonte: "card", campo: "c", rotulo: null, oculto: true, motivo: "", clienteId: "outro" } as any, {} as any);
    expect(r.proposta.clienteId).toBe("cli1");
  });
  it("Elora do cliente e do parceiro não tem ferramenta de escrita nem de proposta", () => {
    const f = criarFerramentasElora({ usuarioId: "u", area: "cliente", clientes: [{ id: "c", nome: "C" }], veValores: true }, { matriz: async () => ({ colunas: [], linhas: [], total: {} }), linhasDimensao: async () => [], guia: async () => [], guiaUrl: "" });
    for (const n of NOMES_FERRAMENTAS_ADMIN) expect(Object.keys(f)).not.toContain(n);
    expect(Object.keys(f).some((k) => /propor|salvar|gravar|aplicar|editar/.test(k))).toBe(false);
  });
  it("modo administrador só existe no servidor depois de is_admin; Aplicar revalida super admin", () => {
    const chat = ler("src/lib/elora-ia-chat.server.ts");
    expect(chat.indexOf('rpc("is_admin")')).toBeGreaterThan(-1);
    expect(chat.indexOf('rpc("is_admin")')).toBeLessThan(chat.indexOf("adminClienteId = acesso.clientes[0].id"));
    expect(chat).toContain("if (o.adminClienteId)");
    const fn = ler("src/lib/assistente-config.functions.ts");
    for (const nome of ["aplicarProposta", "desfazerAcaoConfig", "listarAcoesConfig"]) {
      const b = fn.slice(fn.indexOf(`export const ${nome}`));
      expect(b.indexOf("exigirSuperAdmin(context.supabase)")).toBeLessThan(b.indexOf("supabaseAdmin"));
    }
  });
  it("pergunta antes quando o mesmo nome existe em duas fontes", () => {
    expect(nomesAmbiguos([{ fonte: "card", campos: [{ campo: "a", rotulo: "Data da consulta" }] }, { fonte: "contato", campos: [{ campo: "b", rotulo: "data da consulta" }] }])).toEqual([{ nome: "data da consulta", fontes: ["card", "contato"] }]);
  });
});
