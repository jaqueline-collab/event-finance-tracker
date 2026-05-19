import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cliente, CustoBase, Movimento, Plano } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

interface State {
  custos: CustoBase[];
  planos: Plano[];
  clientes: Cliente[];
  movimentos: Movimento[];
  // custos
  addCusto: (c: Omit<CustoBase, "id">) => void;
  updateCusto: (id: string, c: Partial<CustoBase>) => void;
  removeCusto: (id: string) => void;
  // planos
  addPlano: (p: Omit<Plano, "id">) => void;
  updatePlano: (id: string, p: Partial<Plano>) => void;
  removePlano: (id: string) => void;
  // clientes
  addCliente: (c: Omit<Cliente, "id">) => string;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  removeCliente: (id: string) => void;
  // movimentos
  addMovimento: (m: Omit<Movimento, "id">) => void;
  removeMovimento: (id: string) => void;
  // reset
  resetAll: () => void;
  seedDemo: () => void;
}

const defaultCustos: CustoBase[] = [
  { id: uid(), nome: "Elora Base (ferramenta)", tipo: "ferramenta", custoUnitario: 0, precoCliente: 0, unidade: "fixo" },
  { id: uid(), nome: "App adicional", tipo: "app", custoUnitario: 5, precoCliente: 15, unidade: "por app" },
  { id: uid(), nome: "MAU adicional", tipo: "mau", custoUnitario: 0.1, precoCliente: 0.5, unidade: "por MAU" },
  { id: uid(), nome: "Transcrição IA por usuário", tipo: "extra", custoUnitario: 6.99, precoCliente: 6.99, unidade: "por usuário" },
];

const defaultPlanos: Plano[] = [
  { id: uid(), nome: "Starter", valorMensal: 297, valorSetup: 497, appsInclusos: 1, mauInclusos: 500 },
  { id: uid(), nome: "Growth", valorMensal: 597, valorSetup: 997, appsInclusos: 3, mauInclusos: 2000 },
  { id: uid(), nome: "Scale", valorMensal: 1197, valorSetup: 1997, appsInclusos: 6, mauInclusos: 10000 },
];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      custos: defaultCustos,
      planos: defaultPlanos,
      clientes: [],
      movimentos: [],
      addCusto: (c) => set({ custos: [...get().custos, { ...c, id: uid() }] }),
      updateCusto: (id, c) =>
        set({ custos: get().custos.map((x) => (x.id === id ? { ...x, ...c } : x)) }),
      removeCusto: (id) => set({ custos: get().custos.filter((x) => x.id !== id) }),
      addPlano: (p) => set({ planos: [...get().planos, { ...p, id: uid() }] }),
      updatePlano: (id, p) =>
        set({ planos: get().planos.map((x) => (x.id === id ? { ...x, ...p } : x)) }),
      removePlano: (id) => set({ planos: get().planos.filter((x) => x.id !== id) }),
      addCliente: (c) => {
        const id = uid();
        set({ clientes: [...get().clientes, { ...c, id }] });
        set({
          movimentos: [
            ...get().movimentos,
            {
              id: uid(),
              clienteId: id,
              data: c.dataInicio,
              tipo: "setup",
              planoId: c.planoId,
              apps: c.apps,
              mau: c.mau,
              extras: c.extras,
            },
          ],
        });
        return id;
      },
      updateCliente: (id, c) =>
        set({ clientes: get().clientes.map((x) => (x.id === id ? { ...x, ...c } : x)) }),
      removeCliente: (id) =>
        set({
          clientes: get().clientes.filter((x) => x.id !== id),
          movimentos: get().movimentos.filter((m) => m.clienteId !== id),
        }),
      addMovimento: (m) => {
        const mov = { ...m, id: uid() };
        set({ movimentos: [...get().movimentos, mov] });
        // aplicar efeito no cliente
        const cliente = get().clientes.find((c) => c.id === m.clienteId);
        if (cliente) {
          const patch: Partial<Cliente> = {};
          if (m.tipo === "churn") patch.dataChurn = m.data;
          if (m.tipo === "ativacao") patch.dataChurn = null;
          if (m.planoId !== undefined && m.planoId !== null) patch.planoId = m.planoId;
          if (m.apps !== undefined) patch.apps = m.apps;
          if (m.mau !== undefined) patch.mau = m.mau;
          if (m.canais !== undefined) patch.canais = m.canais;
          if (m.usuariosAtivos !== undefined) patch.usuariosAtivos = m.usuariosAtivos;
          if (m.contatosAtivos !== undefined) patch.contatosAtivos = m.contatosAtivos;
          if (m.agentesIA !== undefined) patch.agentesIA = m.agentesIA;
          if (m.asaas !== undefined) patch.asaas = m.asaas;
          if (m.zapi !== undefined) patch.zapi = m.zapi;
          if (m.transcricaoIA !== undefined) patch.transcricaoIA = m.transcricaoIA;
          if (m.extras !== undefined) patch.extras = m.extras;
          if (Object.keys(patch).length) {
            set({
              clientes: get().clientes.map((c) =>
                c.id === m.clienteId ? { ...c, ...patch } : c,
              ),
            });
          }
        }
      },
      removeMovimento: (id) =>
        set({ movimentos: get().movimentos.filter((m) => m.id !== id) }),
      resetAll: () =>
        set({ custos: defaultCustos, planos: defaultPlanos, clientes: [], movimentos: [] }),
      seedDemo: () => {
        const planos = get().planos;
        const p = planos[1] ?? planos[0];
        if (!p) return;
        const today = new Date();
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const id = uid();
        set({
          clientes: [
            ...get().clientes,
            {
              id,
              nome: "Clínica Demo",
              planoId: p.id,
              dataInicio: sixMonthsAgo.toISOString().slice(0, 10),
              dataChurn: null,
              apps: 2,
              mau: 1500,
              canais: 1,
              usuariosAtivos: 3,
              contatosAtivos: 1500,
              agentesIA: false,
              asaas: false,
              zapi: false,
              transcricaoIA: false,
              extras: {},
            },
          ],
          movimentos: [
            ...get().movimentos,
            {
              id: uid(),
              clienteId: id,
              data: sixMonthsAgo.toISOString().slice(0, 10),
              tipo: "setup",
              planoId: p.id,
              apps: 2,
              mau: 1500,
            },
          ],
        });
      },
    }),
    { name: "elora-control-v1" },
  ),
);

// ===== Helpers de cálculo =====

export function receitaMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;
  let total = plano.valorMensal;
  // apps excedentes
  const appsExc = Math.max(0, cliente.apps - plano.appsInclusos);
  const appCusto = custos.find((c) => c.tipo === "app");
  if (appCusto) total += appsExc * appCusto.precoCliente;
  // mau excedente
  const mauExc = Math.max(0, cliente.mau - plano.mauInclusos);
  const mauCusto = custos.find((c) => c.tipo === "mau");
  if (mauCusto) total += mauExc * mauCusto.precoCliente;
  // extras
  for (const [custoId, qtd] of Object.entries(cliente.extras || {})) {
    const c = custos.find((x) => x.id === custoId);
    if (c) total += c.precoCliente * qtd;
  }
  return total;
}

export function custoMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;
  let total = 0;
  // custo fixo da ferramenta proporcional? usamos custo base fixo total dividido depois. aqui: 0.
  const appCusto = custos.find((c) => c.tipo === "app");
  if (appCusto) total += cliente.apps * appCusto.custoUnitario;
  const mauCusto = custos.find((c) => c.tipo === "mau");
  if (mauCusto) total += cliente.mau * mauCusto.custoUnitario;
  for (const [custoId, qtd] of Object.entries(cliente.extras || {})) {
    const c = custos.find((x) => x.id === custoId);
    if (c) total += c.custoUnitario * qtd;
  }
  return total;
}

export function clienteAtivoEm(cliente: Cliente, year: number, month: number): boolean {
  const fimMes = new Date(year, month + 1, 0);
  const inicioMes = new Date(year, month, 1);
  const inicio = new Date(cliente.dataInicio);
  if (inicio > fimMes) return false;
  if (cliente.dataChurn) {
    const churn = new Date(cliente.dataChurn);
    if (churn < inicioMes) return false;
  }
  return true;
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ===== Lógica de Custos Helena (White Label) =====

export function calcularCustoBrutoHelena(clientesAtivos: Cliente[]): number {
  if (clientesAtivos.length === 0) return 0;

  // 1. CONTA BASE (149,90 por conta ativa)
  const custoBase = clientesAtivos.length * 149.90;

  // Totalizadores globais
  let canaisTotais = 0;
  let usuariosTotais = 0;
  let contatosTotais = 0;
  
  let custoOpcionais = 0;

  for (const c of clientesAtivos) {
    canaisTotais += (c.canais || 0);
    usuariosTotais += (c.usuariosAtivos || 0);
    contatosTotais += (c.contatosAtivos || 0);

    // 6. OPCIONAIS E APPS
    if (c.agentesIA) custoOpcionais += 50.00;
    if (c.asaas) custoOpcionais += 49.50;
    if (c.zapi) custoOpcionais += 69.00;
    if (c.transcricaoIA) custoOpcionais += (c.usuariosAtivos || 0) * 3.99;
  }

  // 2. CANAIS ADICIONAIS
  let custoCanais = 0;
  if (canaisTotais >= 2 && canaisTotais <= 5) {
    custoCanais = (canaisTotais - 1) * 29.90;
  } else if (canaisTotais > 5) {
    custoCanais = 119.60 + ((canaisTotais - 5) * 19.90);
  }

  // 3. USUÁRIOS ADICIONAIS
  let custoUsuarios = 0;
  if (usuariosTotais >= 4 && usuariosTotais <= 20) {
    custoUsuarios = (usuariosTotais - 3) * 19.90;
  } else if (usuariosTotais >= 21 && usuariosTotais <= 100) {
    custoUsuarios = 338.30 + ((usuariosTotais - 20) * 14.90);
  } else if (usuariosTotais > 100) {
    custoUsuarios = 1530.30 + ((usuariosTotais - 100) * 12.90);
  }

  // 4. INFRAESTRUTURA / CONTATOS ATIVOS
  let custoInfra = 0;
  if (contatosTotais >= 5001 && contatosTotais <= 20000) {
    custoInfra = (contatosTotais - 5000) * 0.045;
  } else if (contatosTotais >= 20001 && contatosTotais <= 100000) {
    custoInfra = 675.00 + ((contatosTotais - 20000) * 0.035);
  } else if (contatosTotais > 100000) {
    custoInfra = 3475.00 + ((contatosTotais - 100000) * 0.025);
  }

  return custoBase + custoCanais + custoUsuarios + custoInfra + custoOpcionais;
}

export function calcularDescontoEscalaHelena(custoBruto: number): number {
  let desconto = 0;
  
  if (custoBruto > 10000) {
    const faixa1 = Math.min(custoBruto, 25000) - 10000;
    desconto += faixa1 * 0.10;
  }
  
  if (custoBruto > 25000) {
    const faixa2 = Math.min(custoBruto, 50000) - 25000;
    desconto += faixa2 * 0.15;
  }
  
  if (custoBruto > 50000) {
    const faixa3 = Math.min(custoBruto, 100000) - 50000;
    desconto += faixa3 * 0.20;
  }
  
  if (custoBruto > 100000) {
    const faixa4 = custoBruto - 100000;
    desconto += faixa4 * 0.25;
  }

  return desconto;
}

export function calcularCustoLiquidoHelena(clientesAtivos: Cliente[]): number {
  const bruto = calcularCustoBrutoHelena(clientesAtivos);
  const desconto = calcularDescontoEscalaHelena(bruto);
  return bruto - desconto;
}

export function receitaMensalTotal(clientesAtivos: Cliente[], planos: Plano[], custos: CustoBase[]): number {
  return clientesAtivos.reduce((acc, c) => acc + receitaMensalCliente(c, planos, custos), 0);
}