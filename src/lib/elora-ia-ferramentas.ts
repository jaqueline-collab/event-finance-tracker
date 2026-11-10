/**
 * Ferramentas de leitura da Elora. Recebem o acesso já validado pelo servidor
 * e dependências de leitura injetadas (testáveis sem banco).
 * Nenhuma ferramenta escreve nada nem lê texto de mensagens.
 */
import { tool } from "ai";
import { z } from "zod";
import {
  buscarNoGuia,
  colunasPermitidas,
  embrulharDado,
  resolverCliente,
  totaisPorDimensao,
  type AcessoEloraIa,
  type PaginaGuia,
} from "./elora-ia";

export type CelulaIa = { valor: number | null; estimado: boolean };
export type MatrizIa = {
  colunas: { chave: string; nome: string; formato: string }[];
  linhas: { dia: string; celulas: Record<string, CelulaIa> }[];
  total: Record<string, CelulaIa>;
};
export type LinhaDimensaoIa = { dia: string; canal: string; atendente: string; equipe: string } & Record<string, unknown>;

export type DepsFerramentas = {
  matriz: (clienteId: string, p: { de: string; ate: string }) => Promise<MatrizIa>;
  linhasDimensao: (clienteId: string, p: { de: string; ate: string }) => Promise<LinhaDimensaoIa[]>;
  guia: () => Promise<PaginaGuia[]>;
  guiaUrl: string;
};

export const COLUNAS_DIMENSAO = [
  { chave: "novos_contatos", nome: "Novos contatos" },
  { chave: "novos_contatos_ads", nome: "Novos ADS" },
  { chave: "conversas_total_dia", nome: "Conversas realizadas" },
  { chave: "conversas_usuario", nome: "Usuário do sistema" },
  { chave: "conversas_bot", nome: "Bot" },
];

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data AAAA-MM-DD");
const cliente = z.string().max(200).nullable().describe("Nome ou id do cliente; null quando só há um cliente liberado");
const MAX_DIAS = 400;

function periodoValido(de: string, ate: string) {
  if (de > ate) throw new Error("periodo-invalido: a data inicial é depois da final.");
  const dias = (Date.parse(ate) - Date.parse(de)) / 86400_000 + 1;
  if (dias > MAX_DIAS) throw new Error(`periodo-invalido: no máximo ${MAX_DIAS} dias.`);
  return { de, ate };
}
const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

function resumoTotal(m: MatrizIa, veValores: boolean) {
  const cols = colunasPermitidas(m.colunas, veValores);
  return cols.map((c) => ({
    indicador: c.nome,
    formato: c.formato,
    valor: m.total[c.chave]?.valor ?? null,
    estimado: Boolean(m.total[c.chave]?.estimado),
  }));
}

export function criarFerramentasElora(acesso: AcessoEloraIa, deps: DepsFerramentas, registrar: (clienteId: string) => void = () => {}) {
  const alvo = (pedido: string | null | undefined) => {
    const c = resolverCliente(acesso, pedido);
    registrar(c.id);
    return c;
  };
  const seguro = async (fonte: string, fn: () => Promise<unknown>) => {
    try {
      return embrulharDado(fonte, await fn());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return embrulharDado("erro", { erro: msg.replace(/^[a-z-]+:\s*/, "") });
    }
  };

  return {
    listar_clientes: tool({
      description: "Lista os clientes que podem ser consultados nesta conversa.",
      inputSchema: z.object({}),
      execute: async () => embrulharDado("clientes liberados", acesso.clientes.map((c) => ({ nome: c.nome }))),
    }),
    buscar_no_guia: tool({
      description: "Busca trechos do guia oficial da ferramenta para responder dúvidas de uso.",
      inputSchema: z.object({ pergunta: z.string().min(2).max(500) }),
      execute: async ({ pergunta }) =>
        seguro("guia", async () => {
          const achados = buscarNoGuia(await deps.guia(), pergunta);
          return { link_do_guia: deps.guiaUrl, encontrado: achados.length > 0, trechos: achados };
        }),
    }),
    indicadores_periodo: tool({
      description: "Totais dos indicadores (colunas da Matriz) de um cliente em um período.",
      inputSchema: z.object({ cliente, de: dia, ate: dia }),
      execute: async (i) =>
        seguro("Matriz", async () => {
          const c = alvo(i.cliente);
          const p = periodoValido(i.de, i.ate);
          const m = await deps.matriz(c.id, p);
          return { cliente: c.nome, fonte: `Matriz, ${br(p.de)} a ${br(p.ate)}`, indicadores: resumoTotal(m, acesso.veValores) };
        }),
    }),
    comparar_periodos: tool({
      description: "Compara os indicadores da Matriz de um cliente entre dois períodos (A = atual, B = anterior).",
      inputSchema: z.object({ cliente, a_de: dia, a_ate: dia, b_de: dia, b_ate: dia }),
      execute: async (i) =>
        seguro("Matriz", async () => {
          const c = alvo(i.cliente);
          const pa = periodoValido(i.a_de, i.a_ate);
          const pb = periodoValido(i.b_de, i.b_ate);
          const [ma, mb] = await Promise.all([deps.matriz(c.id, pa), deps.matriz(c.id, pb)]);
          const ta = resumoTotal(ma, acesso.veValores);
          const tb = new Map(resumoTotal(mb, acesso.veValores).map((x) => [x.indicador, x]));
          return {
            cliente: c.nome,
            fonte_a: `Matriz, ${br(pa.de)} a ${br(pa.ate)}`,
            fonte_b: `Matriz, ${br(pb.de)} a ${br(pb.ate)}`,
            comparacao: ta.map((x) => {
              const b = tb.get(x.indicador);
              const va = x.valor ?? 0;
              const vb = b?.valor ?? 0;
              return {
                indicador: x.indicador,
                periodo_a: x.valor,
                periodo_b: b?.valor ?? null,
                diferenca: va - vb,
                variacao_percentual: vb ? Math.round(((va - vb) / vb) * 1000) / 10 : null,
                estimado: x.estimado || Boolean(b?.estimado),
              };
            }),
          };
        }),
    }),
    totais_por_dimensao: tool({
      description: "Totais de novos contatos, novos ADS e conversas (realizadas, usuário, bot) separados por canal, atendente ou equipe.",
      inputSchema: z.object({ cliente, de: dia, ate: dia, dimensao: z.enum(["canal", "atendente", "equipe"]) }),
      execute: async (i) =>
        seguro("Relatório diário", async () => {
          const c = alvo(i.cliente);
          const p = periodoValido(i.de, i.ate);
          const linhas = await deps.linhasDimensao(c.id, p);
          const chaves = COLUNAS_DIMENSAO.map((x) => x.chave);
          const tot = totaisPorDimensao(linhas, i.dimensao, chaves).map((r) =>
            Object.fromEntries(Object.entries(r).map(([k, v]) => [COLUNAS_DIMENSAO.find((x) => x.chave === k)?.nome ?? k, v])),
          );
          return { cliente: c.nome, fonte: `Relatório diário, ${br(p.de)} a ${br(p.ate)}`, por: i.dimensao, linhas: tot };
        }),
    }),
    matriz_por_dia: tool({
      description: "Valores da Matriz dia a dia (até 62 dias), com marca de dia estimado.",
      inputSchema: z.object({ cliente, de: dia, ate: dia }),
      execute: async (i) =>
        seguro("Matriz", async () => {
          const c = alvo(i.cliente);
          const p = periodoValido(i.de, i.ate);
          if ((Date.parse(p.ate) - Date.parse(p.de)) / 86400_000 + 1 > 62) throw new Error("periodo-invalido: até 62 dias por vez.");
          const m = await deps.matriz(c.id, p);
          const cols = colunasPermitidas(m.colunas, acesso.veValores);
          return {
            cliente: c.nome,
            fonte: `Matriz, ${br(p.de)} a ${br(p.ate)}`,
            colunas: cols.map((x) => x.nome),
            dias: m.linhas.map((l) => ({
              dia: br(l.dia),
              ...Object.fromEntries(cols.map((x) => [x.nome, l.celulas[x.chave]?.valor ?? null])),
              estimado: cols.some((x) => l.celulas[x.chave]?.estimado),
            })),
          };
        }),
    }),
  };
}
